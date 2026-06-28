// 증례 레지스트리. 새 증례는 case-*.ts 만들어 여기 배열에 추가하면 선택 화면에 자동 노출된다.
import type { PatientCase } from "./case-types";
import { rheumatoidCase } from "./case-rheumatoid";

// 대회용: 류마티스 관절염 증례만 노출(기존 췌장염·TIA 증례는 제외).
// 되살리려면 case-pancreatitis / case-tia 를 import 해 배열에 추가하면 된다.
export const cases: PatientCase[] = [rheumatoidCase];

export const casesById: Record<string, PatientCase> = Object.fromEntries(
  cases.map((c) => [c.id, c])
);

// id로 증례를 찾되, 없으면 첫 증례로 폴백
export function getCase(id?: string): PatientCase {
  return (id && casesById[id]) || cases[0];
}

// 신체진찰 루브릭(채점 라우트에서 사용)
export { getExamRubric } from "./exam-rubric";
