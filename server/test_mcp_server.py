"""Unit tests for MCP tool registration and auth helpers (no DB required for tools)."""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from mcp_server import create_mcp_app, mcp


def test_mcp_tools_registered():
    tools = set(mcp._tool_manager._tools.keys())
    assert tools == {
        "add_memory",
        "search_memories",
        "get_all_memories",
        "get_memory",
        "update_memory",
        "delete_memory",
        "delete_all_memories",
    }


def test_create_mcp_app_has_lifespan():
    app = create_mcp_app()
    assert hasattr(app, "lifespan")
    assert callable(app.lifespan)


def test_mcp_tool_returns_ok_envelope_on_validation_error():
    """Missing scope must not raise; returns ok=false JSON for the agent."""
    raw = mcp._tool_manager._tools["add_memory"].fn(text="hello")
    payload = json.loads(raw)
    assert payload["ok"] is False
    assert payload["error"]["code"] == "validation_error"
    assert payload["error"]["tool"] == "add_memory"
    assert "request_id" in payload["error"]


def test_mcp_tool_returns_ok_envelope_on_provider_error():
    from mem0.exceptions import LLMError

    with patch("mcp_server.get_memory_instance") as get_mem:
        mem = MagicMock()
        mem.add.side_effect = LLMError(
            "LLM extraction failed: 400 FAILED_PRECONDITION. "
            "{'error': {'message': 'User location is not supported for the API use.'}}"
        )
        get_mem.return_value = mem
        raw = mcp._tool_manager._tools["add_memory"].fn(text="hello", user_id="u1")
    payload = json.loads(raw)
    assert payload["ok"] is False
    assert payload["error"]["code"] in {
        "provider_region_unsupported",
        "llm_extraction_failed",
    }


def test_classify_region_message():
    from errors import classify_exception

    code, msg = classify_exception(Exception("User location is not supported for the API use."))
    assert code == "provider_region_unsupported"
    assert "region" in msg.lower() or "location" in msg.lower()


def test_mcp_success_envelope():
    with patch("mcp_server.get_memory_instance") as get_mem:
        mem = MagicMock()
        mem.search.return_value = {"results": [{"memory": "likes tea"}]}
        get_mem.return_value = mem
        raw = mcp._tool_manager._tools["search_memories"].fn(query="tea", user_id="u1")
    payload = json.loads(raw)
    assert payload["ok"] is True
    assert payload["data"]["results"][0]["memory"] == "likes tea"


def test_parse_mcp_log_fields_tools_call():
    from request_logging import parse_mcp_log_fields

    body = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "add_memory", "arguments": {"text": "hi", "user_id": "u1"}},
        }
    ).encode()
    assert parse_mcp_log_fields(body) == ("MCP", "add_memory")


def test_parse_mcp_log_fields_list_tools():
    from request_logging import parse_mcp_log_fields

    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
    assert parse_mcp_log_fields(body) == ("MCP", "tools/list")


def test_authenticate_request_rejects_missing_credentials():
    from auth import authenticate_request

    request = MagicMock()
    request.headers = {}
    request.state = MagicMock()

    with patch("auth.AUTH_DISABLED", False):
        with pytest.raises(HTTPException) as exc:
            authenticate_request(request)
        assert exc.value.status_code == 401


def test_authenticate_request_accepts_m0sk_bearer():
    from auth import authenticate_request

    request = MagicMock()
    request.headers = {"Authorization": "Bearer m0sk_testkey1234567890"}
    request.state = MagicMock()
    fake_user = MagicMock()
    fake_db = MagicMock()
    fake_db.__enter__ = MagicMock(return_value=fake_db)
    fake_db.__exit__ = MagicMock(return_value=False)

    with (
        patch("auth.SessionLocal", return_value=fake_db),
        patch("auth._resolve_user_from_api_key", return_value=fake_user) as resolve,
    ):
        user = authenticate_request(request)
        assert user is fake_user
        resolve.assert_called_once()
        assert resolve.call_args[0][0] == "m0sk_testkey1234567890"


def test_authenticate_request_accepts_x_api_key_m0sk():
    from auth import authenticate_request

    request = MagicMock()
    request.headers = {}
    request.state = MagicMock()
    fake_user = MagicMock()
    fake_db = MagicMock()
    fake_db.__enter__ = MagicMock(return_value=fake_db)
    fake_db.__exit__ = MagicMock(return_value=False)

    with (
        patch("auth.SessionLocal", return_value=fake_db),
        patch("auth._resolve_user_from_api_key", return_value=fake_user) as resolve,
    ):
        user = authenticate_request(request, x_api_key="m0sk_anotherkey123456")
        assert user is fake_user
        resolve.assert_called_once()
