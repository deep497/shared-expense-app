# AI Usage

## Tools Used

- ChatGPT
- Gemini / Antigravity
- GitHub Copilot

## Example Prompts

- Generate Express routes for group management
- Implement expense balance calculation
- Create React pages for dashboard and groups

---

## AI Mistakes Caught

### Mistake 1

Issue:
Membership validation ignored join and leave dates.

Fix:
Added:

joined_at <= expense_date

and

left_at IS NULL OR left_at >= expense_date

---

### Mistake 2

Issue:
Settlement engine returned only net balances.

Fix:
Implemented simplified settlement generation.

---

### Mistake 3

Issue:
CSV importer assumed a fixed format.

Fix:
Added anomaly reporting and validation checks.