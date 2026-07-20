"""FastMCP server exposing Mem0 memory tools for AI clients.

Mounted into the FastAPI app at /mcp (see main.py).
Uses the shared Memory instance from server_state.
"""

import json
import logging
from typing import Any

from fastmcp import FastMCP
from server_state import get_memory_instance

logger = logging.getLogger(__name__)

mcp = FastMCP(
    "mem0-mcp",
    instructions=(
        "Mem0 self-hosted memory tools. "
        "Use add_memory to store facts/preferences, search_memories to retrieve them, "
        "and the get/update/delete tools to manage individual memories. "
        "Always pass user_id (or agent_id/run_id) so memories are scoped correctly."
    ),
)


def _json(data: Any) -> str:
    return json.dumps(data, default=str, ensure_ascii=False)


def _require_scope(user_id: str | None, agent_id: str | None, run_id: str | None) -> None:
    if not any([user_id, agent_id, run_id]):
        raise ValueError("At least one of user_id, agent_id, or run_id is required.")


@mcp.tool
def add_memory(
    text: str,
    user_id: str | None = None,
    agent_id: str | None = None,
    run_id: str | None = None,
    infer: bool = True,
) -> str:
    """Store a new memory from text. Call when the user shares preferences, facts, or asks you to remember something.

    Args:
        text: Content to remember.
        user_id: Scope memories to this user.
        agent_id: Scope memories to this agent.
        run_id: Scope memories to this session/run.
        infer: If True (default), extract facts via LLM. If False, store text verbatim.
    """
    _require_scope(user_id, agent_id, run_id)
    memory = get_memory_instance()
    params: dict[str, Any] = {"infer": infer}
    if user_id:
        params["user_id"] = user_id
    if agent_id:
        params["agent_id"] = agent_id
    if run_id:
        params["run_id"] = run_id
    result = memory.add(messages=[{"role": "user", "content": text}], **params)
    return _json(result)


@mcp.tool
def search_memories(
    query: str,
    user_id: str | None = None,
    agent_id: str | None = None,
    run_id: str | None = None,
    limit: int = 10,
) -> str:
    """Search stored memories. Call whenever you need prior context about the user or conversation.

    Args:
        query: Natural-language search query.
        user_id: Filter by user.
        agent_id: Filter by agent.
        run_id: Filter by session/run.
        limit: Max results (default 10).
    """
    _require_scope(user_id, agent_id, run_id)
    memory = get_memory_instance()
    filters: dict[str, Any] = {}
    if user_id:
        filters["user_id"] = user_id
    if agent_id:
        filters["agent_id"] = agent_id
    if run_id:
        filters["run_id"] = run_id
    result = memory.search(query=query, filters=filters, top_k=limit)
    return _json(result)


@mcp.tool
def get_all_memories(
    user_id: str | None = None,
    agent_id: str | None = None,
    run_id: str | None = None,
    limit: int = 100,
) -> str:
    """List all memories for a given scope (user/agent/run).

    Args:
        user_id: Filter by user.
        agent_id: Filter by agent.
        run_id: Filter by session/run.
        limit: Max results (default 100).
    """
    _require_scope(user_id, agent_id, run_id)
    memory = get_memory_instance()
    filters: dict[str, Any] = {}
    if user_id:
        filters["user_id"] = user_id
    if agent_id:
        filters["agent_id"] = agent_id
    if run_id:
        filters["run_id"] = run_id
    result = memory.get_all(filters=filters, top_k=limit)
    return _json(result)


@mcp.tool
def get_memory(memory_id: str) -> str:
    """Retrieve a single memory by its ID.

    Args:
        memory_id: The memory UUID.
    """
    memory = get_memory_instance()
    return _json(memory.get(memory_id))


@mcp.tool
def update_memory(memory_id: str, text: str) -> str:
    """Update an existing memory's content.

    Args:
        memory_id: The memory UUID.
        text: New content for the memory.
    """
    memory = get_memory_instance()
    return _json(memory.update(memory_id=memory_id, data=text))


@mcp.tool
def delete_memory(memory_id: str) -> str:
    """Delete a specific memory by ID.

    Args:
        memory_id: The memory UUID.
    """
    memory = get_memory_instance()
    memory.delete(memory_id=memory_id)
    return _json({"message": "Memory deleted successfully", "memory_id": memory_id})


@mcp.tool
def delete_all_memories(
    user_id: str | None = None,
    agent_id: str | None = None,
    run_id: str | None = None,
) -> str:
    """Delete all memories for a given scope. Requires at least one of user_id/agent_id/run_id.

    Args:
        user_id: Delete memories for this user.
        agent_id: Delete memories for this agent.
        run_id: Delete memories for this session/run.
    """
    _require_scope(user_id, agent_id, run_id)
    memory = get_memory_instance()
    params: dict[str, Any] = {}
    if user_id:
        params["user_id"] = user_id
    if agent_id:
        params["agent_id"] = agent_id
    if run_id:
        params["run_id"] = run_id
    memory.delete_all(**params)
    return _json({"message": "All relevant memories deleted", **params})


def create_mcp_app():
    """Return the FastMCP Streamable HTTP ASGI app (path='/') for mounting at /mcp."""
    return mcp.http_app(path="/", stateless_http=True)
