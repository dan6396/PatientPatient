// 전라컨소시엄 CPX 증례: 일과성 뇌허혈 발작(TIA) (주증상: 일시적 왼쪽 팔다리 근력저하)
// 채점표(병력청취 11×3 / 신체진찰 10항목 31점 / 환자교육 3×2 / PPI 5×4 + 신체진찰태도 4)를 그대로 옮김.

import type { PatientCase } from "./case-types";
import { yesno, tri, edu, ppi } from "./rubric";

export const tiaCase: PatientCase = {
  id: "tia",
  title: "팔다리 근력저하 55세 여성",
  chiefComplaint: "일시적 왼쪽 팔다리 근력저하",
  doorway:
    "55세 여성 · 기상 후 일시적으로 발생한 왼쪽 팔다리 근력저하로 내원\n활력징후 — 혈압 160/90, 맥박 80회/분, 호흡 20회/분, 체온 36.7℃",

  persona: {
    name: "이지연",
    age: 55,
    sex: "여",
    personality: "처음 겪는 증상이라 긴장되고 불안한 표정. 협조적이지만 묻는 말에만 답함.",
    speakingStyle: "존댓말, 짧게 대답, 먼저 정보를 주지 않음. 모르는 건 모른다고 함.",
  },

  openingStatement: "선생님, 아침에 일어났더니 왼쪽 팔하고 다리에 힘이 빠져서 왔어요.",

  publicInfo:
    "오늘 아침 기상 후 왼쪽 팔다리에 힘이 빠졌고, 병원에 도착했을 때는 다시 회복된 상태다. 불안해하고 있다.",

  gatedFacts: [
    { id: "onset", triggerHint: "언제부터 힘이 빠졌는지 물으면", answer: "오늘 아침 일어나면서요. 사실 이틀 전부터 잠깐씩 두 번 왼쪽 손에 힘이 빠진 적이 있었어요." },
    { id: "side", triggerHint: "한쪽인지 양쪽인지 물으면", answer: "왼쪽 팔다리만 그래요." },
    { id: "pattern", triggerHint: "서서히/갑자기 등 발생 양상을 물으면", answer: "갑자기요. 자고 일어나니까 그래져 있었어요." },
    { id: "proximal", triggerHint: "몸에서 가까운/먼 근육 중 어디가 약한지 물으면", answer: "팔 전체가 다 힘이 없어서... 어디가 더 그런지는 잘 모르겠어요." },
    { id: "sensory", triggerHint: "저림/멍멍함 등 감각이상을 물으면", answer: "감각은 괜찮아요. 저리거나 그러진 않았어요." },
    { id: "dysarthria", triggerHint: "말이 어둔해졌는지(구음/언어장애) 물으면", answer: "말은 괜찮았어요." },
    { id: "diplopia", triggerHint: "복시/시야장애를 물으면", answer: "두 개로 보이거나 흐릿하지는 않았어요." },
    { id: "headache", triggerHint: "두통/어지럼을 물으면", answer: "머리는 안 아팠고 어지럽지도 않았어요." },
    { id: "pmh", triggerHint: "고혈압/당뇨/심장질환 등 과거력을 물으면", answer: "1년 전 검진에서 고혈압하고 고지혈증 진단받고 약 먹고 있어요." },
    { id: "social", triggerHint: "음주/흡연 등 사회력을 물으면", answer: "담배는 안 피우고, 술은 모임에서 가끔 맥주 두세 잔 정도예요." },
    { id: "infection", triggerHint: "최근 감기/몸살/설사 여부를 물으면", answer: "최근에 감기나 설사 같은 건 없었어요." },
    { id: "meds", triggerHint: "복용 약을 물으면", answer: "고혈압약하고 고지혈증약을 먹고 있어요." },
    { id: "family", triggerHint: "가족력을 물으면", answer: "아버지가 고혈압, 어머니가 고혈압하고 당뇨가 있으세요." },
    { id: "recover", triggerHint: "지금은 어떤지/회복됐는지 물으면", answer: "병원 오니까 지금은 많이 돌아온 것 같아요. 근데 왜 이런지 너무 걱정돼요." },
  ],

  hiddenDiagnosis:
    "일과성 뇌허혈 발작(TIA)이 의심되지만 환자는 진단명을 모른다. '중풍 아니냐'고 걱정하며 물을 수 있으나, 의사가 설명해주기 전에는 진단명을 스스로 말하지 않는다. (감별: 뇌졸중, 뇌종양, 경추척수병증, 말초신경병증)",

  rubric: [
    // ── 병력청취 (11 × 3점) ──
    { id: "hx1", category: "병력청취", description: "언제부터 힘이 빠졌는지(시점) 물었다", levels: yesno(3) },
    { id: "hx2", category: "병력청취", description: "한쪽인지 양쪽인지 물었다", levels: yesno(3) },
    { id: "hx3", category: "병력청취", description: "근력약화의 발생 양상(서서히/갑자기)을 물었다", levels: yesno(3) },
    { id: "hx4", category: "병력청취", description: "몸에서 가까운/먼 근육 중 어디가 더 약한지 물었다", levels: yesno(3) },
    { id: "hx5", category: "병력청취", description: "감각이상(저림·멍멍함) 증상이 있었는지 물었다", levels: yesno(3) },
    { id: "hx6", category: "병력청취", description: "구음장애나 언어장애가 있었는지 물었다", levels: yesno(3) },
    { id: "hx7", category: "병력청취", description: "복시나 시야장애가 있었는지 물었다", levels: yesno(3) },
    { id: "hx8", category: "병력청취", description: "두통이나 어지럼증이 있었는지 물었다", levels: yesno(3) },
    { id: "hx9", category: "병력청취", description: "고혈압·당뇨·심장질환 등 과거력을 물었다(2가지 이상)", levels: yesno(3), criteria: "두 가지 이상 물어야 예" },
    { id: "hx10", category: "병력청취", description: "사회력(음주력·흡연력)을 물었다(둘 다)", levels: yesno(3), criteria: "음주·흡연 둘 다 물어야 예" },
    { id: "hx11", category: "병력청취", description: "최근 상기도감염/설사 여부를 물었다", levels: yesno(3) },

    // ── 신체진찰 (10항목 31점) ──
    { id: "px1", category: "신체진찰", description: "환자 발음을 확인해 구음장애 여부를 확인했다", levels: tri(3, 1) },
    { id: "px2", category: "신체진찰", description: "근력평가(MRC)를 양쪽 팔·다리 모두에서 했다", levels: tri(4, 2), criteria: "양쪽 팔·다리 모두=제대로함 / 한쪽 또는 팔·다리 일부만=제대로 못함" },
    { id: "px3", category: "신체진찰", description: "상하좌우 안구운동을 시켜 정상 여부를 확인했다", levels: tri(3, 1) },
    { id: "px4", category: "신체진찰", description: "촉각감각을 평가했다", levels: tri(3, 1) },
    { id: "px5", category: "신체진찰", description: "통각 및 온도감각을 평가했다", levels: tri(3, 1) },
    { id: "px6", category: "신체진찰", description: "진동감각 및 위치감각을 평가했다", levels: tri(3, 1) },
    { id: "px7", category: "신체진찰", description: "사지 건반사를 검사했다(양측 모두)", levels: tri(3, 1) },
    { id: "px8", category: "신체진찰", description: "바빈스키 징후를 확인했다", levels: tri(3, 1) },
    { id: "px9", category: "신체진찰", description: "호프만 징후를 확인했다", levels: tri(3, 1) },
    { id: "px10", category: "신체진찰", description: "발목클로누스를 확인했다", levels: tri(3, 1) },

    // ── 환자교육 (3 × 2점, 우수 2 / 보통 1 / 미흡 0) ──
    { id: "edu1", category: "환자교육", description: "팔다리 근력저하의 원인질환을 설명했다", levels: edu(2, 1), criteria: "우수=뇌혈관질환 포함 3가지 이상 / 보통=1~2가지 / 미흡=설명 안 함" },
    { id: "edu2", category: "환자교육", description: "일차적인 진단계획을 설명했다", levels: edu(2, 1), criteria: "우수=뇌 CT/MRI 포함 3가지 이상" },
    { id: "edu3", category: "환자교육", description: "일차적인 치료계획을 설명했다", levels: edu(2, 1), criteria: "우수=항혈소판제 등 뇌혈관질환 치료 포함" },

    // ── 환자의사관계 PPI (5 × 4점) ──
    { id: "ppi1", category: "환자의사관계(PPI)", description: "효율적으로 잘 물어보았다(개방형 질문·확인·요약)", levels: ppi },
    { id: "ppi2", category: "환자의사관계(PPI)", description: "환자의 말을 잘 들어주었다(경청·눈맞춤)", levels: ppi },
    { id: "ppi3", category: "환자의사관계(PPI)", description: "환자의 입장을 이해하려 노력했다(공감)", levels: ppi },
    { id: "ppi4", category: "환자의사관계(PPI)", description: "환자가 이해하기 쉽게 설명했다", levels: ppi },
    { id: "ppi5", category: "환자의사관계(PPI)", description: "좋은 유대관계를 형성하려 했다(자기소개·존중)", levels: ppi },

    // ── 신체진찰태도 (1 × 4점) ──
    { id: "att1", category: "신체진찰태도", description: "신체진찰 태도가 좋았다(손 위생·가려주기·사전설명)", levels: ppi },
  ],
};
