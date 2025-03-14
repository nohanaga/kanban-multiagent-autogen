import React, { useState, useEffect, useRef } from "react";
import Box from "@material-ui/core/Box";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import SendIcon from "@material-ui/icons/Send";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import { DEFAULT_CHAT_MESSAGE } from "PersonalKanban/constants";

export type ChatMessage = {
  source?: string;
  text: string;
  processing?: boolean;
  selected_speaker?: string;
};

export type Column = {
  id: string;
  title: string;
};

type ChatBoxProps = {
  onNewCard: (columnName: string, text: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onSelectedSpeakerChange?: (speaker: string) => void;
  columns: Column[];
};

const ChatBox: React.FC<ChatBoxProps> = ({ onNewCard, onProcessingChange, onSelectedSpeakerChange, columns }) => {
  const [message, setMessage] = useState(DEFAULT_CHAT_MESSAGE);
  const [selectedColumn, setSelectedColumn] = useState<string>(
    columns.length > 0 ? columns[0].title : ""
  );
  const [ws, setWs] = useState<WebSocket | null>(null);

  // useRef を用いてコールバック関数の最新参照を保持
  const onNewCardRef = useRef(onNewCard);
  const onProcessingChangeRef = useRef(onProcessingChange);
  const onSelectedSpeakerChangeRef = useRef(onSelectedSpeakerChange);

  useEffect(() => {
    onNewCardRef.current = onNewCard;
  }, [onNewCard]);

  useEffect(() => {
    onProcessingChangeRef.current = onProcessingChange;
  }, [onProcessingChange]);

  useEffect(() => {
    onSelectedSpeakerChangeRef.current = onSelectedSpeakerChange;
  }, [onSelectedSpeakerChange]);

  // 初回マウント時のみ WebSocket 接続を確立する
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/chat");
    socket.onmessage = (event) => {
      try {
        const data: ChatMessage = JSON.parse(event.data);
        if (typeof data.processing === "boolean" && onProcessingChangeRef.current) {
          onProcessingChangeRef.current(data.processing);
          // processingがfalseの場合、処理完了なのでselected_speakerもクリア
          if (!data.processing && onSelectedSpeakerChangeRef.current) {
            onSelectedSpeakerChangeRef.current("");
          }
        }
        if (data.selected_speaker && onSelectedSpeakerChangeRef.current) {
          onSelectedSpeakerChangeRef.current(data.selected_speaker);
        }
        // "System" の場合はカード追加を行わず、それ以外の場合のみカード追加処理を実施
        if (typeof data.source === "string" && data.source !== "System") {
          onNewCardRef.current(data.source, data.text);
        }
      } catch (e) {
        console.error("Invalid message format", e);
      }
    };
    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (columns.length > 0 && !columns.find((col) => col.title === selectedColumn)) {
      setSelectedColumn(columns[0].title);
    }
  }, [columns, selectedColumn]);

  const handleSend = () => {
    if (ws && ws.readyState === WebSocket.OPEN && message.trim() && selectedColumn) {
      const payload = { source: selectedColumn, text: message };
      ws.send(JSON.stringify(payload));
      setMessage("");
    } else {
      console.warn("WebSocket not open: unable to send message");
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="flex-end" style={{ marginLeft: 10, marginTop: 2, padding: 2, border: "1px solid #ccc" }}>
      <FormControl variant="outlined" size="small" style={{ marginRight: 10, minWidth: 120 }}>
        <InputLabel id="column-select-label">列選択</InputLabel>
        <Select
          labelId="column-select-label"
          value={selectedColumn}
          onChange={(e) => setSelectedColumn(e.target.value as string)}
          label="列選択"
        >
          {columns.map((col) => (
            <MenuItem key={col.id} value={col.title}>
              {col.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        placeholder="メッセージ入力"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            handleSend();
          }
        }}
        variant="outlined"
        size="small"
        style={{ width: "400px", marginRight: 0 }}
        InputProps={{
          style: { fontSize: "12px" },
        }}
      />
      <IconButton color="primary" onClick={handleSend}>
        <SendIcon />
      </IconButton>
    </Box>
  );
};

export default ChatBox;