# Tools

Python scripts that do the actual work — calling APIs, transforming data,
generating reports, sending email.

Principles:
- Each tool does **one thing well** and can be reused by any workflow.
- Predictable and testable — no guessing, no hallucinating.
- **Check here before building anything new.** Reuse first.
- Secrets come from `.env`, never hard-coded.
