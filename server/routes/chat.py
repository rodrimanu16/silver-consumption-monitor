"""
/api/chat — AI assistant powered by Databricks Genie.
Routes natural language questions to a Genie space backed by the production Delta table.
"""
from __future__ import annotations
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import asyncio

from server.config import get_workspace_client

router = APIRouter()

GENIE_SPACE_ID = os.environ.get("GENIE_SPACE_ID", "")  # Set via GENIE_SPACE_ID env var or app.yaml


def _ask_genie_sync(question: str, conversation_id: Optional[str]) -> dict:
    """Call Genie synchronously (runs in thread pool)."""
    from datetime import timedelta

    w = get_workspace_client()

    if conversation_id:
        result = w.genie.create_message_and_wait(
            space_id=GENIE_SPACE_ID,
            conversation_id=conversation_id,
            content=question,
            timeout=timedelta(seconds=120),
        )
    else:
        result = w.genie.start_conversation_and_wait(
            space_id=GENIE_SPACE_ID,
            content=question,
            timeout=timedelta(seconds=120),
        )

    # Extract text + SQL from attachments
    text_response = ""
    sql_query = ""
    data_rows = []
    columns = []

    if result.attachments:
        for att in result.attachments:
            if att.text and att.text.content:
                text_response = att.text.content
            if att.query:
                sql_query = att.query.query or ""
                # Fetch result data via statement execution API
                statement_id = getattr(att.query, 'statement_id', None)
                if statement_id:
                    try:
                        sr = w.statement_execution.get_statement(statement_id)
                        if sr.manifest and sr.manifest.schema and sr.manifest.schema.columns:
                            columns = [c.name for c in sr.manifest.schema.columns]
                        if sr.result and sr.result.data_array:
                            data_rows = sr.result.data_array
                    except Exception:
                        pass

    return {
        "conversation_id": result.conversation_id,
        "text": text_response,
        "sql": sql_query,
        "columns": columns,
        "data": data_rows,
    }


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    snapshot: Optional[dict] = None


@router.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, _ask_genie_sync, req.message, req.conversation_id
        )
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e), "text": f"Genie error: {e}"}, status_code=500)
