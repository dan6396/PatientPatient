// LLM provider / 모델명을 한 곳에서 관리한다.
// 당일 어떤 API 키/모델이 주어질지 모르니, 여기 상수만 바꾸면 전체가 교체된다.
//
// 기본은 OpenAI. 환경변수로 모델명 override 가능:
//   PATIENT_MODEL (기본 gpt-4o-mini) — 환자 응답용(빠르고 저렴)
//   SCORING_MODEL (기본 gpt-4o)      — 채점용(정확도 우선)
// API 키는 .env.local 의 OPENAI_API_KEY 로 자동 인식된다.

import { openai } from "@ai-sdk/openai";

export const PATIENT_MODEL_ID = process.env.PATIENT_MODEL ?? "gpt-4o-mini";
export const SCORING_MODEL_ID = process.env.SCORING_MODEL ?? "gpt-4o";

export const patientModel = openai(PATIENT_MODEL_ID);
export const scoringModel = openai(SCORING_MODEL_ID);
