// LLM provider / 모델명을 한 곳에서 관리한다.
// 당일 어떤 API 키/모델이 주어질지 모르니, 여기 상수만 바꾸면 전체가 교체된다.
//
// 기본은 OpenAI. 환경변수로 모델명 override 가능:
//   PATIENT_MODEL (기본 gpt-4o-mini) — 환자 응답용(빠르고 저렴)
//   SCORING_MODEL (기본 gpt-4o)      — 채점용(정확도 우선)
// API 키는 .env.local 의 OPENAI_API_KEY 로 자동 인식된다.

import { openai } from "@ai-sdk/openai";

export const PATIENT_MODEL_ID = process.env.PATIENT_MODEL ?? "gpt-4o-mini";
// 채점은 정확도 우선 → gpt-5.5(추론 모델). temperature 미지원이라 채점 라우트에선 temperature를 보내지 않는다.
export const SCORING_MODEL_ID = process.env.SCORING_MODEL ?? "gpt-5.5";

export const patientModel = openai(PATIENT_MODEL_ID);
export const scoringModel = openai(SCORING_MODEL_ID);

// ── 음성(STT/TTS) — 채팅 LLM과 무관하게 오디오는 OpenAI 사용 ──
// 키는 기존 OPENAI_API_KEY 재사용. 환경변수로 교체 가능.
// gpt-4o-transcribe: whisper-1보다 한국어 정확도가 높고 환각이 크게 적다(엉뚱한 인식 방지).
// 비용을 줄이려면 "gpt-4o-mini-transcribe", 가장 저렴하게는 "whisper-1" 로 내릴 수 있음.
export const STT_MODEL = process.env.STT_MODEL ?? "gpt-4o-transcribe";
// STT 정확도용 힌트(도메인 용어 bias)
export const STT_PROMPT =
  "의사와 환자의 한국어 진료 면담입니다. 배, 복통, 명치, 압통, 메스꺼움, 구토, 발열, 오한, 설사, 변비, 월경, 식욕 같은 의료 용어가 자주 나옵니다.";
// gpt-4o-mini-tts: instructions(나이대·말투 지시)를 지원 → 환자 페르소나에 맞춤.
// 비용/속도가 부담되면 "tts-1" 로 내릴 수 있음(이 경우 instructions는 무시됨).
export const TTS_MODEL = process.env.TTS_MODEL ?? "gpt-4o-mini-tts";
export const TTS_VOICE = process.env.TTS_VOICE ?? "alloy"; // 폴백

// 환자 성별·나이에 맞는 보이스 선택
export function pickVoice(sex: "남" | "여", age: number): string {
  if (sex === "여") return age >= 45 ? "shimmer" : "nova"; // 중년/젊은 여성
  return age <= 30 ? "echo" : "onyx"; // 젊은/중년 남성
}
