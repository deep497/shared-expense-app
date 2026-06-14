# Decision Log

## Membership History

Options:
1. Delete members
2. Keep historical records

Decision:
Keep joined_at and left_at dates.

Reason:
Required to support Meera leaving and Sam joining later.

---

## Debt Settlement

Options:
1. Show raw balances
2. Generate simplified settlements

Decision:
Generate simplified settlements.

Reason:
Matches Aisha's requirement:
"Who pays whom, how much."

---

## CSV Import

Options:
1. Auto-correct anomalies
2. Surface anomalies

Decision:
Surface anomalies.

Reason:
Avoid silent data modification.

---

## Currency Handling

Options:
1. Ignore currencies
2. Store exchange rate

Decision:
Store exchange_rate.

Reason:
Supports USD expenses.