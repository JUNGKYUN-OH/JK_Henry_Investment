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

---

# Learnings — redesign phase (무한매수법)

## What Changed

Redesigned plan flows: dedicated buy/sell pages, fee-rate on plan level, edit transaction, `splits`/`targetReturn`/`feeRate` DB columns, tiered sell signals, home screen TodayTaskList, progress display as `completedSplits / splits`.

## Decisions & Pivots

### DB migration chain: SQLite → Turso → Vercel Postgres
Three consecutive DB switches across the project. Final stack is `@neondatabase/serverless` (Vercel Postgres).  
**Why:** better-sqlite3 can't run in Next.js edge/serverless; Turso added latency and auth friction; Neon integrates directly with Vercel Postgres.  
**Lesson:** Lock the DB driver before designing services. The `DbClient` interface abstraction (`execute` / `batch`) made swapping drivers cheap — only `lib/db.ts` changed each time.

### `computeSellSignal` extracted to `lib/sellSignal.ts`
`services/plan.ts` imports the DB client. `SellBanner.tsx` is a client component that needed `computeSellSignal`. Importing from `services/plan.ts` dragged the DB client into the browser bundle.  
**Fix:** Extracted the pure function to `lib/sellSignal.ts` (no DB import). `services/plan.ts` re-exports it for convenience.  
**Rule:** Pure domain logic used in client components must live in `lib/`, not `services/`.

### Fee model: plan-level feeRate, buy fee always 0
Original design had per-transaction fee input. User clarified: buy has no fee; sell fee = `price × qty × feeRate` from the plan.  
**Impact:** Removed fee field from buy form, removed fee field from sell form, added `fee_rate` column to plans. `recordSellAction` reads `plan.feeRate` and computes fee server-side.  
**Lesson:** Financial business rules (who pays fee, when, how much) must be confirmed before UI is built — they touch every layer.

### UTC vs KST date bug
Server computes `today` as UTC string. Between midnight and 09:00 KST, the server returns yesterday's date, causing today's buy form to pre-fill the wrong date.  
**Fix:** Move `today` to client side: `new Date().toLocaleDateString('en-CA')`.  
**Rule:** User-facing "today" dates must be computed client-side with locale formatting. Never rely on server UTC for date defaults.

### Oversell guard placement
`recordSell` inserted the transaction row before checking `data.quantity > plan.holdingQty`. If the guard failed the row was already written.  
**Fix:** Moved guard before the INSERT.  
**Rule:** Validate before mutating. All quantity/balance guards belong at the top of the function, not after DB writes.

### `isDuplicateDate` excludeTxId for edit flow
Edit transaction needed to check for duplicate dates while excluding the transaction being edited itself.  
**Fix:** Added optional `excludeTxId` parameter to `isDuplicateDate`. Same pattern as Task 5's oversell guard — create/update must mirror the same validations.  
**applied: rule** — aligns with `feedback_action_parity.md`

### TOCTOU duplicate check removal
`recordBuyAction` called `isDuplicateDate` then `recordDailyEntry` which also calls it internally. Outer check was redundant and created TOCTOU window.  
**Fix:** Removed outer call; rely solely on the inner check inside `recordDailyEntry`.

### Progress display: three misunderstandings
User asked for "X/40" progress. First attempt used `formatUSD` (showed `$20.00 / $40.00`). Second attempt used `Math.round(dollars)` (showed `3000 / 20000`). Third attempt was correct: `completedSplits = Math.round(usedAmount / dailyAmount)` → shows `6/40`.  
**Lesson:** When a display format question involves derived numbers, confirm the formula with a concrete example before implementing. "X/40" is ambiguous — it could be buy count, dollar amount, or dollar-to-split ratio.

### Label accuracy: "분할 횟수(일)" → "분할 횟수"
Original label implied one split per day. User clarified multiple buys can happen on the same day.  
**Lesson:** Domain label accuracy matters early. Rename the column/label at spec time, not after implementation.

## Code Review Findings Applied (redesign phase)

| Severity | Finding | Status |
|---|---|---|
| Critical | `computeSellSignal` in client bundle via services/plan.ts DB import | Fixed — extracted to lib/sellSignal.ts |
| Critical | Oversell guard after INSERT | Fixed — moved before INSERT |
| Important | `isDuplicateDate` no excludeTxId in edit action | Fixed |
| Important | Redundant outer TOCTOU duplicate check | Fixed |
| Important | `holdingQty` missing from PlanWithProgress type | Fixed — committed to types/index.ts |

## What Worked Well

1. **`DbClient` interface abstraction** — swapped DB drivers three times with zero service-layer changes.
2. **Dedicated buy/sell pages (RSC + SA)** — clean separation; each page owns its own action file. No shared mutation logic to untangle.
3. **Vertical slice per feature** — buy flow, sell flow, edit flow each landed as independent, testable units.

## What Didn't Work

1. **Formula confirmation before coding** — progress display required three iterations. A concrete "given $3000 spent of $20000 total with $500/split, show 6/40" example would have avoided two wrong implementations.
2. **DB column missing from migration** — `splits` column added to initSchema but ALTER TABLE not in `/api/migrate`. Caught only after Vercel deploy. Migration endpoint and initSchema must be kept in sync.
3. **Type missing from committed file** — `holdingQty` added locally, masked by `.next` cache, only caught at Vercel build. Lesson: always verify `git diff` includes all local type changes before pushing.

## Insights for Next Feature

- For any display format involving a calculated number, ask for one concrete example (input → output) before writing code.
- Keep `/api/migrate` ALTER TABLE statements in sync with `initSchema` in `lib/db.ts` — they are two representations of the same schema.
- When a pure function is needed by a client component, put it in `lib/` from the start. Moving it later costs a refactor commit.

## Promoted Rules (applied: not-yet)

- Formula display format: confirm with concrete example before implementing
- Migration/initSchema sync: ALTER TABLE in `/api/migrate` must mirror `lib/db.ts` initSchema
