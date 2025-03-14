from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import random
import logging
import os
import sqlite3
import uuid
from enum import Enum
from typing import Any, Awaitable, Callable, Optional, List, Tuple, Sequence
from pydantic import BaseModel
from datetime import datetime

import aiofiles
import yaml
from autogen_ext.models.openai import OpenAIChatCompletionClient, AzureOpenAIChatCompletionClient
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination, TimeoutTermination
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_ext.agents.web_surfer import MultimodalWebSurfer
from autogen_ext.agents.magentic_one import MagenticOneCoderAgent
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import TextMessage, UserInputRequestedEvent, ToolCallExecutionEvent, ToolCallRequestEvent, AgentEvent, ChatMessage, HandoffMessage, StopMessage
from autogen_agentchat.teams import RoundRobinGroupChat, SelectorGroupChat, Swarm, MagenticOneGroupChat
from autogen_core import CancellationToken
from autogen_core.models import ChatCompletionClient
from autogen_agentchat.ui import Console
from autogen_agentchat import EVENT_LOGGER_NAME, TRACE_LOGGER_NAME
logger = logging.getLogger(__name__)

# ログデータの中から必要なステータスを取得して非同期的にブロードキャストする
# Next Speaker/Progress Ledger を表示するためのカスタムハンドラ
class SelectedSpeakerHandler(logging.Handler):
    def emit(self, record):
        msg = self.format(record)
        #print("███ Logger:", msg)
        if "Next Speaker:" in msg:
            selected_speaker = msg.split("Next Speaker: ")[-1].strip()
            print("███ Next Speaker:", selected_speaker)
            # 非同期タスクとして broadcast を実行
            loop = asyncio.get_event_loop()
            loop.create_task(manager.broadcast({
                "source": "System",
                "selected_speaker": selected_speaker
            }))
        elif "Progress Ledger:" in msg:
            progress_ledger = msg.split("Progress Ledger: ")[-1].strip()
            print("███ Progress Ledger:", progress_ledger)
            # 非同期タスクとして broadcast を実行
            loop = asyncio.get_event_loop()
            loop.create_task(manager.broadcast({
                "source": "Progress Ledger",
                "text": progress_ledger
            }))

# autogen_agentchat ロガーの設定例
agent_logger = logging.getLogger("autogen_agentchat")
agent_logger.setLevel(logging.DEBUG)
selected_handler = SelectedSpeakerHandler()
agent_logger.addHandler(selected_handler)

app = FastAPI()

model_config_path = "model_config.yaml"
state_path = "team_state.json"
history_path = "team_history.json"

async def search_flight(departure: str, destination: str, arrival_time: str, passengers: int) -> str:
    """
    Search for flights based on given conditions.

    :param departure: Departure city.
    :type departure: str
    :param destination: Destination city.
    :type destination: str
    :param arrival_time: Desired arrival time (format: YYYY-MM-DD HH:MM).
    :type arrival_time: str
    :param passengers: Number of passengers.
    :type passengers: int
    :raises ValueError: If arrival_time format is invalid.
    :return: Flight search results.
    :rtype: str
    """

    # Sample fixed result
    result = {
        "departure": departure,
        "destination": destination,
        "flight_number": "JL123",
        "airline": "Japan Airlines",
        "departure_time": "2025-02-01 16:30",
        "arrival_time": "2025-02-01 18:50",
        "price": 25000,
        "currency": "JPY",
        "passengers": passengers,
    }

    # Validate arrival_time
    try:
        datetime.strptime(arrival_time, "%Y-%m-%d %H:%M")
        return str(result)
    except ValueError:
        error_message = "Error: Invalid arrival_time format. Use 'YYYY-MM-DD HH:MM'."
        return error_message
        

async def search_hotel(destination: str, check_in: str, check_out: str, guests: int) -> str:
    """
    Search for hotels based on given conditions.

    :param destination: Destination city.
    :type destination: str
    :param check_in: Check-in date (format: YYYY-MM-DD).
    :type check_in: str
    :param check_out: Check-out date (format: YYYY-MM-DD).
    :type check_out: str
    :param guests: Number of guests.
    :type guests: int
    :raises ValueError: If check_in or check_out format is invalid.
    :return: Hotel search results.
    :rtype: str
    """

    # Sample fixed result
    result = {
        "destination": destination,
        "hotel_name": "Grand Fukuoka Hotel",
        "check_in": check_in,
        "check_out": check_out,
        "price_per_night": 12000,
        "currency": "JPY",
        "guests": guests,
        "total_price": 24000,
    }

    # Validate check_in and check_out
    try:
        datetime.strptime(check_in, "%Y-%m-%d")
        datetime.strptime(check_out, "%Y-%m-%d")

        return str(result)
    except ValueError:
        error_message = "Invalid date format. Use 'YYYY-MM-DD'."
        return error_message
    
async def get_team() -> SelectorGroupChat:
    # Get model client from config.
    async with aiofiles.open(model_config_path, "r") as file:
        model_config = yaml.safe_load(await file.read())
    # Create an agent that uses the OpenAI GPT-4o model with the custom response format.
    model_client = ChatCompletionClient.load_component(model_config)
   
    planning_agent = AssistantAgent(
        "PlanningAgent",
        description="タスクを計画するエージェント。新しいタスクが与えられたときに最初に起動するエージェントであるべきである。",
        model_client=model_client,
        system_message="""
あなたはトラベルプランニングエージェントです。
専門エージェントに委託して各地域のおすすめ旅行先や最新イベントを調査します:
    - fukuoka_agent: 福岡県の観光の専門家
    - osaka_agent: 大阪の観光の専門家
ホテルの検索、予約、確認、取り消し、FAQを行う場合:
    - hotel_agent: ホテルのエージェント
航空券の予約、確認、取り消しを行う場合:
    - airline_agent: 航空会社のエージェント
# Rule
- 議論の結果を集約して最終的にユーザーに*日本語で*回答します。
- 自分は専門エージェントを実行することはできません
- 最終回答が完成したら文の最後に TERMINATE を含めること! ユーザーに回答を求める質問は絶対しないでください。
        """,
    )

    hotel_agent = AssistantAgent(
        "HotelAgent",
        description="ホテルの検索、予約、確認、取り消し、FAQを行うホテルのエージェント",
        model_client=model_client,
        tools=[search_hotel],
        reflect_on_tool_use=True,
        system_message="""あなたはホテルのエージェントです。ホテルの検索、予約、確認、取り消し、FAQを行います。ただし、今はホテルの検索のみを行います。必ず日本語で回答します。
        """,
    )

    airline_agent = AssistantAgent(
        "AirlineAgent",
        description="航空券の予約、確認、取り消し、FAQを行う航空会社のエージェント",
        model_client=model_client,
        tools=[search_flight],
        reflect_on_tool_use=True,
        system_message="""あなたは航空会社のエージェントです。航空券の予約、確認、取り消し、FAQを行います。ただし、今は航空券の検索のみを行います。必ず日本語で回答します。
        """,
    )

    # Define termination condition
    max_msg_termination = MaxMessageTermination(max_messages=25)
    text_termination = TextMentionTermination("TERMINATE")
    time_terminarion = TimeoutTermination(180)
    combined_termination = max_msg_termination | text_termination | time_terminarion

    # Create a team of agents
    team = MagenticOneGroupChat(
        [planning_agent, hotel_agent, airline_agent],
        model_client=model_client,
        termination_condition=combined_termination,
        max_turns=10
        )

    # Load state from file.
    if not os.path.exists(state_path):
        return team
    async with aiofiles.open(state_path, "r") as file:
        state = json.loads(await file.read())
    await team.load_state(state)
    return team

# CORS 設定（フロントエンドからのアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(message))

manager = ConnectionManager()

# グローバル変数：デモタスクの状態を管理
demo_task: asyncio.Task = None

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:

            # クライアントから JSON を受信（例: {"source": "TravelAgent", "text": "Hello"}）
            data = await websocket.receive_json()
            print(f"Received data: {data}")
            source = data.get("source")
            text = data.get("text")
            print(f"Received message from {source}: {text}")
            
            # "start demo" という文字列が送信された場合、デモのシミュレーションを起動
            if text and text.strip().lower() == "start demo":
                global demo_task
                if demo_task is None or demo_task.done():
                    demo_task = asyncio.create_task(simulate_conversation())
                    response = {"source": "System", "text": "Demo simulation started"}
                    await manager.broadcast(response)
                continue  # "start demo" メッセージ自体はここではブロードキャストせず次のループへ
            
            team = await get_team()
            #history = await get_history()
            stream = team.run_stream(task=text)
            # デモ開始時に processing 状態を設定
            await manager.broadcast({"source": "System", "text": "Demo simulation started", "processing": True})
            
            async for message in stream:
                #print(f"███ Stream message: {message}")
                if isinstance(message, TaskResult):
                    print(f"███ TaskResult: {message.stop_reason}")
                elif isinstance(message, TextMessage):
                    response = {"source": message.source, "text": message.content}
                    print(f"███ TextMessage: {message.source}: {message.content}")
                    await manager.broadcast(response)
                elif isinstance(message, ToolCallRequestEvent) or isinstance(message, ToolCallExecutionEvent):
                    print(f"███ ToolCall: {message}")
                elif isinstance(message, StopMessage):
                    print(f"███ StopMessage: {message}")
                    response = {"source": message.source, "text": message.content}
                    await manager.broadcast(response)
                #if not isinstance(message, UserInputRequestedEvent):
                    # Don't save user input events to history.
                    #history.append(message.model_dump())
        
                
            print("Chat completed")
            # シミュレーション終了後、processing 状態を解除
            await manager.broadcast({"source": "System", "text": "Demo simulation ended", "processing": False})
            
    except WebSocketDisconnect:
        print("WebSocketDisconnect")
        logger.info("Client disconnected")
        manager.disconnect(websocket)
    # except Exception as e:
    #     print(f"Unexpected error: {str(e)}")
    #     logger.error(f"Unexpected error: {str(e)}")
    #     try:
    #         await websocket.send_json({
    #             "type": "error",
    #             "content": f"Unexpected error: {str(e)}",
    #             "source": "System"
    #         })
    #     except:
    #         pass

async def get_history() -> list[dict[str, Any]]:
    """Get chat history from file."""
    if not os.path.exists(history_path):
        return []
    async with aiofiles.open(history_path, "r") as file:
        return json.loads(await file.read())
    
@app.get("/history")
async def history() -> list[dict[str, Any]]:
    try:
        return await get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


async def simulate_conversation():
    # デモ開始時に processing 状態を設定
    await manager.broadcast({"source": "System", "text": "Demo simulation started", "processing": True})
    
    # 各Agentごとの会話ストーリーを定義
    stories = {
    "TravelAgent": [
        "ようこそ、当旅行代理店へ！",
        "ご旅行の計画について、どのようにお手伝いできますか？",
        "素晴らしい旅行パッケージをご用意しています。"
    ],
    "PlanningAgent": [
        "旅程の計画をお手伝いできます。",
        "一日のスケジュールを効率的に組みましょう。",
        "理想のプランのために、ご希望をお聞かせください。"
    ],
    "HotelAgent": [
        "豪華なホテルをご用意しています。",
        "お部屋のオプションをご確認されますか？",
        "当ホテルでは無料の朝食サービスを提供しています。"
    ],
    "AirlineAgent": [
        "最新のフライトスケジュールをご案内しています。",
        "お得な航空券をご用意しております。",
        "窓側のお席をご希望ですか？"
    ]
    }

    agents = list(stories.keys())
    # 各Agentが発言する最大数を求める
    max_messages = max(len(messages) for messages in stories.values())
    for i in range(max_messages):
        for agent in agents:
            messages = stories[agent]
            if i < len(messages):
                # 1件発言する前に 1〜3秒ランダムな待機
                await asyncio.sleep(random.uniform(1, 3))
                response = {"source": agent, "text": messages[i]}
                print(f"Broadcasting from {agent}: {messages[i]}")
                await manager.broadcast(response)
    # 1巡終了後、5〜10秒の待機を挟み、終了メッセージをブロードキャスト
    await asyncio.sleep(random.uniform(5, 10))
    end_response = {"source": "System", "text": "Demo simulation finished"}
    await manager.broadcast(end_response)
    # シミュレーション終了後、processing 状態を解除
    await manager.broadcast({"source": "System", "text": "Demo simulation ended", "processing": False})

# startup イベントによる自動起動は不要の場合、コメントアウトしてください
# @app.on_event("startup")
# async def startup_event():
#     asyncio.create_task(simulate_conversation())

# Example usage
# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run(app, host="0.0.0.0", port=8000)