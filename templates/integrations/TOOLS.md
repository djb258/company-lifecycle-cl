# Tool Selection Doctrine

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |

---

## Core Doctrine

> **Determinism > Cost > Auditability**
> **LLMs are allowed only as tail arbitration**
> **Tools are swappable; doctrine is not**

---

## Tool Approval Rules

| Rule | Enforcement |
|------|-------------|
| All tools MUST be registered in this ledger | PR rejected if not |
| New tools require an ADR | No exceptions |
| LLMs cannot replace deterministic scripts | PR invalid |
| Tools are scoped to hub M layer only | Spokes cannot own tools |

---

## Company Lifecycle Tool Ledger

| Step | Tool Name | Solution Type | LLM? |
|------|-----------|---------------|------|
| 1 | Lifecycle State Machine | Deterministic FSM | No |
| 2 | Company Validator | Schema validation | No |
| 3 | Stage Transition Engine | State machine | No |
| 4 | Event Orchestrator | Event-driven | No |
| 5 | Data Transformer | Deterministic mapping | No |
| 6 | Audit Logger | Structured logging | No |
| 7 | Notification Dispatcher | Template-based | No |
| 8 | AI Classification Helper | LLM tail only | Yes (tail) |

### TypeScript Reference

```typescript
export const TOOL_LEDGER = [
  { step: 1,  name: "Lifecycle State Machine",  solution: "Deterministic FSM" },
  { step: 2,  name: "Company Validator",        solution: "Schema validation" },
  { step: 3,  name: "Stage Transition Engine",  solution: "State machine" },
  { step: 4,  name: "Event Orchestrator",       solution: "Event-driven" },
  { step: 5,  name: "Data Transformer",         solution: "Deterministic mapping" },
  { step: 6,  name: "Audit Logger",             solution: "Structured logging" },
  { step: 7,  name: "Notification Dispatcher",  solution: "Template-based" },
  { step: 8,  name: "AI Classification Helper", solution: "LLM tail only" },
];
```

---

## Tool Categories

### Category 1: Pure Deterministic (7 tools)
Output is 100% predictable. No LLM.

| Steps | Tools |
|-------|-------|
| 1, 2, 3 | Lifecycle State Machine, Company Validator, Stage Transition Engine |
| 4, 5 | Event Orchestrator, Data Transformer |
| 6, 7 | Audit Logger, Notification Dispatcher |

### Category 2: LLM Tail Only (1 tool)
Deterministic logic first, LLM only for edge cases.

| Step | Tool | When LLM Used |
|------|------|---------------|
| 8 | AI Classification Helper | When deterministic classification fails |

### Category 3: Forbidden
- Unregistered tools
- Tools without ADR
- Tools spanning multiple hubs
- Tools in spokes
- LLM as primary solution

---

## IMO Layer Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                         INGRESS (I)                              │
│  UI Forms, API Gateway, Webhook Receiver                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MIDDLE (M)                               │
│                                                                  │
│  STATE: Steps 1, 3 (Lifecycle State Machine, Transition Engine)│
│  VALIDATION: Step 2 (Company Validator)                         │
│  ORCHESTRATION: Step 4 (Event Orchestrator)                     │
│  TRANSFORMATION: Step 5 (Data Transformer)                      │
│  AI: Step 8 (AI Classification Helper)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EGRESS (O)                               │
│  Steps 6, 7: Audit Logger, Notification Dispatcher              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Tools (Required)

| Tool | Purpose | Doctrine ID |
|------|---------|-------------|
| Doppler | Secrets management | 04.05.01 |
| GitHub | Version control | 04.05.02 |
| Linear | Task management | 04.05.03 |
| Obsidian | Knowledge management | 04.05.04 |
| HEIR | Compliance validation | 04.05.05 |
| Supabase | Database | 04.04.06 |
| Vercel | Deployment | 04.04.07 |

---

## Tool Scoping Rules

| Location | Tools Allowed |
|----------|---------------|
| **I — Ingress** | None (interface only) |
| **M — Middle** | All processing tools (Steps 1-5, 8) |
| **O — Egress** | Output tools only (Steps 6-7) |
| **Spokes** | None (interface only) |

---

## Adding a New Tool

1. Determine if deterministic solution exists
2. If yes → implement deterministically
3. If no → implement rules first, LLM as tail only
4. Create ADR using `templates/adr/ADR.md`
5. Assign step number and Doctrine ID
6. Add to this ledger
7. Get hub owner approval

---

## LLM Usage Validation

Before using LLM in any tool:

- [ ] Deterministic solution proven impossible
- [ ] Rules/templates tried first
- [ ] LLM only handles edge cases
- [ ] Output is validated before action
- [ ] Audit trail maintained
- [ ] ADR documents the decision

---

## Compliance Checklist

- [ ] All tools registered in ledger
- [ ] Each tool has step number
- [ ] Each tool has Doctrine ID
- [ ] Each tool mapped to IMO layer
- [ ] No tools in spokes
- [ ] No tools spanning hubs
- [ ] LLM usage justified (1 tool max)
- [ ] Security review completed

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | PRD-COMPANY-LIFECYCLE |
| ADR | ADR-001-tool-selection |
| Linear Issue | |
