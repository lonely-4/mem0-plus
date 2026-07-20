"""Unit tests for MCP tool registration and auth helpers (no DB required for tools)."""

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
