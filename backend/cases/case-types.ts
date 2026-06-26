// CPX 증례 데이터 모델.
// ★ 코드는 이 타입만 알고 동작한다. 실제 증례 내용은 seed-case.ts 같은 데이터 파일에만 존재한다.

export type RubricItem = {
  id: string;
  category: "병력청취" | "신체진찰" | "환자교육" | "PPI" | "임상예절";
  description: string; // 예: "복통의 발현 양상(언제부터/어떻게)을 물었다"
};

export type GatedFact = {
  id: string;
  triggerHint: string; // 이 정보가 드러나려면 의사가 무엇을 물어야 하는지 (예: "통증 위치를 물으면")
  answer: string; // 그때 환자가 하는 대답
};

export type PatientCase = {
  id: string;
  title: string; // 예: "급성 복통 35세 여성"
  chiefComplaint: string; // 주증상
  persona: {
    name: string;
    age: number;
    sex: "남" | "여";
    personality: string; // 예: "약간 불안해함, 말수 적음"
    speakingStyle: string; // 예: "존댓말, 짧게 대답, 먼저 정보를 주지 않음"
  };
  openingStatement: string; // 진료실 들어와 처음 하는 말 (의사가 첫 질문 전 보여줄 대사)
  publicInfo: string; // 안 물어봐도 자연스럽게 드러나도 되는 정보
  gatedFacts: GatedFact[]; // ★ 의사가 물어봐야만 드러나는 정보
  hiddenDiagnosis: string; // ★ 환자가 절대 먼저 말하면 안 되는 것(진단명/검사결과 추정 등)
  rubric: RubricItem[]; // ★ 면담 종료 후 채점 기준
};

// 채점 결과 타입 (scoring 에이전트가 반환)
export type ScoreResult = {
  id: string;
  met: boolean;
  evidence: string; // 충족 근거 또는 놓친 이유
};

export type ScoreResponse = {
  items: ScoreResult[];
  summary: string; // 놓친 항목 위주의 한국어 요약 피드백 한 단락
};
