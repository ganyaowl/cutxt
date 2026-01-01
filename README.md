# CuTxT
clasify your text/doc

# Installation
## Docker Compose 
```
    docker compose up -d
```

## Manually 
Use terminal multiplexer such as tmux/zellij
Firstly check comments: 
- /backend/database.py:6
- /frontend/src/package.json:7 (remove "--host 0.0.0.0")

### Backend
```
    cd backend
    py -3.12 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python main.py
```

### Frontend
```
    cd frontend
    npm install
    npm run dev # or build
```
