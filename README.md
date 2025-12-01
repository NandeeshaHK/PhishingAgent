# Phishing Agent API

A lightweight FastAPI server for phishing detection, deployable on Render.

## Features
- **Domain Reputation Check**: Checks against a MongoDB database.
- **Advanced Analysis**: Uses Playwright and heuristic analysis for unknown domains.
- **LLM Verification**: Uses Groq (or OpenAI) to verify suspicious content.
- **API Key Authentication**: Secured via `X-API-Key` header.

## Local Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    playwright install chromium
    ```

2.  **Environment Variables**:
    Create a `.env` file:
    ```
    API_KEY=your_secret_key
    GROQ_API_KEY=your_groq_key
    MONGO_URI=your_mongodb_uri
    ```

3.  **Initialize Database**:
    ```bash
    python scripts/init_db.py
    ```

4.  **Run Server**:
    ```bash
    uvicorn app.main:app --reload
    ```

4.  **Test Endpoint**:
    ```bash
    curl -X POST "http://localhost:8000/check-phishing" \
         -H "X-API-Key: your_secret_key" \
         -H "Content-Type: application/json" \
         -d '{"url": "http://example.com"}'
    ```

## Deploy on Render

1.  Push this repository to GitHub/GitLab.
2.  Create a new **Web Service** on Render.
3.  Connect your repository.
4.  Render should automatically detect `render.yaml` (or you can manually configure).
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5.  **Environment Variables**:
    - `API_KEY`: Set a strong secret.
    - `GROQ_API_KEY`: Add your Groq API Key.

## API Documentation
Once running, visit `/docs` for the Swagger UI.
