# **Future Implementation**

<details>
  <summary><strong>Table of Contents</strong></summary>

- [Planned Work](#planned-work)

</details>

## Planned Work

Planned features that are referenced in the documentation but not fully implemented yet.

| Area | Feature                          | Status        | Notes                                                                                                            |
| :--- | :------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------- |
| PACE | `matchField` support             | To Be Started | Column exists in schema but matching currently only runs against the transaction description.                    |
| PACE | `priority`-based early stopping  | To Be Started | Rules are loaded ordered by priority, but the engine still evaluates all rules. No short-circuit on first match. |
| PACE | Confidence scoring               | To Be Started | Documented in `docs/PACE Engine.md`. Not active in production.                                                   |
| PACE | Fuzzy merchant matching          | To Be Started | Current system supports regex + keyword fallback only.                                                           |
| PACE | Learning from manual corrections | To Be Started | Manual tag edits do not feed back into automatic rule generation.                                                |

- 1. Database backup on new query upload to database.
---

**Previous file:** [← API Reference](API%20Reference.md)

**Next file:** [Setup Guide](Setup%20Guide.md) →
