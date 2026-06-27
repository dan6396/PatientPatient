// CPX 증례 + (가중치·다단계) 채점표 데이터 모델.
// 코드는 이 타입만 알고 동작한다. 실제 증례/채점 내용은 case-*.ts 데이터 파일에만 있다.

export type GatedFact = {
  id: string;
  triggerHint: string; // 이 정보가 드러나려면 의사가 무엇을 물어야 하는지
  answer: string; // 그때 환자가 하는 대답
};

// 채점 레벨 하나 (높은 점수 → 낮은 점수 순으로 나열한다)
export type RubricLevel = {
  label: string; // 예: "예", "제대로 함", "우수", "아주 우수"
  points: number;
};

export type RubricItem = {
  id: string;
  category: string; // "병력청취" | "신체진찰" | "환자교육" | "환자의사관계(PPI)" | "신체진찰태도" ...
  description: string;
  levels: RubricLevel[]; // 높은 점수부터. 이진은 [예, 아니오]
  criteria?: string; // 채점관에게 주는 판정 기준(예: "예=시작 시점을 물음 / 아니오=안 물음")
};

export type PatientCase = {
  id: string;
  title: string;
  chiefComplaint: string;
  doorway?: string; // 문 앞 정보(활력징후 등) — 선택 화면/세션에 표시
  persona: {
    name: string;
    age: number;
    sex: "남" | "여";
    personality: string;
    speakingStyle: string;
  };
  openingStatement: string;
  publicInfo: string;
  gatedFacts: GatedFact[];
  hiddenDiagnosis: string;
  rubric: RubricItem[];
};

// ── 채점 결과 타입 (서버가 계산해 프론트로 반환) ──
export type ScoredItem = {
  id: string;
  category: string;
  description: string;
  levelLabel: string; // 판정된 레벨
  points: number; // 획득 점수
  maxPoints: number; // 만점
  evidence: string;
};

export type CategoryScore = { category: string; points: number; max: number };

export type ScoreResponse = {
  items: ScoredItem[];
  categories: CategoryScore[];
  total: number;
  max: number;
  percentage: number;
  summary: string;
};
