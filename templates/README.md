# Templates Directory

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |

---

## Overview

This directory contains the authoritative templates for the Company Lifecycle Hub, based on the Hub & Spoke architecture from `imo-creator`.

**These templates are READ-ONLY references.** Copy them to the appropriate location and customize.

---

## Template Structure

```
templates/
├── doctrine/                    # Core architecture doctrine
│   ├── HUB_SPOKE_ARCHITECTURE.md    # Master hub & spoke doctrine
│   └── ALTITUDE_DESCENT_MODEL.md    # Altitude level governance
├── prd/                         # Product Requirements Documents
│   └── PRD_HUB.md                   # Hub PRD template
├── adr/                         # Architecture Decision Records
│   └── ADR.md                       # ADR template
├── pr/                          # Pull Request templates
│   ├── PULL_REQUEST_TEMPLATE_HUB.md     # Hub change PR
│   └── PULL_REQUEST_TEMPLATE_SPOKE.md   # Spoke change PR
├── checklists/                  # Compliance checklists
│   └── HUB_COMPLIANCE.md            # Pre-ship verification
└── integrations/                # Tool integration templates
    ├── DOPPLER.md                   # Secrets management
    ├── HEIR.md                      # Compliance validation
    ├── COMPOSIO.md                  # MCP integration
    ├── OBSIDIAN.md                  # Knowledge management
    └── TOOLS.md                     # Tool doctrine & ledger
```

---

## How to Use Templates

### Starting a New Feature

1. Read `doctrine/HUB_SPOKE_ARCHITECTURE.md` first
2. Check the altitude level for your work
3. Copy the appropriate template to `docs/`
4. Customize for your specific need

### Creating a PRD

```bash
cp templates/prd/PRD_HUB.md docs/prd/PRD-{feature-name}.md
```

### Creating an ADR

```bash
cp templates/adr/ADR.md docs/adr/ADR-{number}-{title}.md
```

### Completing Compliance

```bash
cp templates/checklists/HUB_COMPLIANCE.md docs/checklists/HUB_COMPLIANCE_{date}.md
```

---

## Altitude-Based Template Usage

| Altitude | Templates Allowed |
|----------|-------------------|
| 50k (Shell) | Hub identity declaration only |
| 40k (Decomposition) | Application description only |
| 30k (CTB Placement) | Integration templates (DOPPLER, HEIR, etc.) |
| 20k (IMO Definition) | PRD templates |
| 10k (Process Logic) | ADR templates |
| 5k (Execution) | PR templates, Checklists |

---

## Template Versioning

Templates are versioned with the hub. When updating templates:

1. Update the template in `templates/`
2. Update version in `global-config/imo_global_config.yaml`
3. Document changes in ADR if architectural

---

## Integration with imo-creator

These templates are derived from the `imo-creator` master template repository. To update from source:

```bash
# Pull latest doctrine from imo-creator
git remote add imo-creator https://github.com/djb258/imo-creator.git
git fetch imo-creator
git checkout imo-creator/main -- templates/
```

---

## Questions?

- Hub & Spoke Questions: Read `doctrine/HUB_SPOKE_ARCHITECTURE.md`
- Altitude Questions: Read `doctrine/ALTITUDE_DESCENT_MODEL.md`
- Tool Questions: Read `integrations/TOOLS.md`
