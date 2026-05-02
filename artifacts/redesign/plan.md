# 무한매수법 리디자인 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 1차 매도 완료 추적 | plan_id별 sell 트랜잭션 카운트로 추론 | 별도 컬럼 없이 기존 테이블에서 inferable; 매도는 항상 plan에 귀속 |
| 공휴일 데이터 | lib/tradingDay.ts 정적 배열 (연도별 하드코딩) | npm 패키지 없이 Vercel 호환; 관리 비용 낮음 |
| 현재가 조회 타이밍 | 클라이언트 컴포넌트 useEffect | Yahoo Finance 외부 호출을 SSR에서 분리해 Vercel cold start timeout 방지 |
| 기존 plan-less 트랜잭션 | DB nullable 유지, 앱 레이어 강제 | 기존 데이터 손실 없음; 신규 매수는 항상 plan 귀속 |
| DB 마이그레이션 방식 | scripts/migrate-redesign.ts 일회성 실행 | ORM 없는 프로젝트; 배포 전 수동 실행으로 안전 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| Vercel Postgres plans 테이블 컬럼 추가 | Storage (ALTER TABLE) | scripts/migrate-redesign.ts | Task 1 |

## 데이터 모델

### Plan
- id (required)
- tickerId → Ticker
- totalAmount (required, > 0)
- dailyAmount (required, > 0, = totalAmount / splits)
- splits (required, integer ≥ 1, default 40)
- targetReturn (required, real > 0, default 0.10)
- status: 'active' | 'completed'
- startDate
- createdAt

### PlanWithProgress (Plan 확장)
- completedDays
- remainingAmount
- planAvgCost (null if no buys)
- targetSellPrice (= planAvgCost × (1 + targetReturn), null if no buys)
- sellSignal: null | 'full' | 'first' | 'second'
- firstSellCompleted (boolean, plan_id별 sell 트랜잭션 count ≥ 1 from completedDays > splits/2)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| shadcn | Task 5, 6, 7, 8, 9 | Alert(배너), FieldGroup/Field/Input(폼), Badge, Skeleton, Progress, AlertDialog |
| next-best-practices | 모든 Task | force-dynamic, Server Action 패턴, revalidatePath |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `lib/db.ts` | Modify | Task 1 |
| `scripts/migrate-redesign.ts` | New | Task 1 |
| `types/index.ts` | Modify | Task 1, 3 |
| `services/plan.ts` | Modify | Task 1, 3 |
| `services/plan.test.ts` | Modify | Task 1, 3 |
| `lib/tradingDay.ts` | New | Task 2 |
| `lib/tradingDay.test.ts` | New | Task 2 |
| `components/layout/AppShell.tsx` | Modify | Task 4 |
| `app/transactions/page.tsx` | Delete | Task 4 |
| `app/transactions/[id]/edit/page.tsx` | Delete | Task 4 |
| `app/plans/actions.ts` | Modify | Task 5 |
| `components/plans/PlanNewForm.tsx` | Modify | Task 5 |
| `components/plans/PlanNewForm.test.tsx` | New | Task 5 |
| `app/page.tsx` | Modify | Task 6 |
| `components/home/HomeClient.tsx` | New | Task 6 |
| `components/home/SellBanner.tsx` | New | Task 6 |
| `components/home/TodayTaskList.tsx` | New | Task 6 |
| `components/home/PortfolioSummary.tsx` | New | Task 6 |
| `app/plans/[id]/buy/page.tsx` | New | Task 7 |
| `app/plans/[id]/buy/actions.ts` | New | Task 7 |
| `components/plans/BuyConfirmForm.tsx` | New | Task 7 |
| `app/plans/[id]/sell/page.tsx` | New | Task 8 |
| `app/plans/[id]/sell/actions.ts` | New | Task 8 |
| `components/plans/SellConfirmForm.tsx` | New | Task 8 |
| `app/plans/page.tsx` | Modify | Task 9 |
| `components/plans/PlanList.tsx` | Modify | Task 9 |
| `app/plans/[id]/page.tsx` | Modify | Task 9 |
| `components/plans/PlanDetail.tsx` | Modify | Task 9 |
| `components/plans/DailyEntryForm.tsx` | Modify | Task 9 |
| `e2e/smoke.spec.ts` | Modify | Task 10 |

## Tasks

### Task 1: plans 테이블 splits·target_return 컬럼 추가 + 타입·서비스 확장

- **담당 시나리오**: SC-7 (happy path only), SC-8 (happy path only — 유효성 에러는 Task 5 참조)
- **크기**: M (5 파일)
- **의존성**: None
- **참조**:
  - `lib/db.ts:46` — initSchema (test용 SQLite 스키마)
  - `types/index.ts` — Plan, PlanWithProgress
  - `services/plan.ts:127` — createPlan, `services/plan.ts:180` — recordDailyEntry 완료 조건
- **구현 대상**:
  - `scripts/migrate-redesign.ts` — `ALTER TABLE plans ADD COLUMN splits INTEGER NOT NULL DEFAULT 40; ALTER TABLE plans ADD COLUMN target_return REAL NOT NULL DEFAULT 0.10;` Vercel Postgres 대상 실행
  - `lib/db.ts` — initSchema의 plans 테이블에 `splits INTEGER NOT NULL DEFAULT 40, target_return REAL NOT NULL DEFAULT 0.10` 추가
  - `types/index.ts` — Plan에 `splits: number`, `targetReturn: number` 추가; PlanWithProgress 동일 필드 상속
  - `services/plan.ts` — rowToPlan에서 splits·target_return 읽기; createPlan 시그니처에 `splits = 40`, `targetReturn = 0.10` 옵셔널 파라미터 추가; dailyAmount = totalAmount / splits; targetSellPrice = planAvgCost * (1 + targetReturn); recordDailyEntry 완료 조건을 `completedDays >= plan.splits`로 수정
  - `services/plan.test.ts` — 커스텀 파라미터(splits=20, targetReturn=0.15) 테스트 추가
- **수용 기준**:
  - [ ] splits=20, targetReturn=0.15로 계획 생성 시 dailyAmount = totalAmount / 20
  - [ ] 파라미터 생략 시 splits=40, targetReturn=0.10 적용
  - [ ] recordDailyEntry 호출 횟수가 plan.splits에 도달하면 plan.status = 'completed'
  - [ ] getPlanById 반환값에 splits, targetReturn 포함
  - [ ] targetSellPrice = planAvgCost × (1 + targetReturn)
- **검증**: `bun run test -- services/plan`

---

### Task 2: 거래일 판별 유틸리티 (lib/tradingDay.ts)

- **담당 시나리오**: SC-1 (success criteria 1), SC-2 (full), SC-6 (partial — 날짜 제한)
- **크기**: S (2 파일)
- **의존성**: None
- **참조**:
  - 미국 연방 공휴일: New Year's Day, MLK Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas
- **구현 대상**:
  - `lib/tradingDay.ts` — `isWeekend(date: string): boolean`, `isUSHoliday(date: string): boolean`, `isTradingDay(date: string): boolean`, `getPrevTradingDay(date: string): string`; 연도별 공휴일 날짜 정적 배열 (2024–2027 커버)
  - `lib/tradingDay.test.ts`
- **수용 기준**:
  - [ ] 2025-01-01 (New Year's) → isTradingDay = false
  - [ ] 2025-07-04 (Independence Day) → isTradingDay = false
  - [ ] 2025-11-27 (Thanksgiving) → isTradingDay = false
  - [ ] 2025-11-28 (Thanksgiving 다음날 금요일) → isTradingDay = true
  - [ ] 2025-05-03 (토요일) → isTradingDay = false
  - [ ] 2025-05-04 (일요일) → isTradingDay = false
  - [ ] 2025-05-05 (월요일, 비공휴일) → isTradingDay = true
  - [ ] getPrevTradingDay('2025-05-05') = '2025-05-02'
- **검증**: `bun run test -- lib/tradingDay`

---

### Task 3: Plan 서비스 — 매도 신호 + recordSell 추가

- **담당 시나리오**: SC-4 (full), SC-11 (full), SC-12 (full), SC-13 (full)
- **크기**: M (3 파일)
- **의존성**: Task 1 (splits, targetReturn이 PlanWithProgress에 있어야 함)
- **참조**:
  - `spec.md` 불변 규칙 — "진행 회차별 매도 기준" (N/2 threshold)
  - `services/plan.ts:25` — calcPlanProgress
  - `services/transaction.ts` — createTransaction
- **구현 대상**:
  - `types/index.ts` — PlanWithProgress에 `sellSignal: null | 'full' | 'first' | 'second'`, `firstSellCompleted: boolean` 추가
  - `services/plan.ts`:
    - calcPlanProgress 내부에서 plan_id별 sell 트랜잭션 count 조회 → `firstSellCompleted = completedDays > splits/2 && sellCount >= 1`
    - `export function computeSellSignal(plan: Pick<PlanWithProgress, 'completedDays' | 'splits' | 'targetReturn' | 'planAvgCost' | 'firstSellCompleted'>, currentPrice: number): 'full' | 'first' | 'second' | null` — N/2 threshold 로직 pure function
    - `export async function recordSell(planId: string, data: { date: string; quantity: number; price: number; fee: number }): Promise<void>` — sell 트랜잭션 저장; 'full' 또는 'second' 신호(보유 수량 전부 매도)인 경우 completePlan 호출
  - `services/plan.test.ts` — computeSellSignal 케이스별 단위 테스트; recordSell 후 firstSellCompleted 상태 검증
- **수용 기준**:
  - [ ] completedDays=15, splits=40 (≤20), currentPrice = avgCost×1.10 → computeSellSignal = 'full'
  - [ ] completedDays=25, splits=40 (>20), firstSellCompleted=false, currentPrice = avgCost×1.05 → 'first'
  - [ ] completedDays=25, splits=40 (>20), firstSellCompleted=true, currentPrice = avgCost×1.10 → 'second'
  - [ ] completedDays=25, splits=40, currentPrice < avgCost×1.05 → null
  - [ ] recordSell 후 'full' 신호: plan.status = 'completed'
  - [ ] recordSell 후 'first' 신호: plan.status = 'active', firstSellCompleted = true
  - [ ] recordSell 후 'second' 신호: plan.status = 'completed'
  - [ ] recordSell('first') 후 동일 planId로 recordDailyEntry 호출 성공 (active 상태 유지 검증)
- **검증**: `bun run test -- services/plan`

---

### Checkpoint: Tasks 1-3 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] getPlanById가 splits, targetReturn, sellSignal, firstSellCompleted를 반환

---

### Task 4: 내비게이션 3탭 개편 + /transactions 라우트 삭제

- **담당 시나리오**: 전체 탐색 구조 (전 시나리오에 영향)
- **크기**: S (3 파일)
- **의존성**: None (독립 실행 가능)
- **참조**:
  - `wireframe.html` — 탭 구조: 홈(Home), 계획(CalendarDays), 티커(ListFilter)
  - `components/layout/AppShell.tsx:8` — navItems 배열
- **구현 대상**:
  - `components/layout/AppShell.tsx` — navItems를 홈(`/`, Home), 계획(`/plans`, CalendarDays), 티커(`/tickers`, ListFilter) 3개로 교체
  - `app/transactions/page.tsx` — Delete
  - `app/transactions/[id]/edit/page.tsx` — Delete (디렉토리 포함)
- **수용 기준**:
  - [ ] 하단 탭바에 3개 탭(홈·계획·티커)만 표시된다
  - [ ] /transactions 접근 시 Next.js 404가 반환된다
  - [ ] 사이드 내비게이션에 "거래 내역" 항목이 없다
- **검증**:
  - `bun run build` 성공
  - Browser MCP — 홈·/plans·/tickers 탭 탐색 후 스크린샷 `artifacts/redesign/evidence/task-4-nav.png`

---

### Task 5: 계획 생성 폼 — splits·targetReturn 파라미터 추가

- **담당 시나리오**: SC-7 (full), SC-8 (full), SC-9 (full)
- **크기**: M (3 파일)
- **의존성**: Task 1 (createPlan 시그니처 변경)
- **참조**:
  - shadcn — FieldGroup, Field, Input 유효성 검사 (rules/forms.md)
  - `wireframe.html` — 계획생성 화면
  - `components/plans/PlanNewForm.tsx`
  - `app/plans/actions.ts`
- **구현 대상**:
  - `components/plans/PlanNewForm.tsx` — splits(기본값 40), targetReturn(기본값 10%) 필드 추가; 클라이언트 유효성: splits ≥ 1 정수, targetReturn > 0, totalAmount > 0; totalAmount·splits 변경 시 일 투자금(= totalAmount / splits) 실시간 미리보기 표시
  - `app/plans/actions.ts` — createPlanAction에서 splits, targetReturn FormData 파싱 후 createPlan(tickerId, totalAmount, splits, targetReturn) 전달
  - `components/plans/PlanNewForm.test.tsx` — 기본값 적용, 유효성 에러, 중복 계획 에러 테스트
- **수용 기준**:
  - [ ] splits·targetReturn 미입력 시 기본값 40·10% 적용
  - [ ] splits에 0 또는 소수 입력 → "1 이상의 정수를 입력하세요" 에러 표시
  - [ ] targetReturn에 0 이하 입력 → "0보다 큰 값을 입력하세요" 에러 표시
  - [ ] totalAmount에 0 이하 입력 → "0보다 큰 값을 입력하세요" 에러 표시
  - [ ] 동일 종목 활성 계획 존재 시 → "해당 종목에 이미 진행 중인 계획이 있습니다" 에러 표시
- **검증**: `bun run test -- PlanNewForm`

---

### Checkpoint: Tasks 4-5 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] splits=20, targetReturn=15로 계획 생성 후 계획 목록에서 "0 / 20일" 진행도 확인

---

### Task 6: 홈 화면 재편 — 오늘의 할 일 + 자동 현재가 조회 + 포트폴리오 요약

- **담당 시나리오**: SC-1 (full), SC-2 (full), SC-3 (full), SC-14 (full), SC-15 (display only — sell button은 Task 7·8에서)
- **크기**: M (5 파일)
- **의존성**: Task 1 (splits, targetReturn), Task 2 (isTradingDay), Task 3 (computeSellSignal)
- **참조**:
  - shadcn — Skeleton(로딩 상태), Alert(에러·배너), Badge, Card
  - `wireframe.html` — 홈-기본, 홈-매도배너, 홈-특수상태 화면
  - `services/price.ts` — fetchAndCachePrices, getCachedPrices
  - `app/api/prices/route.ts` (기존) — 현재가 조회 API
- **구현 대상**:
  - `app/page.tsx` — RSC: 활성 계획 목록, 캐시 가격, 오늘 매수 완료 여부 조회; HomeClient에 initialData props 전달; `export const dynamic = 'force-dynamic'` 유지
  - `components/home/HomeClient.tsx` — `'use client'`; 마운트 시 fetch('/api/prices') 호출로 현재가 갱신; 로딩(Skeleton)/에러 상태 관리; SellBanner·TodayTaskList·PortfolioSummary 조합
  - `components/home/SellBanner.tsx` — plan별 sellSignal 타입에 따라 배너 텍스트 결정; [매도하기] → `/plans/[id]/sell` Link; 현재가 없으면 배너 미표시
  - `components/home/TodayTaskList.tsx` — 오늘이 거래일이면 미매수 계획 목록; 각 항목 → `/plans/[id]/buy` Link; 완료 항목은 체크 아이콘으로 구분; 거래일 아닌 날 "오늘은 거래일이 아닙니다" 메시지
  - `components/home/PortfolioSummary.tsx` — 총 투자금, 총 평가금액, 미실현손익, 수익률; 현재가 미조회 종목 제외 후 계산
- **수용 기준**:
  - [ ] 홈 진입 시 Skeleton 표시 후 별도 버튼 없이 현재가 자동 로딩
  - [ ] 오늘이 거래일이 아닌 날: "오늘은 거래일이 아닙니다" 메시지, 포트폴리오 요약은 계속 표시
  - [ ] API 실패 시 "현재가를 불러오지 못했습니다" + 캐시 가격·조회 시각 표시
  - [ ] 오늘 매수 완료된 계획은 "오늘의 할 일"에 체크 표시로 구분
  - [ ] 포트폴리오 요약: 총 투자금, 평가금액, 미실현손익, 수익률 표시
  - [ ] sellSignal이 있는 계획에 대해 해당 타입의 배너 표시; [매도하기] 링크 포함
  - [ ] 활성 계획 2개 이상이 동시에 sellSignal을 가질 때 각각 별도 배너가 렌더링된다
  - [ ] completedDays ≤ N/2인 계획: 현재가 대비 목표가까지 남은 % (+X%) 표시
- **검증**:
  - Browser MCP — 홈 진입 후 Skeleton → 데이터 로드 확인, 스크린샷 `artifacts/redesign/evidence/task-6-home.png`
  - `bun run build`

---

### Task 7: 매수 확인 플로우 (/plans/[id]/buy)

- **담당 시나리오**: SC-5 (full)
- **크기**: M (3 파일)
- **의존성**: Task 1 (dailyAmount), Task 6 (TodayTaskList에서 링크)
- **참조**:
  - shadcn — FieldGroup, Field, Input (rules/forms.md)
  - `wireframe.html` — 매수확인 화면
  - `services/plan.ts` — recordDailyEntry
- **구현 대상**:
  - `app/plans/[id]/buy/page.tsx` — RSC: plan + 캐시 가격 조회; BuyConfirmForm에 props 전달; `export const dynamic = 'force-dynamic'`
  - `app/plans/[id]/buy/actions.ts` — `recordBuyAction(planId, formData)` Server Action; date·quantity·price·fee 파싱; recordDailyEntry 호출; 성공 시 revalidatePath('/') + redirect('/')
  - `components/plans/BuyConfirmForm.tsx` — `'use client'`; price·quantity·fee Input; price 변경 시 quantity 자동 재계산(= dailyAmount ÷ price); 수량 직접 수정 플래그(manualQty) — true면 price 변경 시 재계산 중단; [매수 완료] 버튼
- **수용 기준**:
  - [ ] 매수 확인 화면에 종목명, 오늘 날짜, 현재가(자동채움), 수량(= dailyAmount ÷ 현재가), 투자금 표시
  - [ ] 현재가 수정 시 수량 즉시 재계산
  - [ ] 수량 직접 수정 후 현재가 변경 시 수량 자동 재계산 중단
  - [ ] 수수료 미입력 시 $0 처리
  - [ ] [매수 완료] 후 홈으로 리다이렉트, 해당 계획 "오늘의 할 일"에서 완료 표시
  - [ ] 같은 날짜 중복 시 "해당 날짜에 이미 매수 기록이 있습니다" 에러 표시
- **검증**:
  - Browser MCP — 매수 확인 화면 진입; 현재가 수정 후 수량 재계산 확인; [매수 완료] 후 홈 리다이렉트 확인; 스크린샷 `artifacts/redesign/evidence/task-7-buy.png`

---

### Task 8: 매도 확인 플로우 (/plans/[id]/sell)

- **담당 시나리오**: SC-11 (full), SC-12 (full), SC-13 (full)
- **크기**: M (3 파일)
- **의존성**: Task 3 (recordSell, computeSellSignal), Task 6 (SellBanner에서 링크)
- **참조**:
  - shadcn — FieldGroup, Field, Input, AlertDialog (확인 다이얼로그)
  - `wireframe.html` — 매도확인 화면 (전량/1차/2차 상태)
  - `services/plan.ts` — recordSell
- **구현 대상**:
  - `app/plans/[id]/sell/page.tsx` — RSC: plan + 보유 수량 + 캐시 가격 조회; SellConfirmForm에 전달; `export const dynamic = 'force-dynamic'`
  - `app/plans/[id]/sell/actions.ts` — `recordSellAction(planId, formData)` Server Action; quantity·price·fee 파싱; recordSell 호출; revalidatePath('/') + redirect('/')
  - `components/plans/SellConfirmForm.tsx` — `'use client'`; sellSignal 타입에 따라 [전량 매도]/[1차 매도]/[2차 매도] 버튼; 현재가(자동채움), 수량(sellSignal별 기본값), 예상 실현손익 실시간 표시; 수량 > 보유수량 시 에러
- **수용 기준**:
  - [ ] sellSignal='full': 보유 수량 전체가 기본값, [전량 매도] 버튼 표시
  - [ ] sellSignal='first': 보유 수량 × 50%가 기본값, [1차 매도] 버튼 표시
  - [ ] sellSignal='second': 남은 보유 수량 전체가 기본값, [2차 매도] 버튼 표시
  - [ ] 보유 수량 초과 입력 시 "보유 수량을 초과합니다" 에러 표시
  - [ ] 예상 실현손익 = (매도가 - planAvgCost) × 수량 실시간 표시
  - [ ] 매도 완료 후 홈 리다이렉트; full/second 매도 후 계획 'completed' 상태
  - [ ] 1차 매도 완료 후 홈 리다이렉트 시 해당 종목의 'first' 신호 배너가 사라진다
  - [ ] 2차 매도 완료 후 계획 이력에 1차·2차 실현손익이 별도 레코드로 기록된다
- **검증**:
  - Browser MCP — 1차 매도(completedDays > N/2) 플로우 진행; 스크린샷 `artifacts/redesign/evidence/task-8-sell.png`

---

### Checkpoint: Tasks 6-8 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] 홈 → 오늘의 할 일 → 매수 확인 → 완료 → 홈 업데이트 end-to-end 동작 확인
- [ ] 홈 → 매도 배너 → 매도 확인 → 완료 end-to-end 동작 확인

---

### Task 9: 계획 목록 + 계획 상세 — N/2 진행도 표시 + 소급 매수

- **담당 시나리오**: SC-6 (full), SC-10 (full), SC-15 (full)
- **크기**: M (5 파일)
- **의존성**: Task 1 (splits, targetReturn), Task 2 (isTradingDay), Task 3 (firstSellCompleted, sellSignal)
- **참조**:
  - shadcn — Progress(진행도 바), Badge("1차 매도 완료" 상태), Tabs(진행 중/완료 탭)
  - `wireframe.html` — 계획목록 화면(Screen 5), 계획상세 화면(Screen 6)
  - `services/plan.ts` — isDuplicateDate, recordDailyEntry, getAllPlans
  - `lib/tradingDay.ts` — isTradingDay
- **구현 대상**:
  - `app/plans/page.tsx` — 진행 중/완료 탭 토글; 각 계획 카드에 진행도(completedDays / splits), 잔여 투자금, 완료 계획은 시작~종료일 표시
  - `components/plans/PlanList.tsx` — 계획 카드 컴포넌트; "1차 완료" Badge 표시 조건(firstSellCompleted)
  - `app/plans/[id]/page.tsx` — PlanDetail에 plan(splits, targetReturn, firstSellCompleted 포함) 전달; actions 링크 정리
  - `components/plans/PlanDetail.tsx` — Progress 바 (completedDays / splits); 진행 회차별 목표 매도가 표시: ≤N/2이면 단일 목표가(avgCost × (1+targetReturn)), >N/2이면 1차(×1.05)·2차(×targetReturn) 분리 표시 또는 "1차 매도 완료" Badge + 2차 매도가만; 잔여 투자금, 누적 수수료 합계 별도 표시
  - `components/plans/DailyEntryForm.tsx` — 날짜 input의 max를 오늘로 제한(미래 선택 불가); 저장 전 isTradingDay 검증(거래일이 아닌 날 입력 시 경고)
- **수용 기준**:
  - [ ] 계획 목록에서 진행 중 탭과 완료 탭이 분리 표시된다
  - [ ] 완료된 계획 카드에 시작일~종료일 날짜 범위가 표시된다
  - [ ] 진행도 바와 "15 / 40일" 텍스트 표시
  - [ ] completedDays ≤ N/2: 목표 매도가 하나만 표시 (avgCost × (1 + targetReturn))
  - [ ] completedDays > N/2, firstSellCompleted=false: 1차(×1.05) + 2차(×targetReturn) 표시
  - [ ] firstSellCompleted=true: "1차 매도 완료" Badge + 2차 매도가만 표시
  - [ ] 잔여 투자금(totalAmount - 사용금액) 표시
  - [ ] 계획 상세에서 누적 수수료 합계가 별도 항목으로 표시된다
  - [ ] DailyEntryForm: 미래 날짜 선택 불가
  - [ ] 과거 거래일 날짜로 소급 저장 → completedDays +1, 평균단가·목표가 재계산
  - [ ] 같은 날짜 중복 소급 시도 → "해당 날짜에 이미 매수 기록이 있습니다" 경고; 확인 시 저장
- **검증**:
  - Browser MCP — 계획 상세 진입; 소급 날짜로 매수 입력; 진행도 업데이트 확인; 스크린샷 `artifacts/redesign/evidence/task-9-detail.png`
  - `bun run build`

---

### Task 10: E2E 스모크 테스트 업데이트

- **담당 시나리오**: 핵심 경로 회귀 방지
- **크기**: S (1 파일)
- **의존성**: 모든 이전 Task
- **참조**:
  - `e2e/smoke.spec.ts` — 기존 테스트
- **구현 대상**:
  - `e2e/smoke.spec.ts` — /transactions 관련 테스트 제거; 홈 탭 탐색 테스트, 계획 생성(splits=20, targetReturn=15) 스모크 테스트 추가
- **수용 기준**:
  - [ ] `bun run test:e2e` 통과
  - [ ] /transactions 라우트 참조 없음
  - [ ] 3탭(홈·계획·티커) 탐색 테스트 통과
- **검증**: `bun run test:e2e`

---

### Checkpoint: 최종
- [ ] 모든 테스트 통과: `bun run test`
- [ ] E2E 테스트 통과: `bun run test:e2e`
- [ ] 빌드 성공: `bun run build`
- [ ] Human review — SC-4 매도 배너 3종(전량/1차/2차), SC-5 매수 UX(1-2탭 완료), SC-11/12/13 매도 플로우 브라우저에서 직접 확인

## 미결정 항목

없음
