# Zapier integration for Mem0

A [Zapier](https://zapier.com) integration for [Mem0](https://mem0.ai) — the memory layer for AI agents. Add, search, list, and delete long-term memories from any Zap.

Built with the [Zapier Platform CLI](https://docs.zapier.com/platform/quickstart/cli-tutorial).

## Actions

| Type | Name | Endpoint |
| --- | --- | --- |
| Create | **Add Memory** | `POST /v3/memories/add/` |
| Create | **Delete Memory** | `DELETE /v1/memories/{id}/` |
| Search | **Search Memories** | `POST /v3/memories/search/` |
| Search | **Get Memories** | `POST /v3/memories/` |

**Add Memory** runs LLM extraction asynchronously by default; the action polls the event until it completes and returns the resulting memories. Turn off **Wait for Completion** to return immediately, or set **Infer = false** to store verbatim (synchronous).

## Authentication

Custom (API key) auth. Provide a Mem0 API key from [app.mem0.ai](https://app.mem0.ai) → Settings → API Keys. It is sent as `Authorization: Token <key>`.

## Development

```bash
npm install
MEM0_API_KEY=m0-... npm test   # runs the E2E suite against api.mem0.ai
```

To deploy (maintainers): `zapier login && zapier push`.

## License

MIT
