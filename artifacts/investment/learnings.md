# Learnings — investment feature

## Task Execution Order

1. DB schema + lib/db (no deps)
2. Types (no deps)
3. Ticker service + UI
4. Transaction service + forms (CRUD)
5. Portfolio calculations + dashboard
6. Price refresh (Yahoo Finance + manual fallback)
7. Plan creation + list
8. Plan detail + daily entry
9. Transaction form auto-fill (hook + context banner)

**Rationale:** Dependency order followed CLAUDE.md architecture layers (types → lib → services → hooks → components → app). Plan service placed after transaction service because it imports `createTransaction`. Auto-fill hook last because it depends on plan + price services both existing.

## Decisions & Pivots

### Plan remainingAmount formula
**Initial:** `completedDays * dailyAmount` (target spend)  
**Correct:** `totalAmount - totalSpent` (actual spend)  
**Why caught late:** Tests used round numbers where actual spend matched target exactly. Only visible when off-target prices used.  
→ Applied rule: financial formula tests must include off-target input scenarios.

### updateTransactionAction missing sell guard
**Bug:** Create action validated sell qty ≤ holdings; update action did not.  
**Fix:** Baseline = `calcCurrentQuantity` adjusted to exclude the existing transaction's qty.  
→ Applied rule: create/update action pairs must mirror the same guards.

### PlanNewForm native `<select>`
**Bug:** Used raw HTML `<select>` instead of shadcn `<Select>`, violating shadcn-guard rule.  
**Fix:** Replaced with shadcn Select component.  
→ Applied rule: self-review scan for native form elements before committing.

### N+1 in getAllPlans
**Initial:** Each plan loaded its own progress via a separate DB query.  
**Fixed:** Single aggregated JOIN (`COUNT(*), SUM(quantity*price), SUM(quantity) GROUP BY plan_id`) merged in memory.

### calcPortfolioSummary double calcHoldings
**Initial:** `calcActiveHoldings()` + `calcClosedPositions()` each called `calcHoldings()` (8 queries total).  
**Fixed:** Call `calcHoldings()` once, split in-memory (4 queries total).

### Plan detail page fetching all transactions
**Initial:** `getAllTransactions().filter(tx => tx.planId === id)` — loads entire table.  
**Fixed:** Added `getTransactionsByPlanId(planId)` to transaction service (SQL WHERE clause).

## Code Review Findings Applied

| ID | Severity | Status | Note |
|---|---|---|---|
| C1 | Critical | Skipped | Gross P&L is intentional design — fees shown as separate line item |
| C2 | Critical | Fixed | remainingAmount formula corrected to totalAmount - totalSpent |
| C3 | Critical | Skipped | TOCTOU race impossible in single-user SQLite sequential write; redundant outer check acceptable |
| C4 | Critical | Fixed | updateTransactionAction now validates sell quantity |
| I1 | Important | Fixed | N+1 → aggregated JOIN |
| I2 | Important | Fixed | getTransactionsByPlanId added |
| I3 | Important | Fixed | calcPortfolioSummary calls calcHoldings once |
| I4 | Important | Skipped | Unbounded Promise.all acceptable for ≤10 tickers |
| I5 | Important | Fixed | Ticker ID format validation added |
| I6 | Important | Fixed | saveManualPricesAction validates tickerExists |
| I7 | Important | Fixed | E2E smoke test title fixed |
| S1 | Suggestion | Fixed | DailyEntryForm default date uses local time |
| S4 | Suggestion | Fixed | PlanNewForm uses shadcn Select |
| S7 | Suggestion | Fixed | Date format validation in transaction actions |

## What Worked Well

1. **Vertical slicing** — each task was end-to-end testable immediately. No integration failures at the end.
2. **`setDb()` injection pattern** — real SQLite integration tests, no mocking. Caught schema issues early.
3. **RSC/SA boundary** — enforced by architecture layering. Reviewer confirmed zero violations.
4. **Aggregated SQL** for portfolio calculations — single pass over data, no N+1 at the holdings level.

## What Didn't Work

1. **Financial formula test coverage** — round-number tests masked a wrong formula for 3 tasks before review.
2. **Action parity** — create/update diverged silently on sell validation.
3. **Shadcn self-check** — native `<select>` slipped through pre-commit review.

## Promoted Rules (applied: rule)

- `feedback_action_parity.md` — create/update actions must mirror validations
- `feedback_financial_formula_tests.md` — off-target input scenarios required
- `feedback_shadcn_self_check.md` — scan for native form elements before committing
