// 신체진찰 라우팅 엔드포인트 (하이브리드 분류).
// 1) 임베딩 코사인 유사도를 "신체진찰 여부" 게이트로 사용한다(실제 의미 유사도).
//    어느 파트와도 충분히 가깝지 않으면(out-of-domain) 곧장 unmatched.
// 2) 게이트를 통과하면 LLM이 정확한 파트와 세부항목을 결정한다.
//    partId는 9개 enum으로 강제(structured output)하여 잘못된/숫자 id 출력을 차단.
import { embed, embedMany, generateObject } from "ai";
import { z } from "zod";
import { patientModel, embeddingModel } from "@/backend/models";
import {
  getExamData,
  EXAM_PART_LABELS,
  ALL_EXAM_PARTS,
} from "@/backend/cases/exam-data";
import type { ExamPartId } from "@/backend/cases/case-types";

export const runtime = "nodejs";

// 각 파트의 의미를 대표하는 기준 문장. 입력과 임베딩 유사도를 비교하는 기준이 된다.
const PART_REFERENCE: Record<ExamPartId, string> = {
  vital_signs:
    "활력징후를 측정한다. 혈압을 재고 맥박과 심박수를 세고 체온과 호흡수를 확인한다.",
  eyes: "눈을 살펴본다. 결막이 창백하거나 충혈됐는지, 공막에 황달이 있는지 본다.",
  mouth:
    "입 안을 살펴본다. 구강 점막, 인두, 편도, 혀를 보고 입이 마르거나 건조한지 확인한다.",
  lymph_nodes:
    "림프절을 만져본다. 목과 경부, 쇄골 위의 멍울이나 림프샘 비대를 손으로 촉진한다.",
  skin_nails:
    "피부와 손톱을 살펴본다. 발진, 황달, 손톱 변화가 있는지 관찰한다.",
  lung_auscultation:
    "청진기로 가슴의 숨소리를 듣는다. 폐 호흡음, 악설음, 천명음을 청진한다.",
  joint_inspection:
    "관절을 눈으로 본다. 부었는지, 변형이나 발적, 결절이 있는지 겉모습을 관찰한다.",
  joint_palpation:
    "관절을 손가락으로 눌러본다. 눌렀을 때 아픈 압통과 따뜻한 열감이 있는지 만져서 확인한다.",
  joint_rom:
    "관절을 움직여본다. 굽혔다 폈다 하며 능동·수동 운동범위와 움직일 때 통증을 확인한다.",
};

// 게이트 임계값: 어떤 파트와도 코사인 유사도가 이 값 미만이면 신체진찰과 무관한
// 입력(인사·잡담 등)으로 보고 LLM 호출 없이 unmatched. (실측: in-domain≥0.38, out-of-domain≤0.29)
const GATE_THRESHOLD = 0.33;

const PART_IDS = ALL_EXAM_PARTS as [ExamPartId, ...ExamPartId[]];

// LLM 출력 스키마: partId는 9개 enum으로 강제. subtypes는 세부항목 키(이개/압통/능동/수동/상지/하지 등).
// 관절 진찰 부위(target)의 정규화 키. 데이터의 affectedRegions와 매칭된다.
const REGION_KEYS = [
  "손가락",
  "손목",
  "팔꿈치",
  "어깨",
  "무릎",
  "발목",
  "발",
  "기타",
] as const;

const RouteSchema = z.object({
  matches: z.array(
    z.object({
      partId: z.enum(PART_IDS),
      subtypes: z.array(z.string()),
      // 관절 진찰이면 진찰 부위를 정규화 키로. 그 외 파트는 빈 문자열.
      region: z.string(),
    })
  ),
  // 진찰 행위가 특정되지 않아 여러 파트에 걸쳐 모호할 때, 학생에게 되물을 질문.
  // 모호하지 않으면 빈 문자열. (모호할 땐 matches를 비운다.)
  clarify: z.string(),
});

// 파트 기준 문장 임베딩(모듈 메모리에 1회 캐시).
let partVectorsCache: { partId: ExamPartId; vector: number[] }[] | null = null;
async function getPartVectors() {
  if (partVectorsCache) return partVectorsCache;
  const ids = ALL_EXAM_PARTS;
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: ids.map((id) => PART_REFERENCE[id]),
  });
  partVectorsCache = ids.map((id, i) => ({ partId: id, vector: embeddings[i] }));
  return partVectorsCache;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// 각 파트의 세부항목(variants) 선택지를 LLM 프롬프트용으로 구성.
function buildPartSpec(caseId?: string): string {
  const examData = getExamData(caseId);
  return ALL_EXAM_PARTS.map((partId) => {
    const f = examData?.findings[partId];
    const keys = f?.variants ? Object.keys(f.variants) : [];
    const label = EXAM_PART_LABELS[partId] ?? partId;
    const sub = keys.length ? ` · 세부항목: [${keys.join(", ")}]` : "";
    return `- ${partId}: ${label}${sub}`;
  }).join("\n");
}

export async function POST(req: Request) {
  try {
    const { message, caseId } = (await req.json()) as {
      message: string;
      caseId?: string;
    };

    if (!message?.trim()) {
      return Response.json({ error: "입력이 없습니다." }, { status: 400 });
    }
    const text = message.trim();

    // 1) 임베딩 게이트: 어느 파트와도 충분히 가깝지 않으면 unmatched (LLM 호출 절약)
    const [{ embedding }, partVectors] = await Promise.all([
      embed({ model: embeddingModel, value: text }),
      getPartVectors(),
    ]);
    const topSim = Math.max(
      ...partVectors.map((p) => cosine(embedding, p.vector))
    );
    if (topSim < GATE_THRESHOLD) {
      return Response.json({ results: [], unmatched: true });
    }

    // 2) LLM이 정확한 파트 + 세부항목 결정 (partId는 enum으로 강제)
    const system = `너는 CPX 신체진찰 라우터다. 의사(수련생)의 입력을 아래 파트 중 하나 이상으로 분류한다.
표면 키워드가 아니라 발화의 의미(의도)로 판단한다(동의어·완곡어법 포함).
세부항목이 있는 파트는, 입력이 특정 세부항목을 가리키면 subtypes에 해당 키를 모두 넣는다.
이때 아래 파트 목록의 "세부항목" 후보 중에서만 고른다. 의미가 닿으면 적극적으로 넣어라.
- joint_rom에서 "능동/스스로 움직여" → subtypes에 "능동", "수동/검사자가 움직여" → "수동".
- joint_palpation에서 "압통/눌러 아픔" → "압통", "이개/열감" → "이개".
전체를 의미하거나 세부항목이 특정되지 않을 때만 subtypes를 빈 배열로 둔다.
신체진찰 지시가 아니면 matches를 빈 배열로 둔다.

[모호성 처리] 되묻기는 오직 "입력이 아래 파트 목록 기준으로 둘 이상의 서로 다른 파트에
동시에 해당해서 어느 것인지 특정 불가"할 때만 한다. 이때 matches를 비우고 clarify에
더 구체적으로 말해 달라는 한 문장을 넣는다.
★중요: clarify에는 가능한 선택지(시진/촉진/ROM 등 구체적 진찰 종류)를 절대 나열하지 마라.
이것은 시험이므로 정답이 될 진찰 항목을 알려주면 안 된다. 어느 부위인지만 언급하고
"구체적으로 말해 달라"는 식으로만 되묻는다.
- 입력이 목록상 단 하나의 파트로만 이어지면 되묻지 말고 그 파트를 matches에 넣는다.
  (예: "눈" → eyes 하나뿐이므로 matches=[eyes]; "활력징후" → vital_signs 하나이므로 matches=[vital_signs])
- 목록에 없는 세부 진찰을 임의로 만들어 되묻지 마라. 한 파트 안의 측정요소(예: 활력징후의 혈압·맥박)는
  되물을 대상이 아니다(통째로 한 파트).
- 둘 이상 파트로 갈리는 전형적 예: "관절"(→ joint_inspection/joint_palpation/joint_rom).

[관절 진찰의 부위 확인] joint_inspection/joint_palpation/joint_rom은 행위가 정해져도
"어느 부위/관절(손가락·손목·팔꿈치·어깨·무릎·발목 등)"인지 입력에 드러나야 한다.
행위는 분명하나 부위가 특정되지 않으면 matches를 비우고 clarify에 어느 부위를 진찰할지 되묻는다.
이때 행위(촉진/시진/운동범위)는 이미 정해졌으므로 "어떤 진찰을 하시겠어요" 식으로 되묻지 말고,
반드시 그 행위를 그대로 써서 "어느 부위를 [촉진/시진/움직여] 보시겠어요?" 형태로 되묻는다.
구체적 부위명(손가락·손목 등)은 나열하지 마라(시험이므로 정답 힌트 금지).
부위가 드러나면 정상 진행한다.
예) "관절 촉진" → matches=[], clarify="어느 부위를 촉진하시겠어요?"
예) "관절 시진" → matches=[], clarify="어느 부위를 시진하시겠어요?"
예) "손가락 관절 촉진" → matches=[joint_palpation], clarify="".

예) "관절" → matches=[], clarify="관절의 어떤 진찰을 하시려는지 더 구체적으로 말씀해 주세요."
예) "손가락 관절 압통 보겠습니다" → matches=[joint_palpation], clarify="".

[부위(region) 정규화] 관절 파트(joint_*)의 match는 진찰 부위를 아래 키 중 하나로 정규화해 region에 넣는다:
${REGION_KEYS.join(" / ")}
- 손/손바닥/수지/MCP/PIP/DIP → "손가락", 손목/수근 → "손목", 무릎/슬관절 → "무릎",
  발목 → "발목", 발/발가락/MTP → "발", 그 외 분류 곤란 → "기타".
- 관절이 아닌 파트(vital_signs, eyes 등)는 region을 빈 문자열("")로 둔다.

파트 목록:
${buildPartSpec(caseId)}`;

    const { object } = await generateObject({
      model: patientModel,
      schema: RouteSchema,
      system,
      prompt: text,
      temperature: 0,
    });

    if (!object.matches.length) {
      // 행위가 모호하면 되묻고, 그 외(신체진찰 무관)는 unmatched.
      if (object.clarify?.trim()) {
        return Response.json({ results: [], clarify: object.clarify.trim() });
      }
      return Response.json({ results: [], unmatched: true });
    }

    const examData = getExamData(caseId);

    // 3) 결과 조립
    const mapped = object.matches.flatMap((match) => {
      const partId = match.partId;
      const region = match.region ?? "";
      const subtypes = match.subtypes ?? [];
      const label = EXAM_PART_LABELS[partId] ?? partId;
      const finding = examData?.findings[partId];

      if (!finding) {
        return [
          {
            partId,
            label,
            finding: "이상 없습니다.",
            animationKey: `anim_${partId}`,
            region,
            subtypes,
          },
        ];
      }

      // 부위별 소견: affectedRegions가 정의됐는데 진찰 부위가 비침범이면 정상 소견 반환.
      if (
        finding.affectedRegions?.length &&
        region &&
        !finding.affectedRegions.includes(region)
      ) {
        return [
          {
            partId,
            label: finding.label,
            finding: finding.normalFinding ?? "해당 부위 이상 없습니다.",
            animationKey: finding.animationKey,
            region,
            subtypes,
          },
        ];
      }

      // 침범 부위 + 부위별 소견(byRegion)이 있으면 그 부위 텍스트를 우선 사용.
      const rf = region ? finding.byRegion?.[region] : undefined;
      if (rf) {
        const rPicked = subtypes.filter((k) => rf.variants?.[k]);
        if (rPicked.length) {
          return rPicked.map((k) => ({
            partId,
            label: finding.label,
            finding: rf.variants![k].finding,
            animationKey: rf.variants![k].animationKey,
            region,
            subtypes,
          }));
        }
        return [
          {
            partId,
            label: finding.label,
            finding: rf.finding,
            animationKey: rf.animationKey,
            region,
            subtypes,
          },
        ];
      }

      const picked = subtypes.filter((k) => finding.variants?.[k]);

      if (picked.length) {
        return picked.map((k) => ({
          partId,
          label: finding.label,
          finding: finding.variants![k].finding,
          animationKey: finding.variants![k].animationKey,
          region,
          subtypes,
        }));
      }

      return [
        {
          partId,
          label: finding.label,
          finding: finding.finding,
          animationKey: finding.animationKey,
          region,
          subtypes,
        },
      ];
    });

    // 동일 파트·동일 소견(animationKey) 중복 제거
    const seen = new Set<string>();
    const results = mapped.filter((r) => {
      const key = `${r.partId}|${r.animationKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
