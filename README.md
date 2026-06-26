# CODE Medi — CPX 가상환자 트레이너 (by team patientpatient)

표준화환자(SP) 역할을 수행하는 LLM 에이전트와 면담을 연습하고,
면담이 끝나면 **CPX(임상수행평가) 채점표** 기준으로 즉시 자동 피드백을 받는 MVP.

> 핵심 설계 원칙: **증례(case)와 채점표(rubric)는 데이터 파일 한 곳에 분리한다.**
> 코드는 데이터를 읽어 동작만 한다. 당일 현장에서 데이터 파일 하나만 갈아끼우면 즉시 새 주제로 동작한다.

---

## 1. 실행법

```bash
npm install
npm run dev
# http://localhost:3000
```

- `/` : 랜딩 페이지 (마우스·휠에 반응하는 입자 히어로)
- `/session` : 실제 면담 화면 (채팅 → "면담 종료" → 자동 채점)

## 2. `.env.local` 설정

`.env.example` 를 복사해서 `.env.local` 을 만들고 키를 채운다.

```bash
cp .env.example .env.local
```

```
OPENAI_API_KEY=sk-...        # 필수
# PATIENT_MODEL=gpt-4o-mini  # (선택) 환자 응답 모델
# SCORING_MODEL=gpt-4o       # (선택) 채점 모델
```

provider/모델명은 `backend/models.ts` 한 곳에서 바꾼다. (당일 다른 키/모델이 주어져도 교체 쉬움)

## 3. ★ 당일 새 주제 적용법

**`backend/cases/seed-case.ts` 의 `seedCase` 객체(PatientCase) 하나만 교체하면 끝.**
코드(프롬프트·UI·로직)는 손대지 않는다. 채워야 할 것:

- `persona` / `chiefComplaint` / `openingStatement` / `publicInfo`
- `gatedFacts` — 의사가 **물어봐야만** 드러나는 정보
- `hiddenDiagnosis` — 환자가 **절대 먼저 말하면 안 되는** 것 (진단명 등)
- `rubric` — 면담 종료 후 채점 기준 (병력청취 / 신체진찰 / 환자교육 / PPI / 임상예절)

타입 정의는 `backend/cases/case-types.ts` 참고.

---

## 4. 폴더 구조 (frontend / backend 분리)

```
app/                      # Next.js App Router (얇은 라우팅만)
  page.tsx                # 랜딩
  session/page.tsx        # 면담 화면
  api/chat/route.ts       # 환자 에이전트 (streamText 스트리밍)
  api/score/route.ts      # 채점 에이전트 (generateText → JSON)
frontend/
  components/             # UI: ParticleHero, Navbar, DualPanel, Chat, ScoreReport
backend/
  models.ts               # provider/모델 상수
  cases/case-types.ts     # 데이터 모델
  cases/seed-case.ts      # ★ 당일 교체 대상
  patient/prompt.ts       # PatientCase → 환자 시스템 프롬프트
  scoring/prompt.ts       # transcript + rubric → 채점 프롬프트
  scoring/parse.ts        # 채점 응답 안전 JSON 파싱
```

## 5. 동작 흐름

1. **환자 채팅** — 사용자가 의사 역할로 질문 → 환자 에이전트가 캐릭터 유지하며 한국어로 응답(스트리밍).
   안 물어본 `gatedFacts`는 안 나오고, `hiddenDiagnosis`(진단명)는 먼저 새지 않는다.
2. **면담 종료** — 전체 transcript + rubric을 채점 LLM에 전달 → 항목별 `met`/`evidence` 판정(JSON).
3. **결과** — 카테고리별 ✔/✘ 체크리스트 + "충족 N/M" + 놓친 항목 위주 한국어 피드백.

## 6. 아직 안 한 것 (추후)

음성(STT/TTS), 벡터 DB/RAG, 로그인, 다중 증례 선택 화면, 배포.
구조는 증례가 여러 개가 돼도 확장되게 짜되, 현재는 단일 증례(seedCase)로 동작.
