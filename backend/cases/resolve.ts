// 요청에서 증례를 결정한다.
// 업로드/생성된 증례(caseData)가 오면 그걸 쓰고, 없으면 기존 정적 레지스트리(getCase).
// → 기존 동작은 그대로 두고, 커스텀 증례만 추가로 지원한다.
import type { PatientCase } from "./case-types";
import { getCase } from "./index";

export function resolveCase(caseId?: string, caseData?: PatientCase): PatientCase {
  if (caseData && Array.isArray(caseData.rubric) && caseData.rubric.length > 0) {
    return caseData;
  }
  return getCase(caseId);
}
