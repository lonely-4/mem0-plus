"""Helpers for request_logs (including MCP method/path rewriting)."""

from __future__ import annotations

import json


def parse_mcp_log_fields(body: bytes) -> tuple[str, str] | None:
    """Map MCP JSON-RPC body to (method, path) for request_logs.

    tools/call  -> ("MCP", tool_name)
    other RPC   -> ("MCP", rpc_method) e.g. tools/list, initialize
    """
    if not body:
        return None
    try:
        payload = json.loads(body)
    except (TypeError, ValueError, UnicodeDecodeError):
        return None

    if isinstance(payload, list):
        if not payload:
            return None
        payload = payload[0]
    if not isinstance(payload, dict):
        return None

    rpc_method = payload.get("method")
    if not isinstance(rpc_method, str) or not rpc_method:
        return None

    if rpc_method == "tools/call":
        params = payload.get("params") or {}
        tool_name = params.get("name") if isinstance(params, dict) else None
        if isinstance(tool_name, str) and tool_name:
            return ("MCP", tool_name[:512])
        return ("MCP", "tools/call")

    return ("MCP", rpc_method[:512])
