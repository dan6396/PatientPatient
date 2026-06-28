// 증례별 신체진찰 루브릭.
// (A) partId 수행 여부 → 커버리지 점수
// (B) mannerCriteria → LLM이 exam transcript로 수기 준수 여부 판정

import type { CaseExamRubric } from "./case-types";

// ── 급성 복통(췌장염) — 복부 진찰 중심 기본 루브릭 ──
// TODO: 복부 시진·청진·촉진 파트가 ExamPartId에 추가되면 항목 확장
const pancreatitisExamRubric: CaseExamRubric = {
  caseId: "pancreatitis",
  items: [
    { id: "ex_vital", label: "활력징후 확인",  partId: "vital_signs",       weight: 2 },
    { id: "ex_lung",  label: "호흡음 청진",    partId: "lung_auscultation", weight: 1 },
    { id: "ex_skin",  label: "피부(황달) 확인", partId: "skin_nails",        weight: 1 },
  ],
};

// ── 팔다리 근력저하(TIA) — 신경학적 진찰 기본 루브릭 ──
// TODO: 신경학적 진찰 파트(반사·감각·병적반사)가 추가되면 항목 확장
const tiaExamRubric: CaseExamRubric = {
  caseId: "tia",
  items: [
    { id: "ex_vital", label: "활력징후 확인(혈압)",  partId: "vital_signs", weight: 2 },
    { id: "ex_eyes",  label: "안구운동 확인",         partId: "eyes",        weight: 1 },
  ],
};

// ── 관절통증(류마티스 관절염) — 전체 루브릭 ──
const rheumatoidExamRubric: CaseExamRubric = {
  caseId: "rheumatoid",
  items: [
    { id: "ex_vital",    label: "활력징후 확인",            partId: "vital_signs",       weight: 1 },
    { id: "ex_eyes",     label: "결막(빈혈·충혈) 확인",     partId: "eyes",              weight: 1 },
    { id: "ex_mouth",    label: "구강(궤양·건조) 확인",     partId: "mouth",             weight: 1 },
    { id: "ex_lymph",    label: "림프절 이진",              partId: "lymph_nodes",       weight: 1 },
    { id: "ex_skin",     label: "피부 발진·손톱 변화 확인", partId: "skin_nails",        weight: 1 },
    { id: "ex_lung",     label: "호흡음 청진",              partId: "lung_auscultation", weight: 1 },
    { id: "ex_inspect",  label: "관절 시진(부종·변형 등)",  partId: "joint_inspection",  weight: 2 },
    {
      id: "ex_palp",
      label: "관절 이진(이개·압통)",
      partId: "joint_palpation",
      weight: 2,
      mannerCriteria: "이진 전 동의를 구하고 건측→환측 순서로 시행하는가",
    },
    {
      id: "ex_rom",
      label: "관절 ROM(능동·수동) 확인",
      partId: "joint_rom",
      weight: 2,
      mannerCriteria: "능동과 수동 이동을 모두 확인하는가",
    },
    {
      id: "ex_symmetry",
      label: "양측·대칭성 확인",
      partId: "joint_inspection",
      weight: 1,
      mannerCriteria: "한쪽이 아닌 양측을 비교 확인하는가",
    },
  ],
};

const examRubricMap: Record<string, CaseExamRubric> = {
  pancreatitis: pancreatitisExamRubric,
  tia: tiaExamRubric,
  rheumatoid: rheumatoidExamRubric,
};

export function getExamRubric(caseId?: string): CaseExamRubric | undefined {
  return caseId ? examRubricMap[caseId] : undefined;
}
