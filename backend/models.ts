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

// ── 음성(STT/TTS) — 채팅 LLM과 무관하게 오디오는 OpenAI 사용 ──
// 키는 기존 OPENAI_API_KEY 재사용. 환경변수로 교체 가능.
export const STT_MODEL = process.env.STT_MODEL ?? "whisper-1";
// 업그레이드 옵션: "gpt-4o-mini-transcribe" (더 정확, 비용↑)
// STT 정확도용 힌트(도메인 용어 bias)
export const STT_PROMPT =
  "의사와 환자의 한국어 진료 면담입니다. 배, 복통, 명치, 압통, 메스꺼움, 구토, 발열, 오한, 설사, 변비, 월경, 식욕 같은 의료 용어가 자주 나옵니다.";
export const TTS_MODEL = process.env.TTS_MODEL ?? "tts-1";
// 업그레이드 옵션: "gpt-4o-mini-tts"
export const TTS_VOICE = process.env.TTS_VOICE ?? "alloy";
// 한국어 음질이 아쉬우면 /api/tts 의 provider 함수만 ElevenLabs/Cartesia로 교체.
