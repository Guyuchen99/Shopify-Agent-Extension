import os
import json
import uuid
import datetime
import vertexai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION")
RESOURCE_ID = os.getenv("RESOURCE_ID")

AGENT_ENGINE_BASE_URL = (
    f"projects/{PROJECT_ID}/locations/{LOCATION}/reasoningEngines/{RESOURCE_ID}"
)

if not all([PROJECT_ID, LOCATION, RESOURCE_ID]):
    raise RuntimeError(
        "Missing environment variables: PROJECT_ID, LOCATION, or RESOURCE_ID"
    )

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ycgraphixs-dev.myshopify.com",
        "https://localhost:3458",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = vertexai.Client(project=PROJECT_ID, location=LOCATION)


class AgentResponse(BaseModel):
    success: bool
    data: Dict[str, Any]


@app.post("/api/chat/{user_id}/create-session", response_model=AgentResponse)
async def create_session(user_id: str, cart_id: str):
    try:
        session = client.agent_engines.sessions.create(
            name=AGENT_ENGINE_BASE_URL,
            user_id=user_id,
        )

        session_id = session.response.name.split("/sessions/")[-1]

        invocation_id = f"e-{uuid.uuid4()}"

        initialize_state = vertexai.types.EventActions(
            state_delta={"cart_id": f"gid://shopify/Cart/{cart_id}"}
        )
        config = vertexai.types.AppendAgentEngineSessionEventConfig(
            actions=initialize_state
        )

        client.agent_engines.sessions.events.append(
            name=f"{AGENT_ENGINE_BASE_URL}/sessions/{session_id}",
            author="shopify_agent",
            invocation_id=invocation_id,
            timestamp=datetime.datetime.now(tz=datetime.timezone.utc),
            config=config,
        )

        print(
            f"✅ NOTE: /api/chat/{user_id}/create-session returned: {{'sessionId': '{session_id}'}}"
        )
        return AgentResponse(success=True, data={"sessionId": session_id})
    except Exception as e:
        print(f"❌ ERROR: /api/chat/{user_id}/create-session failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/{session_id}/inject-agent-message", response_model=AgentResponse)
async def inject_agent_message(session_id: str, message: str):
    try:
        invocation_id = f"e-{uuid.uuid4()}"

        client.agent_engines.sessions.events.append(
            name=f"{AGENT_ENGINE_BASE_URL}/sessions/{session_id}",
            author="suggestion_agent",
            invocation_id=invocation_id,
            timestamp=datetime.datetime.now(tz=datetime.timezone.utc),
            config={
                "content": {"role": "model", "parts": [{"text": message}]},
            },
        )

        print(
            f"✅ NOTE: /api/chat/{session_id}/inject-agent-message returned: {{'injectedAgentMessage': '{message}'}}"
        )
        return AgentResponse(success=True, data={"injectedAgentMessage": message})
    except Exception as e:
        print(f"❌ ERROR: /api/chat/{session_id}/inject-agent-message failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/{user_id}/{session_id}/send-message")
async def send_message(user_id: str, session_id: str, message: str):
    try:
        adk_application = client.agent_engines.get(name=AGENT_ENGINE_BASE_URL)

        async def event_stream():
            print(
                f"✅ NOTE: /api/chat/{user_id}/{session_id}/send-message streaming started."
            )

            async for event in adk_application.async_stream_query(
                user_id=user_id,
                session_id=session_id,
                message=message,
            ):
                print(f"🟢 EVENT: {json.dumps(event, indent=2)}")
                yield f"data: {json.dumps(event)}\n\n"

        print(
            f"✅ NOTE: /api/chat/{user_id}/{session_id}/send-message streaming ended."
        )
        return StreamingResponse(event_stream(), media_type="text/event-stream")
    except Exception as e:
        print(f"❌ ERROR: /api/chat/{user_id}/{session_id}/send-message failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/{user_id}/latest-session", response_model=AgentResponse)
async def get_latest_session(user_id: str):
    try:
        latest_session_id = None

        for session in client.agent_engines.sessions.list(
            name=AGENT_ENGINE_BASE_URL,
            config={"filter": f"user_id={user_id}"},
        ):
            latest_session_id = session.name.split("/sessions/")[-1]
            break

        print(
            f"✅ NOTE: /api/chat/{user_id}/latest-session returned: {{'latestSessionId': '{latest_session_id}'}}"
        )
        return AgentResponse(success=True, data={"latestSessionId": latest_session_id})
    except Exception as e:
        print(f"❌ ERROR: /api/chat/{user_id}/latest-session failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/{session_id}/history", response_model=AgentResponse)
async def get_history(session_id: str):
    try:
        session_history = []

        for session_event in client.agent_engines.sessions.events.list(
            name=f"{AGENT_ENGINE_BASE_URL}/sessions/{session_id}",
        ):
            event = {
                "author": session_event.author,
                "content": (
                    {
                        "role": session_event.content.role,
                        "parts": {"text": session_event.content.parts[0].text},
                    }
                    if session_event.content.role and session_event.content.parts
                    else None
                ),
                "actions": {
                    "state_delta": (
                        session_event.actions.state_delta
                        if session_event.actions.state_delta
                        else None
                    )
                },
                "timestamp": session_event.timestamp.isoformat(),
            }
            session_history.append(event)

        print(
            f"✅ NOTE: /api/chat/{session_id}/history returned: {{'sessionEvents': '{session_history}'}}"
        )
        return AgentResponse(success=True, data={"sessionEvents": session_history})
    except Exception as e:
        print(f"❌ ERROR: /api/chat/{session_id}/history failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
