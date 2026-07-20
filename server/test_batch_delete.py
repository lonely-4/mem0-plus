"""Unit tests for batch-delete helper logic (no full app boot)."""

from unittest.mock import MagicMock

from mem0.exceptions import ValidationError as Mem0ValidationError


def _run_batch_delete(memory, memory_ids: list[str]) -> dict:
    """Mirror of main.batch_delete_memories core loop."""
    deleted: list[str] = []
    failed: list[dict[str, str]] = []
    seen: set[str] = set()
    ordered_ids: list[str] = []
    for mid in memory_ids:
        if mid and mid not in seen:
            seen.add(mid)
            ordered_ids.append(mid)

    for memory_id in ordered_ids:
        try:
            memory.delete(memory_id=memory_id)
            deleted.append(memory_id)
        except (ValueError, Mem0ValidationError) as e:
            failed.append({"id": memory_id, "error": str(e)})
        except Exception:
            failed.append({"id": memory_id, "error": "delete failed"})

    return {
        "deleted": deleted,
        "failed": failed,
        "deleted_count": len(deleted),
        "failed_count": len(failed),
    }


def test_batch_delete_all_success():
    memory = MagicMock()
    result = _run_batch_delete(memory, ["a", "b", "c"])
    assert result["deleted_count"] == 3
    assert result["failed_count"] == 0
    assert result["deleted"] == ["a", "b", "c"]
    assert memory.delete.call_count == 3


def test_batch_delete_partial_failure():
    memory = MagicMock()

    def _delete(memory_id: str):
        if memory_id == "bad":
            raise ValueError("not found")

    memory.delete.side_effect = _delete
    result = _run_batch_delete(memory, ["good", "bad", "also"])
    assert result["deleted"] == ["good", "also"]
    assert result["failed_count"] == 1
    assert result["failed"][0]["id"] == "bad"


def test_batch_delete_dedupes_ids():
    memory = MagicMock()
    result = _run_batch_delete(memory, ["a", "a", "b", "a"])
    assert result["deleted"] == ["a", "b"]
    assert memory.delete.call_count == 2
