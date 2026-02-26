# CID Sheets — Movement Code Reference

> **Authority:** HUB-CL-001
> **Migration:** `neon/migrations/014_lcs_cid_movement_codes.sql`
> **Infrastructure:** `neon/migrations/012_create_movement_registry.sql`

---

## What Are CID Sheets?

CID (Communication Identity) sheets document the movement codes for each sub-hub silo. Each sheet defines what lifecycle movements exist, what triggers them, and when they fire.

CIDs are minted exclusively by `cl.mint_communication_id()`. They are never manually constructed.

---

## CID Format

```
{sovereign_id}-{outreach_id}-{subhub}-{code}
```

- 4 hyphen-separated segments
- Code is zero-padded to 2 digits (01, 02, etc.)
- Example: `C0452-OUT01-PPL-02`

---

## Three Sheets

| Sheet | Subhub Code | File | Movement Codes |
|-------|-------------|------|----------------|
| Outreach | `OUT` | `cid_sheet_outreach.md` | 01-05 |
| Sales | `SAL` | `cid_sheet_sales.md` | 01-05 |
| Client | `CLI` | `cid_sheet_client.md` | 01-05 |

---

## Movement Code Summary

### Outreach (OUT)

| Code | Description | Fire Trigger |
|------|-------------|--------------|
| 01 | Initial outreach contact | New sovereign enters outreach pipeline |
| 02 | Follow-up sequence start | No response after initial contact (+3 days) |
| 03 | DOL renewal window opens | DOL renewal date detected (monthly scan) |
| 04 | Blog signal detected | New blog post indexed |
| 05 | Outreach cycle closed | Final outcome set |

### Sales (SAL)

| Code | Description | Fire Trigger |
|------|-------------|--------------|
| 01 | Lead qualified | Sovereign moves to sales pipeline |
| 02 | Discovery scheduled | Meeting booked |
| 03 | Proposal sent | Proposal delivered |
| 04 | Follow-up post-proposal | No response after proposal (+5 days) |
| 05 | Sales cycle closed | Won / Lost outcome set |

### Client (CLI)

| Code | Description | Fire Trigger |
|------|-------------|--------------|
| 01 | Onboarding initiated | Contract signed |
| 02 | Onboarding completed | All onboarding tasks done |
| 03 | Quarterly check-in | Calendar trigger (quarterly) |
| 04 | Renewal window opens | Contract end date approaching (60 days) |
| 05 | Client cycle closed | Churned / Renewed outcome set |

---

## Governance Rules

1. **Namespace isolation** — Code `01` in OUT is independent of `01` in SAL. No cross-contamination.
2. **Additive only** — Codes are never removed or repurposed. New codes get the next available number.
3. **Single minting function** — All CIDs created via `cl.mint_communication_id(sovereign_id, outreach_id, subhub, code)`.
4. **Registry validation** — `mint_communication_id()` validates the movement code exists and is active before minting. Invalid codes raise an exception.
5. **Terminal codes** — Code 05 in each sheet is the cycle-close movement. No further CIDs should be minted in a closed cycle.

---

## Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| `cl.movement_code_registry` | Table | Movement code definitions (PK: subhub + code) |
| `cl.communication_event` | Table | Append-only CID ledger (PK: communication_id) |
| `cl.mint_communication_id()` | Function | Sole CID minting entry point |

---

**Document Control:** HUB-CL-001 | CC-01
