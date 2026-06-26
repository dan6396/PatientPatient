# CLAUDE.md — Project Rules

The full philosophy lives in [claude_en.md](claude_en.md). This file holds the
concrete, project-specific rules. Read both before starting work.

## Operating model: separate thinking from doing

- **Workflows** (`workflows/`) — plain-language instructions for each task.
- **Agent** (you) — read the workflow, pick the right tool, execute, report.
- **Tools** (`tools/`) — Python scripts that do the actual work.

Pattern, every time: **Read the workflow → Pick the right tool → Execute → Deliver.**

## Rules

- **Reuse before building.** Check `tools/` first. Only build new when nothing fits.
- **Fix forward.** On a break: read the error → fix the tool → confirm → update the
  workflow so it can't happen the same way twice.
- **Ask before spending.** If a fix touches paid APIs or credits, ask before re-running.
- **Keep workflows alive,** but never rewrite or delete one without permission.
- **Report like a human.** Plain language first; name the files you'll create or change.

## Security

- Secrets live in `.env` and nowhere else — not in tools, workflows, or this file.
- `.env`, `credentials.json`, `token.json` stay in `.gitignore`.
- Run a security check before deploying. Flag exposed keys or open endpoints.

## Layout

```
workflows/   # Plain-language task instructions
tools/       # Python scripts that execute actions
.tmp/        # Scratch space — disposable, gitignored
.env         # Secrets (gitignored; copy from .env.example)
```
