// 증례 레지스트리. 새 증례는 case-*.ts 만들어 여기 배열에 추가하면 선택 화면에 자동 노출된다.
import type { PatientCase } from "./case-types";
import { pancreatitisCase } from "./case-pancreatitis";
import { tiaCase } from "./case-tia";

export const cases: PatientCase[] = [pancreatitisCase, tiaCase];

export const casesById: Record<string, PatientCase> = Object.fromEntries(
  cases.map((c) => [c.id, c])
);

// id로 증례를 찾되, 없으면 첫 증례로 폴백
export function getCase(id?: string): PatientCase {
  return (id && casesById[id]) || cases[0];
}
