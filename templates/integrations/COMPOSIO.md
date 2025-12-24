# Composio MCP Integration Template

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |
| **Composio Account** | barton-enterprises |

---

## Overview

This hub uses Composio as the Model Context Protocol (MCP) server for external service integration.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hub (M Layer) │    │   MCP Bridge    │    │   Composio MCP  │
│   Logic/State   │───▶│   (Ingress)     │───▶│   Server        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  External APIs  │
                                              │  (Egress)       │
                                              └─────────────────┘
```

---

## Connected Services

| Service | Purpose | Status | Doctrine ID |
|---------|---------|--------|-------------|
| GitHub | Repository management | [ ] Connected | TOOL-GH-001 |
| Supabase | Database operations | [ ] Connected | TOOL-SB-001 |
| Vercel | Deployment | [ ] Connected | TOOL-VC-001 |
| OpenAI | LLM integration | [ ] Connected | TOOL-OAI-001 |
| Anthropic | Claude integration | [ ] Connected | TOOL-ANT-001 |

---

## Environment Configuration

All Composio integrations require these environment variables.
**Use Doppler for secrets management.**

```bash
# Composio Integration (Required)
COMPOSIO_API_KEY=
MCP_API_URL=https://backend.composio.dev

# LLM Providers (As needed)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
LLM_DEFAULT_PROVIDER=

# MCP Server (Local development)
MCP_URL=http://localhost:7001
MCP_BEARER_TOKEN=

# Doctrine ID Generation
DOCTRINE_DB=
DOCTRINE_SUBHIVE=
DOCTRINE_APP=
DOCTRINE_VER=
```

---

## Doctrine ID Generation

All Composio operations MUST generate doctrine-compliant IDs:

```typescript
function generateDoctrineId(): string {
  const db = process.env.DOCTRINE_DB || 'CL';
  const subhive = process.env.DOCTRINE_SUBHIVE || 'LIFECYCLE';
  const app = process.env.DOCTRINE_APP || 'company-lifecycle';
  const ver = process.env.DOCTRINE_VER || '1.0';

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `${db}-${subhive}-${app}-${ver}-${timestamp}-${random}`;
}
```

---

## IMO Placement

| Layer | Composio Role |
|-------|---------------|
| **I — Ingress** | MCP Bridge receives external data |
| **M — Middle** | Hub logic decides what to do with data |
| **O — Egress** | MCP Bridge sends data to external services |

Composio is an **interface** (spoke), not a hub. It carries data, not logic.

---

## Security Requirements

- [ ] API keys stored in Doppler (never in code)
- [ ] Different keys for dev/staging/prod
- [ ] Keys rotated on schedule
- [ ] Usage monitored and logged
- [ ] CORS properly configured
- [ ] Bearer tokens for local MCP auth

---

## Testing

```bash
# Test Composio connectivity
curl -X GET https://backend.composio.dev/api/v3/connected_accounts \
  -H "x-api-key: $COMPOSIO_API_KEY"

# Test local MCP server
curl -X POST http://localhost:7001/mcp/test \
  -H "Authorization: Bearer $MCP_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "ping"}'
```

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | PRD-COMPANY-LIFECYCLE |
| ADR | |
| Linear Issue | |
