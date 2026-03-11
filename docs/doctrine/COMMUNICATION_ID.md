# Communication ID (CID) Doctrine

**Authority**: HUB-CL-001
**Status**: ACTIVE
**Classification**: LOCKED — Do not modify without governance review

---

## 1. Purpose

- CID represents **lifecycle movement events** — a company moving through a lifecycle stage boundary.
- CID is **immutable**. Once minted, it cannot be changed or reused.
- CID is **append-only**. The `communication_event` table is insert-only.
- CID is **NOT a message ID**. LCS derives `message_id` from CID. CID exists before any message is composed or sent.

---

## 2. Structural Format

```
CID = {sovereign_id}-{outreach_id}-{subhub}-{code}
```

**Example:**

```
C0452-OUT01-PPL-02
```

Each segment is separated by a hyphen. The code segment is zero-padded to 2 digits.

---

## 3. Component Definitions

| Component | Source | Description |
|-----------|--------|-------------|
| `sovereign_id` | `cl.company_identity` | Permanent CL anchor. The company's sovereign identifier. |
| `outreach_id` | `cl.company_identity.outreach_id` | Outreach lifecycle anchor. Ties CID to the outreach campaign. |
| `subhub` | Movement origin | Which sub-hub produced the movement: `PPL`, `DOL`, `BLOG`, `BIT`, etc. |
| `code` | `cl.movement_code_registry` | Numeric code scoped per sub-hub. Defines the movement type. |

---

## 4. Governance Rules

1. **Codes are defined in `cl.movement_code_registry`**. No ad-hoc codes.
2. **Codes are per-subhub namespace**. Code `01` in `PPL` is independent of code `01` in `DOL`.
3. **Codes are additive only**. New codes may be added; existing codes are never removed.
4. **Codes cannot be repurposed**. Once a code is assigned a meaning, that meaning is permanent.
5. **Only hub-layer logic mints CID**. The `cl.mint_communication_id()` function is the sole entry point.
6. **Subhubs emit movement input only**. A sub-hub signals that a movement occurred; the hub mints the CID.
7. **LCS cannot create CID**. LCS consumes CIDs and derives `message_id` from them. LCS never mints.

---

## 5. Closed-Loop Flow

```
Subhub (PPL/DOL/BLOG)
  → Neon hub (cl.mint_communication_id)
    → CID minted into cl.communication_event
      → LCS consumes CID
        → message_id derived from CID
          → Provider sends (Mailgun/HeyReach)
            → Webhook response
              → Update tied back to CID
```

Every downstream artifact (message_id, delivery event, webhook callback) traces back to exactly one CID.

---

## 6. Enforcement

- Subhubs must **NOT** construct CID manually. All movement must call `cl.mint_communication_id()`.
- LCS reads `cl.communication_event`. LCS derives `message_id` from `communication_id`.
- No other table or function may generate CID.
- No INSERT to `cl.communication_event` outside `cl.mint_communication_id()`.

---

## 7. Constraints

- Do not modify `sovereign_id` logic.
- Do not modify `outreach_id` logic.
- Do not introduce UUID-based CID.
- Do not add timestamps into the CID string.
- CID format is exactly 4 hyphen-separated segments.
- All minting logic is centralized in Neon via `cl.mint_communication_id()`.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-16 |
| Version | 1.0.0 |
