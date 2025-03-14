# kanban-multiagent-autogen
かんばんボード上に AutoGen を可視化するサンプルコード

## Install

### Frontend
[Node.js](https://nodejs.org/ja/download) `v18.9.0` で検証済み。
#### Local Development

```bash
git clone https://github.com/nohanaga/kanban-multiagent-autogen.git
cd kanban-multiagent-autogen
npm install
npm start
```

#### Build(Option)

```bash
npm run build
sudo npm install -g serve
serve -s build
```

### Backend
Python `3.10.15`、[AutoGen](https://microsoft.github.io/autogen/stable/index.html) `v0.4.8` で検証済み。

#### 1. Create venv

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install "autogen-agentchat==0.4.8" "autogen-ext[magentic-one,openai,azure]==0.4.8" "fastapi" "uvicorn[standard]" "PyYAML"
```

#### 2. Run
```bash
.venv/bin/uvicorn main:app --reload
```
現状、以下の GroupChat が実装されています。
- `main.py`: Magentic-One(Default)
- `main_selector.py`: SelectorGroupChat
- `main_swarm.py`: Swarm

## Model Config
OpenAI/Azure OpenAI モデルへの接続設定を記述する必要がある。
[`model_config_template.yaml`](model_config_template.yaml) を編集し、`model_config.yaml` として保存する。

## Customize
### エージェントとかんばんカラムのマッピング
AutoGen の `AssistantAgent` で定義した `name` パラメータと同じ `title` を持つかんばんカラムを追加することで、自動的に対応するカラムに発言（カード）が追加される仕組み。マッピングに失敗した場合は index=0 のカラムに追加される。

### 初期エージェント
[`src/PersonalKanban/services/Utils.ts`](src/PersonalKanban/services/Utils.ts#L62) の `getInitialState` 配列を編集する。

### かんばんの初期サイズ
[`src/PersonalKanban/constants/index.tsx`](src/PersonalKanban/constants/index.tsx) の定数を編集する。

### タイトル等のテキスト
[`src/PersonalKanban/assets/locales/jp/translations.json`](src/PersonalKanban/assets/locales/jp/translations.json) を編集する。

### 色定数
[`src/PersonalKanban/enums/index.tsx`](src/PersonalKanban/enums/index.tsx) を編集する。

# DEMO
LLM を使用せずに複数発言をシミュレートするにはメッセージに `start demo` を入力して送信する。

# Acknowledgment
I am grateful for [personal-kanban
](https://github.com/nishantpainter/personal-kanban)

