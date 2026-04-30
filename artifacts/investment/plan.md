# Henry Ledger 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 저장소 | SQLite (`better-sqlite3`) | 단일 사용자, 로컬 파일, 서버 불필요 |
| 변형(Mutation) | Next.js Server Actions | 별도 API 레이어 불필요 |
| 읽기 | React Server Components | 서버 사이드 데이터 페칭, 클라이언트 번들 최소화 |
| Yahoo Finance | `yahoo-finance2` Route Handler proxy | CORS 회피, 서버 사이드 전용 실행 |
| 평균단가 계산 | (Σ 매수단가 × 매수수량) ÷ Σ 매수수량 | spec 불변 규칙 — 평균단가법 |
| 계획 평균단가 | planId 일치 거래만 집계 | spec 불변 규칙 — 계획 평균단가 독립 |
| 계획 연결 거래 수정·삭제 | 허용 + 계획 재계산 | 사용자 결정 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| `henry-ledger.db` | 로컬 SQLite 파일 | `lib/db.ts` | Task 1 |
| `better-sqlite3` | npm 패키지 | `package.json` | Task 1 |
| `yahoo-finance2` | npm 패키지 | `package.json` | Task 6 |

## 데이터 모델

### Ticker
- id: TEXT PRIMARY KEY (ticker 심볼, 예: "SPY")
- createdAt: TEXT (ISO 8601)

### Transaction
- id: TEXT PRIMARY KEY (uuid v4)
- tickerId: TEXT → Ticker (required)
- type: TEXT ('buy' | 'sell')
- date: TEXT (YYYY-MM-DD)
- quantity: REAL (> 0)
- price: REAL (> 0)
- fee: REAL (≥ 0, default 0)
- planId: TEXT nullable → Plan
- createdAt: TEXT (ISO 8601)

### Plan
- id: TEXT PRIMARY KEY (uuid v4)
- tickerId: TEXT → Ticker
- totalAmount: REAL (> 0)
- dailyAmount: REAL (= totalAmount / 40, 생성 시 고정)
- status: TEXT ('active' | 'completed')
- startDate: TEXT (YYYY-MM-DD)
- createdAt: TEXT (ISO 8601)

### PriceCache
- tickerId: TEXT PRIMARY KEY → Ticker
- price: REAL
- fetchedAt: TEXT (ISO 8601)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | 전체 | Server Actions, RSC/Client 경계, Route Handler 패턴 |
| shadcn | 전체 | UI 컴포넌트 사용 규칙 (variant prop, semantic token 우선) |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/index.ts` | New | Task 1 |
| `lib/db.ts` | New | Task 1 |
| `components/layout/AppShell.tsx` | New | Task 1 |
| `app/layout.tsx` | Modify | Task 1 |
| `services/ticker.ts` | New | Task 2 |
| `components/tickers/TickerManager.tsx` | New | Task 2 |
| `app/tickers/page.tsx` | New | Task 2 |
| `app/tickers/actions.ts` | New | Task 2 |
| `services/transaction.ts` | New | Task 3 |
| `services/portfolio.ts` | New | Task 3 |
| `components/transactions/TransactionForm.tsx` | New | Task 3 |
| `components/dashboard/HoldingsTable.tsx` | New | Task 3 |
| `app/transactions/page.tsx` | New | Task 3 |
| `app/transactions/actions.ts` | New | Task 3 |
| `app/page.tsx` | Modify | Task 3 |
| `services/portfolio.ts` | Modify | Task 4 |
| `components/dashboard/ClosedPositionsTable.tsx` | New | Task 4 |
| `components/dashboard/PortfolioSummary.tsx` | New | Task 4 |
| `app/transactions/actions.ts` | Modify | Task 4 |
| `components/transactions/TransactionList.tsx` | New | Task 5 |
| `components/transactions/TransactionForm.tsx` | Modify | Task 5 |
| `app/transactions/actions.ts` | Modify | Task 5 |
| `services/price.ts` | New | Task 6 |
| `app/api/prices/route.ts` | New | Task 6 |
| `components/dashboard/PriceRefreshButton.tsx` | New | Task 6 |
| `components/dashboard/ManualPriceInput.tsx` | New | Task 6 |
| `services/plan.ts` | New | Task 7 |
| `components/plans/PlanList.tsx` | New | Task 7 |
| `app/plans/page.tsx` | New | Task 7 |
| `app/plans/actions.ts` | New | Task 7 |
| `services/plan.ts` | Modify | Task 8 |
| `components/plans/PlanDetail.tsx` | New | Task 8 |
| `components/plans/DailyEntryForm.tsx` | New | Task 8 |
| `app/plans/[id]/page.tsx` | New | Task 8 |
| `app/plans/[id]/actions.ts` | New | Task 8 |
| `hooks/usePlanAutoFill.ts` | New | Task 9 |
| `components/transactions/TransactionForm.tsx` | Modify | Task 9 |

## Tasks

### Task 1: DB 초기화 + 앱 셸

- **담당 시나리오**: 인프라 — 시나리오 직접 담당 없음 (전체 시나리오의 공통 전제)
- **크기**: M (4 파일)
- **의존성**: None
- **참조**:
  - next-best-practices — directives, rsc-boundaries
  - shadcn — styling, composition
- **구현 대상**:
  - `types/index.ts` — Ticker, Transaction, Plan, PriceCache 타입 정의
  - `lib/db.ts` — `better-sqlite3` 초기화, 스키마 생성 (CREATE TABLE IF NOT EXISTS 4개), DB 싱글톤 export
  - `components/layout/AppShell.tsx` — Sidebar (desktop) + BottomNav (mobile) 레이아웃 셸, `'use client'`
  - `app/layout.tsx` — AppShell 통합, 전체 페이지 래핑
- **수용 기준**:
  - [ ] `bun run dev` 실행 → 앱이 로드되고 대시보드·거래 내역·투자 계획·티커 관리 4개 탭이 네비게이션에 표시된다
  - [ ] 브라우저 창 너비 ≥ 768px: 좌측 사이드바에 네비게이션이 표시된다
  - [ ] 브라우저 창 너비 < 768px: 하단 네비게이션 바에 4개 탭이 표시된다
  - [ ] `henry-ledger.db` 파일이 프로젝트 루트에 생성된다
- **검증**:
  - `bun run build`
  - Browser MCP — `http://localhost:3000` 방문, 4개 탭 확인, 창 크기 조절로 레이아웃 전환 확인, 증거 `artifacts/investment/evidence/task-1.png` 저장

---

### Task 2: 티커 등록·삭제

- **담당 시나리오**: Scenario 1 (full), Scenario 10 (full)
- **크기**: M (4 파일)
- **의존성**: Task 1 (DB, AppShell)
- **참조**:
  - next-best-practices — data-patterns, error-handling
  - shadcn — forms
- **구현 대상**:
  - `services/ticker.ts` — `getAllTickers()`, `addTicker(id)`, `deleteTicker(id)`, `hasTransactions(id)` (DB 직접 쿼리)
  - `components/tickers/TickerManager.tsx` — ticker 입력 폼 + 목록 통합 Client Component (`'use client'`)
  - `app/tickers/page.tsx` — RSC, 티커 목록 조회 후 TickerManager 전달
  - `app/tickers/actions.ts` — `addTickerAction`, `deleteTickerAction` Server Actions
  - `services/ticker.test.ts` (colocated)
  - `components/tickers/TickerManager.test.tsx` (colocated)
- **수용 기준**:
  - [ ] "SPY" 입력 → 목록에 "SPY" 행이 추가된다 (S1)
  - [ ] 이미 등록된 "SPY"를 재입력 → "이미 등록된 티커입니다" 에러 메시지가 표시된다 (S1)
  - [ ] 빈 값으로 추가 시도 → 추가 버튼이 비활성화된다 (S1)
  - [ ] SPY에 거래 기록이 있을 때 삭제 시도 → "거래 기록이 있는 종목은 삭제할 수 없습니다" 에러 메시지가 표시된다 (S10)
  - [ ] SPY에 거래 기록이 없을 때 삭제 시도 → 확인 다이얼로그 후 목록에서 제거된다 (S10)
- **검증**:
  - `bun run test -- ticker`
  - Browser MCP — `/tickers` 방문, 티커 추가·중복·삭제 동작 확인, 증거 `artifacts/investment/evidence/task-2.png` 저장

---

### Task 3: 매수 거래 입력 + 대시보드 보유 현황

- **담당 시나리오**: Scenario 2 (계획 연동 자동 채움 제외), Scenario 3 (full)
- **크기**: M (5 파일 + `app/page.tsx` 소규모 수정)
- **의존성**: Task 2 (티커 목록)
- **참조**:
  - next-best-practices — data-patterns, async-patterns
  - shadcn — forms, composition
- **구현 대상**:
  - `services/transaction.ts` — `createTransaction(data)`, `getAllTransactions(tickerId?)`, `getTransactionById(id)`
  - `services/portfolio.ts` — `calcHoldings()`: 종목별 수량·평균단가·투자금액·총 수수료 집계 (매수 거래만, 평균단가법)
  - `components/transactions/TransactionForm.tsx` — 거래 입력 폼 (`'use client'`), 티커 select → 목록에서 선택, 매수/매도 구분, 수량·단가·수수료·날짜 필드, 필드별 validation 에러 표시
  - `components/dashboard/HoldingsTable.tsx` — 보유 중 종목 테이블 RSC (수량, 평균단가, 투자금액)
  - `app/transactions/page.tsx` — RSC, 티커 목록 + 거래 목록 조회 후 TransactionForm 전달
  - `app/transactions/actions.ts` — `createTransactionAction` Server Action (validation 포함)
  - `app/page.tsx` — Modify: HoldingsTable + 포트폴리오 요약(총 수수료) 추가
  - `services/transaction.test.ts`, `services/portfolio.test.ts` (colocated)
- **수용 기준**:
  - [ ] SPY 매수(10주 @ $450.00, 수수료 $2.50) 저장 후 거래 목록에 SPY 매수 1건이 표시된다 (S2)
  - [ ] 대시보드 SPY 행: 수량 10주, 평균단가 $450.00, 투자금액 $4,500.00이 표시된다 (S2)
  - [ ] 포트폴리오 요약에 총 수수료 $2.50이 별도 항목으로 표시된다 (S2)
  - [ ] 필수 필드(티커·구분·수량·단가·날짜) 중 하나라도 비어 있을 때 저장 시도 → 해당 필드 아래 에러 메시지가 표시된다 (S2)
  - [ ] 수량·단가에 0 이하 값 입력 → "0보다 큰 값을 입력하세요" 에러 메시지가 표시된다 (S2)
  - [ ] SPY 10주 @ $430.00 추가 저장 후 수량 20주, 평균단가 $440.00, 투자금액 $8,800.00이 표시된다 (S3)
- **검증**:
  - `bun run test -- transaction`
  - `bun run test -- portfolio`
  - Browser MCP — `/transactions` 방문, 거래 입력·저장·대시보드 반영 확인, 증거 `artifacts/investment/evidence/task-3.png` 저장

---

### Checkpoint: Tasks 1–3 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 티커 등록 → 매수 거래 입력 → 대시보드 보유 중 표시까지 end-to-end로 동작

---

### Task 4: 매도·실현손익·매도 완료 + 포트폴리오 요약

- **담당 시나리오**: Scenario 4 (full), Scenario 5 (full)
- **크기**: M (4 파일)
- **의존성**: Task 3 (transaction, portfolio 서비스)
- **참조**:
  - next-best-practices — error-handling
  - shadcn — composition
- **구현 대상**:
  - `services/portfolio.ts` — Modify: `calcHoldings()`에 실현손익 계산 추가, `calcClosedPositions()` 추가 (전량 매도 종목), `calcPortfolioSummary()` 추가 (총 투자금·총 평가금·총 수익률·총 수수료)
  - `components/dashboard/ClosedPositionsTable.tsx` — 매도 완료 종목 테이블 RSC (총 실현손익)
  - `components/dashboard/PortfolioSummary.tsx` — 포트폴리오 요약 카드 RSC
  - `app/transactions/actions.ts` — Modify: `createTransactionAction`에 매도 수량 초과 validation 추가 ("보유 수량을 초과합니다")
- **수용 기준**:
  - [ ] SPY 5주 @ $480 매도 저장 후 보유 수량 5주가 표시된다 (S4)
  - [ ] SPY 실현손익: +$150.00이 표시된다 ((480 - 450) × 5) (S4)
  - [ ] 보유 수량 초과 매도 시도 → "보유 수량을 초과합니다" 에러 메시지가 표시된다 (S4)
  - [ ] SPY 10주 전량 매도 후 "보유 중" 테이블에 SPY 행이 없다 (S5)
  - [ ] "매도 완료" 섹션에 SPY 행이 나타나고 총 실현손익이 표시된다 (S5)
- **검증**:
  - `bun run test -- portfolio`
  - Browser MCP — 매도 거래 입력, 보유 중/매도 완료 섹션 전환 확인, 증거 `artifacts/investment/evidence/task-4.png` 저장

---

### Task 5: 거래 수정·삭제

- **담당 시나리오**: Scenario 8 (full), Scenario 9 (full)
- **크기**: M (3 파일)
- **의존성**: Task 3 (TransactionForm, transaction 서비스)
- **참조**:
  - next-best-practices — data-patterns
  - shadcn — forms (Dialog for confirm)
- **구현 대상**:
  - `components/transactions/TransactionList.tsx` — 거래 목록 Client Component, 각 행에 수정·삭제 버튼, 삭제 확인 Dialog (shadcn `alert-dialog`)
  - `components/transactions/TransactionForm.tsx` — Modify: `transactionId` prop 추가 시 수정 모드 진입, 기존 값 pre-fill
  - `app/transactions/actions.ts` — Modify: `updateTransactionAction`, `deleteTransactionAction` 추가 (수정·삭제 후 포트폴리오 재계산)
- **수용 기준**:
  - [ ] 수정 폼에 기존 값(단가 $450.00 등)이 미리 채워져 있다 (S8)
  - [ ] 수정 저장 후 SPY 평균단가 $445.00, 투자금액 $4,450.00이 표시된다 (S8)
  - [ ] 삭제 버튼 클릭 시 확인 다이얼로그가 표시된다 (S9)
  - [ ] 확인 후 거래 목록에 1건만 남는다 (S9)
  - [ ] 삭제 후 SPY 평균단가 $430.00, 수량 10주로 재계산된다 (S9)
  - [ ] 다이얼로그에서 취소 → 거래 목록이 변경되지 않는다 (S9)
- **검증**:
  - `bun run test -- TransactionList`
  - Browser MCP — 거래 수정·삭제 동작 및 재계산 확인, 증거 `artifacts/investment/evidence/task-5.png` 저장

---

### Checkpoint: Tasks 4–5 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 매수 입력 → 매도 입력 → 실현손익 표시 → 거래 수정·삭제까지 end-to-end로 동작

---

### Task 6: Yahoo Finance 현재가 조회

- **담당 시나리오**: Scenario 6 (full), Scenario 7 (full)
- **크기**: M (4 파일)
- **의존성**: Task 3 (대시보드, HoldingsTable)
- **참조**:
  - next-best-practices — route-handlers, error-handling
  - shadcn — composition
- **구현 대상**:
  - `services/price.ts` — `fetchPrices(tickers: string[])`: `yahoo-finance2` 호출, PriceCache upsert, 실패 시 기존값 유지
  - `app/api/prices/route.ts` — POST Route Handler, `services/price.ts` 호출 (서버 사이드, CORS 회피)
  - `components/dashboard/PriceRefreshButton.tsx` — "현재가 새로고침" 버튼 Client Component: 클릭 → `/api/prices` POST, 로딩 상태·성공·실패 처리, 마지막 조회 시각 표시
  - `components/dashboard/ManualPriceInput.tsx` — API 실패 시 표시되는 종목별 수동 현재가 입력 필드 Client Component
- **수용 기준**:
  - [ ] 버튼 클릭 후 로딩 상태(버튼 비활성화 또는 스피너)가 표시된다 (S6)
  - [ ] 조회 성공 후 각 보유 종목에 현재가·평가금액·미실현손익(금액 및 %)이 표시된다 (S6)
  - [ ] 마지막 조회 성공 시각이 표시된다 (예: "최종 업데이트: 2024-01-15 14:32") (S6)
  - [ ] API 실패 시 "현재가를 불러오지 못했습니다" 에러 메시지가 표시된다 (S7)
  - [ ] API 실패 시 보유 종목별 수동 현재가 입력 필드가 노출된다 (S7)
  - [ ] 수동 현재가 입력 후 확인 → 미실현손익이 계산되어 표시된다 (S7)
- **검증**:
  - Browser MCP — 대시보드에서 새로고침 버튼 클릭, 실제 Yahoo Finance API 응답 확인, 증거 `artifacts/investment/evidence/task-6.png` 저장
  - Human review — API 실패 시나리오: 네트워크를 오프라인으로 설정 후 새로고침 → 에러 배너·수동 입력 필드 표시 확인

---

### Checkpoint: Tasks 1–6 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 거래 입력 → 현재가 조회 → 미실현손익 표시 end-to-end 동작
- [ ] API 실패 → 수동 입력 fallback 동작

---

### Task 7: 분할 매수 계획 생성·목록

- **담당 시나리오**: Scenario 11 (full), Scenario 14 (completed 상태 전환)
- **크기**: M (4 파일)
- **의존성**: Task 2 (티커 목록)
- **참조**:
  - next-best-practices — data-patterns, error-handling
  - shadcn — forms, composition
- **구현 대상**:
  - `services/plan.ts` — `createPlan(tickerId, totalAmount)`: dailyAmount = totalAmount/40, status='active', `getAllPlans()`, `getPlanById(id)`, `getActivePlanByTicker(tickerId)`, `completePlan(id)` (status→'completed')
  - `components/plans/PlanList.tsx` — 활성 계획 카드 목록 (진행 상황 "N / 40일", 목표 매도가, 잔여 투자금) + 완료 계획 테이블 RSC
  - `app/plans/page.tsx` — RSC, 계획 목록 조회 후 PlanList 렌더
  - `app/plans/actions.ts` — `createPlanAction` Server Action (validation: 중복 활성 계획 불가, totalAmount > 0)
  - `services/plan.test.ts` (colocated)
- **수용 기준**:
  - [ ] 생성 후 계획 목록에 SPY 계획이 나타나고 진행 상황 "0 / 40일"이 표시된다 (S11)
  - [ ] 계획 상세에서 오늘의 매수 목표금액 $100.00, 잔여 투자금 $4,000.00이 표시된다 (S11)
  - [ ] SPY에 이미 활성 계획이 있는 상태에서 새 계획 생성 시도 → "해당 종목에 이미 진행 중인 계획이 있습니다" 에러 메시지가 표시된다 (S11)
  - [ ] 총 투자금 미입력 또는 0 이하 입력 시 → 해당 필드 아래 에러 메시지가 표시된다 (S11)
  - [ ] 40일차 매수 기록 후 활성 계획 목록에 SPY가 없다 (S14, Task 8 이후 검증)
  - [ ] SPY로 새 계획을 생성할 수 있는 상태가 된다 (S14, Task 8 이후 검증)
- **검증**:
  - `bun run test -- plan`
  - Browser MCP — `/plans` 방문, 계획 생성·중복 에러 확인, 증거 `artifacts/investment/evidence/task-7.png` 저장

---

### Task 8: 일별 매수 기록 + 목표 매도가

- **담당 시나리오**: Scenario 12 (full), Scenario 13 (full)
- **크기**: M (5 파일)
- **의존성**: Task 7 (plan 서비스), Task 3 (transaction 서비스 — 계획 매수 시 거래 자동 생성)
- **참조**:
  - next-best-practices — data-patterns, async-patterns
  - shadcn — forms, composition
- **구현 대상**:
  - `services/plan.ts` — Modify: `recordDailyEntry(planId, { date, quantity, price, fee })` — Transaction 생성(planId 연결) + 계획 평균단가 재계산(planId 일치 거래만) + 진행 일수 집계 + 40일 완료 시 `completePlan()` 자동 호출, `calcPlanAvgCost(planId)`, `isDuplicateDate(planId, date)`
  - `components/plans/PlanDetail.tsx` — 계획 상세 RSC: 진행 카드(N/40일, 잔여 투자금, 계획 평균단가), 목표 매도가 카드(= 계획 평균단가 × 1.10, 초록 테두리), 일별 매수 로그 테이블
  - `components/plans/DailyEntryForm.tsx` — 일별 매수 입력 폼 Client Component (단가·수량·수수료·날짜), 중복 날짜 확인 다이얼로그
  - `app/plans/[id]/page.tsx` — RSC, 계획 상세 + 일별 로그 조회
  - `app/plans/[id]/actions.ts` — `recordDailyEntryAction` Server Action
- **수용 기준**:
  - [ ] 1일차(0.212주 @ $472) 저장 후 진행 상황 "1 / 40일"로 업데이트된다 (S12)
  - [ ] 잔여 투자금 $3,900.00으로 감소한다 (S12)
  - [ ] 계획 평균단가 $472.00, 목표 매도가 $519.20(= $472.00 × 1.10)이 표시된다 (S12)
  - [ ] 거래 내역에 SPY 매수 1건이 추가된다 (S12)
  - [ ] 이미 오늘 매수 기록이 있는 날 재기록 시도 → 확인 다이얼로그(중복 경고)가 표시된다 (S12)
  - [ ] 4일차 기록 후 계획 평균단가가 새 값으로 업데이트된다 (S13)
  - [ ] 목표 매도가가 새 계획 평균단가 × 1.10으로 교체 표시된다 (이전 값 사라짐) (S13)
  - [ ] 진행 상황 "4 / 40일"로 업데이트된다 (S13)
- **검증**:
  - `bun run test -- plan`
  - Browser MCP — 계획 상세 방문, 일별 매수 입력, 목표 매도가 갱신 확인, 증거 `artifacts/investment/evidence/task-8.png` 저장

---

### Checkpoint: Tasks 7–8 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 계획 생성 → 일별 매수 기록 → 목표 매도가 갱신 → 거래 내역 자동 반영까지 end-to-end 동작

---

### Task 9: 거래 입력 계획 연동 자동 채움

- **담당 시나리오**: Scenario 2 (계획 연동 자동 채움 부분)
- **크기**: S (2 파일)
- **의존성**: Task 3 (TransactionForm), Task 6 (PriceCache), Task 7 (plan 서비스)
- **참조**:
  - next-best-practices — async-patterns, rsc-boundaries
- **구현 대상**:
  - `hooks/usePlanAutoFill.ts` — `'use client'` hook: 티커 선택 시 활성 계획·마지막 캐시 가격 조회, 단가 자동 채움, 수량 = dailyAmount ÷ price 자동 계산, 단가 변경 시 수량 재계산, 수량 직접 수정 시 자동 재계산 해제 플래그
  - `components/transactions/TransactionForm.tsx` — Modify: `usePlanAutoFill` 훅 통합, 활성 계획 있는 티커 선택 시 컨텍스트 배너("SPY 투자 계획 · N일차 · 오늘 목표 $100.00") 표시, 단가·수량 필드에 "자동" 배지 표시
- **수용 기준**:
  - [ ] 활성 계획이 있는 티커(SPY) 선택 → 폼 상단에 "SPY 투자 계획 · 5일차 · 오늘 목표 $100.00" 컨텍스트 배너가 표시된다 (S2)
  - [ ] 최근 조회된 Yahoo Finance 현재가가 있는 경우 → 단가 필드에 마지막 조회가($473.50)가 자동 입력된다 (S2)
  - [ ] 단가가 자동 입력된 경우 → 수량 필드에 (일별 목표금액 ÷ 단가)가 자동 계산되어 입력된다 (S2)
  - [ ] 단가를 변경하면 수량이 (일별 목표금액 ÷ 새 단가)로 즉시 재계산된다 (S2)
  - [ ] 수량을 직접 수정하면 단가 변경 시 수량 자동 재계산이 해제된다 (S2)
  - [ ] 활성 계획이 없는 티커 선택 시 → 컨텍스트 배너 없음, 단가·수량 자동 채움 없음 (S2)
- **검증**:
  - `bun run test -- usePlanAutoFill`
  - `bun run test -- TransactionForm`
  - Browser MCP — 거래 입력 폼에서 활성 계획 있는 티커 선택, 자동 채움·재계산 동작 확인, 증거 `artifacts/investment/evidence/task-9.png` 저장

---

### Checkpoint: 최종
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 전체 시나리오 S1–S14 end-to-end 동작
- [ ] 거래 입력 → 계획 자동 채움 → 일별 매수 기록 → 목표 매도가 갱신 end-to-end 동작

---

## 미결정 항목

없음
