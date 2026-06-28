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

// ── 교육 피드백 카드(모범답안) — 진단/근거/감별/검사/치료/교육 ──
export type TeachingSection = { key: string; title: string; items: string[] };
export type Teaching = { impression: string; sections: TeachingSection[] };

// 채점 결과로 내려가는 형태(응시자가 다룬 항목 covered 표시)
export type TeachingFeedbackItem = { text: string; covered: boolean };
export type TeachingFeedbackSection = { title: string; items: TeachingFeedbackItem[] };
export type TeachingFeedback = {
  impression: string;
  studentImpression: string;
  impressionCorrect: boolean;
  sections: TeachingFeedbackSection[];
};

// ── 신체진찰(OSCE) 술기 — 아바타에서 보기로 고른다 ──
export type ExamEffect = "press" | "wave" | "jerk" | "droop" | "fan" | "eye";

export type ExamManeuver = {
  rubricId: string; // 어느 신체진찰 채점 항목과 연결되는지
  label: string; // 보기 텍스트
  region: string; // 아바타 부위 키 (body.ts의 REGION)
  effect: ExamEffect; // 트리거할 모션
  finding: "양성" | "정상"; // 양성이면 그 부위가 빨강 소견으로 유지
  resultText: string; // 수행 결과/소견 한 줄
  // 기법 후속 선택(있으면 레벨 결정). 예: 양쪽/한쪽
  followup?: { prompt: string; options: { label: string; level: number }[] };
};

// 프론트가 채점 요청에 함께 보내는 신체진찰 수행 결과
export type ExamFinding = { rubricId: string; level: number };

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
  teaching?: Teaching; // 교육 피드백 카드(모범답안)
  physicalExam?: ExamManeuver[]; // (미사용) 신체진찰 술기 보기
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

// ── 신체진찰(텍스트 입력형) — 파트 분류 ──
export type ExamPartId =
  | "vital_signs"
  | "eyes"
  | "mouth"
  | "lymph_nodes"
  | "skin_nails"
  | "lung_auscultation"
  | "joint_inspection"
  | "joint_palpation"
  | "joint_rom";

export type CaseExamFinding = {
  partId: ExamPartId;
  label: string;
  finding: string;
  animationKey: string;
  variants?: Record<string, { finding: string; animationKey: string }>;
  // 관절 진찰 부위별 소견. affectedRegions에 든 부위(canonical key)만 양성,
  // 그 외 부위를 진찰하면 normalFinding을 반환한다. 없으면 부위와 무관하게 finding 사용.
  affectedRegions?: string[];
  normalFinding?: string;
  // 부위별로 다른 양성 소견 텍스트. 키=region(손가락/손목 등). 있으면 그 부위 진찰 시
  // 이 항목을 우선 사용한다(부위별 subtype 변형도 가능).
  byRegion?: Record<
    string,
    {
      finding: string;
      animationKey: string;
      variants?: Record<string, { finding: string; animationKey: string }>;
    }
  >;
};

export type CaseExamData = {
  caseId: string;
  findings: Partial<Record<ExamPartId, CaseExamFinding>>;
};

// 수련생이 입력한 진찰 지시 한 건 (채점용)
export type ExamMessage = { input: string; partIds: string[] };

// ── 신체진찰 루브릭 + 점수 ──
export type ExamRubricItem = {
  id: string;
  label: string;
  partId: ExamPartId;
  weight: number;
  mannerCriteria?: string; // 있으면 LLM이 transcript로 수기 준수 여부 판정
};

export type CaseExamRubric = {
  caseId: string;
  items: ExamRubricItem[];
};

export type ExamScoreItem = {
  id: string;
  label: string;
  satisfied: boolean;
  reason?: string;
};

export type ExamScoreResult = {
  totalScore: number;    // 0~100
  coverageScore: number; // 커버리지만
  mannerScore: number;   // 수기 준수만
  items: ExamScoreItem[];
};

export type ScoreResponse = {
  items: ScoredItem[];
  categories: CategoryScore[];
  total: number;
  max: number;
  percentage: number;
  summary: string;
  teaching?: TeachingFeedback;
  examScore?: ExamScoreResult;
  combinedScore?: number; // INTERVIEW_WEIGHT * 문진% + EXAM_WEIGHT * examScore.totalScore
};
