// 신체진찰 라우팅 엔드포인트.
// 수련생이 입력한 진찰 지시문을 LLM으로 분류하고 해당 증례의 소견을 반환한다.
import { generateText } from "ai";
import { patientModel } from "@/backend/models";
import { getExamData, EXAM_PART_LABELS } from "@/backend/cases/exam-data";
import type { ExamPartId } from "@/backend/cases/case-types";

export const runtime = "nodejs";

const PARTS_SPEC = [
  { id: "vital_signs", hint: "혈압·맥박·체온·호흡수 확인" },
  { id: "eyes", hint: "결막·충혈·공막·황달 확인" },
  { id: "mouth", hint: "구강·인두·편도·혀·습윤·건조 확인" },
  { id: "lymph_nodes", hint: "경부·쇄골상 림프절 촉진" },
  { id: "skin_nails", hint: "피부 발진·손톱 변화 확인" },
  { id: "lung_auscultation", hint: "흉부 청진·폐음·호흡음 확인" },
  { id: "joint_inspection", hint: "관절 시진·부종·변형·발적·결절 관찰" },
  { id: "joint_palpation", hint: "관절 이개·압통 촉진" },
  { id: "joint_rom", hint: "능동/수동 관절 운동범위(ROM) 확인" },
] as const;

const SYSTEM_PROMPT = `너는 CPX 신체진찰 라우터다. 의사(수련생)의 입력을 아래 9개 파트 중 하나 이상으로 분류한다.

파트 목록:
${PARTS_SPEC.map((p) => `- ${p.id}: ${EXAM_PART_LABELS[p.id as ExamPartId]} (${p.hint})`).join("\n")}

파라미터(해당 파트에만 적용):
- joint_inspection / joint_palpation / joint_rom: region(상지/하지), target(관절명: DIP/PIP/MCP/손목/어깨/무릎/발목/MTP 등)
  - joint_palpation의 subtype: 이개 | 압통
  - joint_rom의 subtype: 능동 | 수동

한 입력이 여러 파트에 해당하면 matches 배열에 모두 넣는다(예: "이개와 압통 확인" → joint_palpation 2건).
매칭 없으면 unmatched: true, matches: [].

반드시 아래 JSON 객체 하나만 출력(마크다운·코드펜스 없이):
{"matches":[{"partId":"<id>","params":{},"confidence":0.0}],"unmatched":false}`;

type RouteMatch = {
  partId: ExamPartId;
  params: Record<string, string>;
  confidence: number;
};

export async function POST(req: Request) {
  try {
    const { message, caseId } = (await req.json()) as {
      message: string;
      caseId?: string;
    };

    if (!message?.trim()) {
      return Response.json({ error: "입력이 없습니다." }, { status: 400 });
    }

    const { text } = await generateText({
      model: patientModel,
      system: SYSTEM_PROMPT,
      prompt: message.trim(),
    });

    // JSON 추출
    let parsed: { matches: RouteMatch[]; unmatched: boolean };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no json");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ results: [], unmatched: true });
    }

    if (parsed.unmatched || !parsed.matches?.length) {
      return Response.json({ results: [], unmatched: true });
    }

    const examData = getExamData(caseId);

    const results = parsed.matches.map((match) => {
      const label = EXAM_PART_LABELS[match.partId] ?? match.partId;
      const finding = examData?.findings[match.partId];

      if (!finding) {
        return {
          partId: match.partId,
          label,
          finding: "이상 없습니다.",
          animationKey: `anim_${match.partId}`,
        };
      }

      const subtype = match.params?.subtype;
      if (subtype && finding.variants?.[subtype]) {
        return {
          partId: match.partId,
          label: finding.label,
          finding: finding.variants[subtype].finding,
          animationKey: finding.variants[subtype].animationKey,
        };
      }

      return {
        partId: match.partId,
        label: finding.label,
        finding: finding.finding,
        animationKey: finding.animationKey,
      };
    });

    return Response.json({ results, unmatched: false });
  } catch (err) {
    console.error("[/api/exam]", err);
    return Response.json(
      { error: "신체진찰 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
