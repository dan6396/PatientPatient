// 채점 레벨 프리셋 — 데이터 파일에서 rubric을 간결하게 작성하기 위함.
import type { RubricLevel } from "./case-types";

// 예/아니오 (기본 3점)
export const yesno = (pts = 3): RubricLevel[] => [
  { label: "예", points: pts },
  { label: "아니오", points: 0 },
];

// 제대로 함 / 제대로 못함 / 하지 않음
export const tri = (hi: number, mid: number): RubricLevel[] => [
  { label: "제대로 함", points: hi },
  { label: "제대로 못함", points: mid },
  { label: "하지 않음", points: 0 },
];

// 우수 / 보통 / 미흡
export const edu = (hi: number, mid = 1): RubricLevel[] => [
  { label: "우수", points: hi },
  { label: "보통", points: mid },
  { label: "미흡", points: 0 },
];

// 환자의사관계: 아주 우수 / 우수 / 보통 / 미흡
export const ppi: RubricLevel[] = [
  { label: "아주 우수", points: 4 },
  { label: "우수", points: 3 },
  { label: "보통", points: 2 },
  { label: "미흡", points: 1 },
];
