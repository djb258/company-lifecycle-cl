# shadcn/ui Component Usage Audit

**Date**: 2026-02-16
**Trigger**: Repo Housekeeping Phase 3
**Total Components**: 48
**Used**: 6
**Unused**: 42

---

## USED (6)

| Component | Imported By |
|-----------|------------|
| `accordion.tsx` | `src/ui/components/company/LifecycleAccordion.tsx` |
| `badge.tsx` | `src/ui/components/company/CompanyHeader.tsx` |
| `sonner.tsx` | `src/ui/App.tsx` |
| `toast.tsx` | `src/app/hooks/use-toast.ts` |
| `toaster.tsx` | `src/ui/App.tsx` |
| `tooltip.tsx` | `src/ui/App.tsx` |

## UNUSED (42)

| Component | Notes |
|-----------|-------|
| `alert-dialog.tsx` | |
| `alert.tsx` | |
| `aspect-ratio.tsx` | |
| `avatar.tsx` | |
| `breadcrumb.tsx` | |
| `button.tsx` | Only imported by other ui/components/ui/ files |
| `calendar.tsx` | |
| `card.tsx` | |
| `carousel.tsx` | |
| `chart.tsx` | |
| `checkbox.tsx` | |
| `collapsible.tsx` | |
| `command.tsx` | |
| `context-menu.tsx` | |
| `dialog.tsx` | Only imported by command.tsx |
| `drawer.tsx` | |
| `dropdown-menu.tsx` | |
| `form.tsx` | Only imports label.tsx |
| `hover-card.tsx` | |
| `input-otp.tsx` | |
| `input.tsx` | Only imported by sidebar.tsx |
| `label.tsx` | Only imported by form.tsx |
| `menubar.tsx` | |
| `navigation-menu.tsx` | |
| `pagination.tsx` | |
| `popover.tsx` | |
| `progress.tsx` | |
| `radio-group.tsx` | |
| `resizable.tsx` | |
| `scroll-area.tsx` | |
| `select.tsx` | |
| `separator.tsx` | Only imported by sidebar.tsx |
| `sheet.tsx` | Only imported by sidebar.tsx |
| `sidebar.tsx` | |
| `skeleton.tsx` | Only imported by sidebar.tsx |
| `slider.tsx` | |
| `switch.tsx` | |
| `table.tsx` | |
| `tabs.tsx` | |
| `textarea.tsx` | |
| `toggle-group.tsx` | |
| `toggle.tsx` | Only imported by toggle-group.tsx |

## Recommendation

42 of 48 shadcn/ui components are Lovable scaffold dump with zero application usage.
Pruning candidates should be reviewed before deletion — some (button, card, input, form, dialog, table) are likely needed as the UI grows. Others (carousel, menubar, navigation-menu, input-otp, etc.) are unlikely to be used.

**Next step**: Owner-approved selective deletion in a future housekeeping pass.
