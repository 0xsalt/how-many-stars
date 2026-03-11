## Service Dashboard Integration

This project deploys to **service-dashboard** for visibility, health monitoring, and dashboard registration.

**Skill:** `~/.claude/skills/ServiceDashboard` (symlinked from `~/local/projects/service-dashboard/skill`)

**Manifest:** `service-dashboard.yaml` in this project root defines the service metadata.

**Deploy to service-dashboard:**
- Dev mode: `make dev` auto-registers via `_register` target
- Docker release: `bun ~/.claude/skills/ServiceDashboard/Tools/deploy-router.ts` (reads `service-dashboard.yaml`)
- Manual: `bun ~/.claude/skills/ServiceDashboard/Tools/add-service.ts --name how-many-stars --type node --port auto`

**Key tools in ServiceDashboard skill:**
- `deploy-router.ts` — Reads `service-dashboard.yaml` and routes to correct deploy method
- `add-service.ts` — Register/update a service in the registry
- `update-dashboard.ts` — Refresh the hub dashboard after registry changes
- `manifest-deploy.ts` — Full manifest-based deployment for Docker services

**Testing:** Follow global testing rules in `~/.claude/CLAUDE.md` (Service Dashboard Testing section).

