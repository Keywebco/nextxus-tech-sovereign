# Nova Stack Configuration — MiMo Backend

> NextXus Federation | Sovereign Builder Layer
> Wired: 2026-09-24

## Architecture

The Nova builder layer uses Xiaomi MiMo as its primary LLM backend via the OpenAI-compatible API.

### Provider

| Field | Value |
|-------|-------|
| Base URL | `https://api.xiaomimimo.com/v1` |
| Auth | Bearer token (`MIMO_API_KEY`) |
| Protocol | OpenAI-compatible (chat/completions) |

### Model Routing

| Model | ID | Use Case | Cost Tier |
|-------|----|----------|-----------|
| MiMo Flash | `mimo-v2.6-flash` | Batch/bulk operations, scaffolding, repetitive tasks | Low |
| MiMo Pro | `mimo-v2.6-pro` | Complex reasoning, architecture decisions, single critical tasks | Standard |
| MiMo Pro UltraSpeed | `mimo-v2.6-pro-ultraspeed` | Time-sensitive complex tasks requiring fast turnaround | Standard+ |

### Routing Logic

```
IF task.type IN [batch, scaffold, lint, format, migrate, bulk-edit]:
    model = mimo-v2.6-flash
ELIF task.type IN [architecture, debug-complex, security-review, refactor]:
    model = mimo-v2.6-pro
ELIF task.type IN [architecture, debug-complex] AND task.urgent:
    model = mimo-v2.6-pro-ultraspeed
ELSE:
    model = mimo-v2.6-flash  # default to cost-efficient
```

### Files in this directory

- `mimo-provider.yaml` — Central provider definition (base URL, auth, models)
- `openhands-config.toml` — OpenHands-compatible config with dual-model profiles
- `.aider.conf.yml` — Aider config pointing to MiMo Flash (default)
- `.aider.model.settings.yml` — Aider model metadata for MiMo models
- `router.yaml` — Task-to-model routing rules

### GitHub Actions

- `../../.github/workflows/nova-builder.yml` — Dispatch workflow for triggering Nova builder agents

### Environment Variables

All configs read credentials from environment variables, never hardcoded:

- `MIMO_API_KEY` — MiMo API key (stored in vault)
- `MIMO_BASE_URL` — Override base URL (optional, defaults to `https://api.xiaomimimo.com/v1`)
- `NOVA_DEFAULT_MODEL` — Override default model (optional, defaults to `mimo-v2.6-flash`)

### Federation Principles

- **Design for the thinnest of pocketbooks**: Flash handles 80%+ of work at lowest cost
- **Use what you have, add what's missing, do it once**: Single config, dual routing
- **No subscriptions, no tracking**: Direct API, no middleware dependencies
