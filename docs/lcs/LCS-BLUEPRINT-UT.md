# LCS Blueprint UT
## Company Lifecycle Architecture For Lead Campaign System

## 1. Identity

| Field | Value |
| --- | --- |
| ID | CL-LCS-BLUEPRINT |
| Name | Lead Campaign System Blueprint |
| Medium | process / architecture |
| Business Silo | company lifecycle |
| CTB Position | barton-enterprises/company-lifecycle/lcs |
| ORBT | BUILD |
| Authority | Company Lifecycle + Atlas + BS Law |
| Last Modified | 2026-05-05 |
| Paired YAML | `LCS-BLUEPRINT.yaml` |

### HEIR

| Field | Value |
| --- | --- |
| sovereign_ref | company-lifecycle |
| hub_id | lcs |
| ctb_placement | barton-enterprises/company-lifecycle/lcs |
| imo_topology | middle |
| cc_layer | CC-02 blueprint |
| services | Supabase/Neon, Cloudflare, Mailgun, HeyReach, Barton-Processes, LBB, Mission Control |
| secrets_provider | Doppler |
| acceptance_criteria | The LCS blueprint explains the architecture and points operational execution to Barton-Processes Process 100. |

### BS Law Conformance

This artifact carries both BS Law arms.

| BS Law Arm | This File Carries |
| --- | --- |
| Book Law structure | Durable Markdown UT, paired YAML, identity, purpose, resources, IMO, schema, DMJ, gates, trace, logbook. |
| Three Layers Spine content | HEIR, ORBT, CTB placement, IMO topology, constants/variables, execution trace, promotion path. |

Outside-Dewey stream:

| Field | Value |
| --- | --- |
| species | UT-Body |
| sovereign_ref | company-lifecycle |
| hub_id | lcs |
| ctb_placement | barton-enterprises/company-lifecycle/lcs |
| imo_topology | middle |
| cc_layer | CC-02 |
| orbt | BUILD |

Inside-Fractal stream:

| Field | Value |
| --- | --- |
| blueprint_id | CL-LCS-BLUEPRINT |
| operational_process | Barton-Processes `factory/cl/100-lcs-pipeline` |
| process_number | 100 |
| process_name | LCS Pipeline |
| aviation_rule | builder != auditor |
| p_equals_1 | blueprint links all LCS architecture to executable Process 100 steps without making Company Lifecycle the execution surface |

## 2. Purpose

Company Lifecycle is the blueprint home for the LCS. It explains what LCS is, why it exists, how it fits into the company lifecycle, what data it owns or references, and how outreach signals flow into execution.

Barton-Processes is the execution home. Process 100 lives there because it moves data, fires emails, writes events, and produces operational evidence.

This split prevents two failures:

| Failure | Prevention |
| --- | --- |
| Blueprint scattered inside execution files | Company Lifecycle owns LCS architecture. |
| Execution hidden inside architecture docs | Barton-Processes owns Process 100 movement and fire instructions. |

## 3. Resources

| Resource | Role |
| --- | --- |
| `docs/lcs/DEPLOY_CHECKLIST.md` | Existing LCS deployment and smoke-test checklist. |
| `docs/lcs/ENV_MANIFEST.md` | LCS environment and secret manifest. |
| `docs/lcs/LCS-BLUEPRINT.yaml` | Machine-readable companion to this UT. |
| `Barton-Processes/factory/cl/100-lcs-pipeline/PROCESS-UT.md` | Operational Process 100 UT. |
| `Barton-Processes/factory/cl/100-lcs-pipeline/PROCESS-100-STEP-BY-STEP.md` | Process 100 execution runbook. |
| `Barton-Processes/factory/cl/100-lcs-pipeline/PROCESS-100-STEP-BY-STEP.yaml` | Process 100 machine runbook. |
| `Barton-Processes/factory/cl/100-lcs-pipeline/DOMAIN-MAINTENANCE.md` | Domain rotation and protected-domain control. |
| Atlas `KEY.md` | Vocabulary. |
| Atlas `BS_LAW.md` | Book + Spine conformance. |

## 4. IMO

### Input

| Input | Source |
| --- | --- |
| Sovereign company identity | Company Lifecycle |
| Lifecycle stage | Company Lifecycle |
| Outreach activation | CL promotion into Outreach |
| People intelligence | Outreach People sub-hub / Process 200/201/202 |
| DOL intelligence | Outreach DOL sub-hub |
| Social/blog/content intelligence | Outreach SP/blog/content sub-hub / Process 300 |
| Service-agent coverage | Outreach territory/coverage source |
| Sending domain policy | Process 100 domain maintenance |

### Middle

LCS is the campaign system sitting under Company Lifecycle and feeding outreach execution. It gathers approved company, people, DOL, content, and coverage signals, turns those into campaign pressure, and hands operational execution to Process 100.

The architecture flow:

1. Company Lifecycle owns company identity and lifecycle stage.
2. CL activates Outreach when a company is eligible for outreach.
3. Outreach sub-hubs maintain people, DOL, SP/blog/content, and coverage data.
4. Those sub-hubs create or refresh signals.
5. Process 100 consumes eligible signals.
6. Process 100 compiles CID, constructs SID, delivers MID, receives feedback, and writes evidence.
7. Feedback returns to LCS and CL-facing visibility through LBB and Mission Control.

### Output

| Output | Destination |
| --- | --- |
| LCS architecture reference | Company Lifecycle docs |
| Operational execution contract | Barton-Processes Process 100 |
| Fire readiness / evidence | LBB + Mission Control |
| Lifecycle feedback | Company Lifecycle / Outreach visibility |

## 5. Data Schema

Blueprint-level data map:

| Layer | Example Tables / Artifacts | Owner |
| --- | --- | --- |
| Company identity | `company_unique_id`, company lifecycle records | Company Lifecycle |
| Outreach company target | target companies, coverage, service-agent assignment | Barton-Processes / Outreach |
| People | people slots, verified emails, LinkedIn data | Outreach People processes |
| DOL | plan data, 5500 data, renewal/financial signals | Outreach DOL process |
| Content/SP | blog/social/content signals | Outreach content processes |
| LCS signals | signal queue / campaign pressure rows | Process 100 execution |
| Campaign outputs | CID, SID, MID, event, err0 | Process 100 execution |
| Evidence | LBB records, Mission Control process/map layer | LBB / Mission Control |

## 6. DMJ

| Define | Map | Join |
| --- | --- | --- |
| CL | Identity and lifecycle authority | Joins to outreach by company ID |
| Outreach | Sub-hub layer under CL | Joins to Process 100 by eligible signals |
| Process 100 | Execution process | Joins to LCS blueprint through this UT |
| CID | Company intelligence dossier | Company + DOL + people + signal |
| SID | Sendable campaign/message | CID + role + voice/frame |
| MID | Message delivery | SID + recipient + domain |
| Feedback | Delivery/engagement response | MID events back to LCS/CL visibility |

## 7. Constants & Variables

Constants:

| Constant | Value |
| --- | --- |
| Blueprint home | Company Lifecycle `docs/lcs` |
| Execution home | Barton-Processes `factory/cl/100-lcs-pipeline` |
| Process number | 100 |
| Protected domains | `svg.agency`, `svgwv.com` |
| LCS output sequence | CID -> SID -> MID -> event/feedback |
| Evidence surfaces | LBB + Mission Control |

Variables:

| Variable | Owner |
| --- | --- |
| Current runtime implementation | Barton-Processes Process 100 |
| Active domain capacity | Domain maintenance process |
| Pending signal volume | Upstream processes |
| Daily fire cap | Operator / Process 100 ORBT state |
| Promotion to OPERATE | Auditor after controlled fires |

## 8. Stop Conditions

| Stop | Reason |
| --- | --- |
| Blueprint contradicts Barton-Processes execution | Execution source drift |
| Process 100 fires without CL/Outreach signal source | Blind send |
| Protected domain enters outreach rotation | Main-domain burn risk |
| Feedback does not reach LBB/Mission Control | Open loop |
| Company identity is not CL-governed | Sovereign identity violation |

## 9. Verification

Blueprint verification:

| Check | Expected |
| --- | --- |
| This UT exists in `company-lifecycle-cl/docs/lcs` | yes |
| Paired YAML exists | yes |
| BS Law arms are present | yes |
| Process 100 execution points to Barton-Processes | yes |
| Protected domains are documented | yes |
| LBB and Mission Control are evidence surfaces | yes |

Operational verification is not performed here. It happens in Barton-Processes Process 100.

## 10. Analytics

| Metric | Target |
| --- | --- |
| LCS architecture docs centralized in Company Lifecycle | 100 percent |
| Process 100 execution docs centralized in Barton-Processes | 100 percent |
| Cross-reference drift | 0 |
| Protected-domain violations | 0 |
| Process 100 fires without evidence | 0 |

## 11. Execution Trace

Blueprint trace:

1. Read Atlas KEY and BS Law.
2. Read Company Lifecycle LCS docs.
3. Read Barton-Processes Process 100 execution docs.
4. Confirm blueprint/execution split.
5. Update Company Lifecycle blueprint only.
6. Update Barton-Processes execution only when operational steps change.
7. Audit cross-reference drift.

## 12. Logbook

| Date | Action |
| --- | --- |
| 2026-05-05 | Created LCS Blueprint UT in Company Lifecycle to centralize LCS architecture and point execution to Barton-Processes Process 100. |

## 13. Fleet Failure Registry

| Pattern | Failure | Prevention |
| --- | --- | --- |
| Blueprint/execution collapse | Same doc tries to explain architecture and run the process | Company Lifecycle owns blueprint; Barton-Processes owns execution |
| Runtime repo drift | External repo treated as source of truth | Process 100 execution folder is authoritative |
| Main-domain burn | Protected domains used for cold outreach | Domain maintenance gate |
| Open feedback loop | Sends happen without evidence | LBB + Mission Control required |

## 14. Session Log

| Date | Note |
| --- | --- |
| 2026-05-05 | Dave clarified Company Lifecycle is the blueprint/doc home for LCS, while Barton-Processes is where Process 100 moves datasets and gets work done. |

