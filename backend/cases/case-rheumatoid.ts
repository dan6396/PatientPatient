// 전라컨소시엄 CPX 증례: 류마티스 관절염 (주증상: 양측 손가락마디와 손목 통증)
// 채점표(병력청취 10×4 / 신체진찰 5×3 / 환자교육 4×4 / 환자의사관계(PPI) 6×3 = 89점).
// ※ PDF 원본은 45세이나 대회 요청으로 55세로 설정함. PPI는 신 워크시트 6항목 구조.

import type { PatientCase, RubricLevel } from "./case-types";
import { yesno, tri, edu } from "./rubric";

// 환자의사관계(PPI) 평가 척도: 아주 우수 3 / 우수 2 / 보통 1 / 미흡 0
const ppiLv: RubricLevel[] = [
  { label: "아주 우수", points: 3 },
  { label: "우수", points: 2 },
  { label: "보통", points: 1 },
  { label: "미흡", points: 0 },
];

export const rheumatoidCase: PatientCase = {
  id: "rheumatoid",
  title: "양측 손가락·손목 통증 55세 여성",
  chiefComplaint: "양측 손가락마디와 손목 통증",
  doorway:
    "활력징후 — 혈압 130/80, 맥박 70회/분, 호흡 20회/분, 체온 36.5℃",

  persona: {
    name: "김미애",
    age: 55,
    sex: "여",
    personality:
      "전신쇠약과 관절통이 심한데도 식당 주방일을 계속해 매우 피곤한 표정. 협조적이지만 묻는 말에만 답함. 관절이 변형되는 나쁜 병이 아닐까 불안해함.",
    speakingStyle:
      "존댓말로 한 질문에 한 가지만 짧게 답함. 먼저 정보를 주지 않음. 막연한 질문에는 '뭘 말씀하시는 거예요?'라고 되물어 구체적으로 묻게 한다.",
  },

  openingStatement: "선생님, 양쪽 손가락이랑 손목이 점점 더 아파서 왔어요.",

  publicInfo:
    "식당에서 주방일(설거지·청소)을 한다. 양측 손가락마디와 손목이 점점 더 아파 내원했다. 피곤해 보이고 양쪽 손을 번갈아 주무르고 있다.",

  gatedFacts: [
    { id: "onset", triggerHint: "언제부터 아팠는지(기간/최초 발생 시점)를 물으면", answer: "한 석 달 전부터요. 점점 더 심해지는 것 같아요." },
    { id: "course", triggerHint: "증상이 어떻게 변해왔는지(경과)를 물으면", answer: "3년 전 식당일 시작하고부터 가끔 그랬는데, 석 달 전부터 부쩍 심해졌어요." },
    { id: "stiffness", triggerHint: "아침에 손이 뻣뻣한지(조조강직 여부)를 물으면", answer: "네, 아침에 자고 일어나면 손이 많이 뻣뻣해요." },
    { id: "stiffness_dur", triggerHint: "그 뻣뻣함이 얼마나 오래 가는지(조조강직 지속시간)를 물으면", answer: "한 두 시간쯤 주물러서 손을 풀어야 좀 나아져요." },
    { id: "activity", triggerHint: "활동/사용 후 호전되는지 악화되는지 물으면", answer: "설거지 같은 거 손을 많이 쓰고 나면 더 아파요. 아침이 제일 심하고 주무르면 좀 나아요." },
    { id: "other_joints", triggerHint: "손 말고 다른 관절(무릎·어깨 등)도 아픈지 물으면", answer: "오래 서서 일하다 보면 무릎도 좀 아파요. 근데 손만큼은 아니에요." },
    { id: "swelling", triggerHint: "붓기·열감·발적(빨개짐)이 동반되는지 물으면", answer: "가끔 손목이 붓고 시려요. 빨갛게 달아오르기도 하고요." },
    { id: "fatigue", triggerHint: "피로감·전신쇠약을 물으면", answer: "요즘 일 끝나면 피로가 확 몰려와서 일찍 자요." },
    { id: "weight_fever", triggerHint: "체중감소나 발열을 물으면", answer: "몸무게는 별로 안 변했고 열은 없었어요." },
    { id: "sicca", triggerHint: "입마름이나 눈 건조감을 물으면", answer: "입마름이나 눈 건조 같은 건 없어요." },
    { id: "oral_ulcer", triggerHint: "입안이 헐었는지(구강궤양)를 물으면", answer: "일이 아주 힘들면 입천장이 좀 헐긴 했는데, 요즘 석 달 안엔 없었어요." },
    { id: "raynaud", triggerHint: "찬물에 손가락 색이 하얘졌다 변하는지(레이노)를 물으면", answer: "찬물 닿으면 손마디가 더 아프긴 한데 색이 변하진 않아요." },
    { id: "rash", triggerHint: "피부 발진이나 햇빛 과민(광과민성)을 물으면", answer: "피부에 뭐 올라오거나 그런 건 없어요." },
    { id: "alcohol", triggerHint: "음주를 물으면", answer: "식당일 끝나면 맥주 한두 잔 해요." },
    { id: "smoking", triggerHint: "흡연을 물으면", answer: "담배는 5년 전부터 하루 일곱 개피 정도 피워요." },
    { id: "pmh", triggerHint: "당뇨·고혈압·결핵·간염 같은 지병(기저질환)을 물으면", answer: "그런 건 없고, 20년 전에 맹장수술 한 번 한 게 다예요." },
    { id: "family", triggerHint: "가족 중에 류마티스 같은 관절 질환이 있었는지 물으면", answer: "가족 중에 그런 관절 병 있는 사람은 없어요." },
    { id: "meds", triggerHint: "현재 복용 중인 약을 물으면", answer: "따로 챙겨 먹는 약은 없고, 너무 아플 때 가끔 진통제 사 먹은 게 다예요." },
    { id: "occupation", triggerHint: "직업을 물으면", answer: "식당에서 주방일 해요. 설거지하고 청소하고요." },

    // 신체진찰 시 드러나는 소견(의사가 그 부위를 진찰/촉진할 때만)
    { id: "exam_mcp", triggerHint: "손가락마디·손목 관절을 눌러보거나 진찰하면", answer: "(셋째·다섯째 손가락 마디랑 오른쪽 손목을 누르면) 아얏! 거기 아파요. 빨갛게 부어 있죠?" },
    { id: "exam_ankle", triggerHint: "발목을 진찰하면", answer: "왼쪽 발목도 좀 빨갛고 누르면 아파요." },
    { id: "exam_elbow", triggerHint: "팔꿈치를 펴보게 하거나 진찰하면", answer: "어? 왼쪽 팔꿈치가 끝까지 안 펴지네요… 누르니까 아파요. (전엔 몰랐어요)" },
    { id: "exam_rom", triggerHint: "손목·손가락을 움직여보게 하면", answer: "오른쪽 손목은 아파서 잘 안 돌아가요." },
    { id: "exam_oral", triggerHint: "입안을 보자고 하면", answer: "(입을 벌려 보여준다) 지금은 입안에 헌 데는 없어요." },
  ],

  hiddenDiagnosis:
    "류마티스 관절염이 의심되지만 환자는 진단명을 모른다. '무슨 병이냐, 심한 거냐, 관절이 변형되는 거 아니냐, 완치되냐, 재발하냐'를 걱정하며 물을 수 있으나, 의사가 설명해주기 전에는 진단명을 스스로 말하지 않는다. (감별: 골관절염(퇴행성 관절염), 쇼그렌 증후군, 전신홍반루푸스(SLE))",

  rubric: [
    // ── 병력청취 (10 × 4점) ──
    { id: "hx1", category: "병력청취", description: "관절 통증의 기간과 최초 발생 시점을 물었다(6주 이상인지)", levels: yesno(4) },
    { id: "hx2", category: "병력청취", description: "아침 조조강직의 지속시간을 물었다(1시간 이상인지)", levels: yesno(4), criteria: "지속시간을 물어야 예. 단순히 뻣뻣한지만 물은 건 아니오" },
    { id: "hx3", category: "병력청취", description: "관절 통증이 활동 후 호전/악화되는지 물었다", levels: yesno(4) },
    { id: "hx4", category: "병력청취", description: "손을 제외한 침범 관절(무릎·어깨 등)에 대해 물었다", levels: yesno(4) },
    { id: "hx5", category: "병력청취", description: "붓기·열감·발적 동반 여부를 물었다(2가지 이상)", levels: yesno(4), criteria: "두 가지 이상 물어야 예" },
    { id: "hx6", category: "병력청취", description: "감별을 위한 전신증상을 물었다(2가지 이상: 체중감소·발열·피로·구강/안구건조·구강궤양·레이노·발진 등)", levels: yesno(4), criteria: "두 가지 이상 물어야 예" },
    { id: "hx7", category: "병력청취", description: "최근 음주력 및 흡연력을 물었다", levels: yesno(4), criteria: "음주·흡연 둘 다 물어야 예" },
    { id: "hx8", category: "병력청취", description: "당뇨·혈압·결핵·간염 등 기저질환(과거력)을 하나라도 물었다", levels: yesno(4) },
    { id: "hx9", category: "병력청취", description: "가족 중 류마티스 질환이 있었는지 물었다", levels: yesno(4) },
    { id: "hx10", category: "병력청취", description: "현재 복용 중인 약물에 대해 물었다", levels: yesno(4) },

    // ── 신체진찰 (5 × 3점: 제대로함 3 / 제대로못함 2 / 하지않음 0) ──
    { id: "px1", category: "신체진찰", description: "관절의 상태(열감·발진·압통·관절변형)를 손·기타 관절에서 확인했다", levels: tri(3, 2), criteria: "두 가지 이상 확인=제대로함 / 한 가지만=제대로 못함" },
    { id: "px2", category: "신체진찰", description: "주로 가동관절(손·손목·팔꿈치·발목·무릎·어깨)의 운동범위를 확인했다", levels: tri(3, 2), criteria: "두 관절 이상 확인=제대로함 / 한 관절만=제대로 못함" },
    { id: "px3", category: "신체진찰", description: "관절통인지 관절주위통증인지 확인했다(능동·수동 관절운동, 압통점)", levels: tri(3, 2), criteria: "둘 다 확인=제대로함 / 하나만=제대로 못함" },
    { id: "px4", category: "신체진찰", description: "관절증상이 대칭적인지 비대칭적인지 확인했다", levels: tri(3, 2), criteria: "두 관절 이상 대칭성 확인=제대로함 / 한 관절만=제대로 못함" },
    { id: "px5", category: "신체진찰", description: "동반증상(구강궤양·구강건조·피부 발진/결절·손톱모양 등)을 확인했다", levels: tri(3, 2), criteria: "두 가지 이상 확인=제대로함 / 한 가지만=제대로 못함" },

    // ── 환자교육 (4 × 4점: 우수 4 / 보통 2 / 미흡 0) ──
    { id: "edu1", category: "환자교육", description: "진단을 위해 시행할 검사를 설명했다", levels: edu(4, 2), criteria: "우수=혈액검사(CBC, ESR/CRP, RF, Anti-CCP)와 관절 X-ray/초음파 모두 / 보통=한 가지만 / 미흡=설명 안 함" },
    { id: "edu2", category: "환자교육", description: "의심되는 병을 쉬운 말로 설명했다", levels: edu(4, 2), criteria: "우수=근거와 함께 의심 진단 설명 / 보통=의심 진단만 / 미흡=진단 제시 못함" },
    { id: "edu3", category: "환자교육", description: "감별해야 할 질환을 이유와 함께 설명했다", levels: edu(4, 2), criteria: "우수=근거와 감별질환 모두 / 보통=감별질환만 / 미흡=설명 안 함" },
    { id: "edu4", category: "환자교육", description: "치료 계획을 적절히 설명했다", levels: edu(4, 2), criteria: "우수=약물치료(항류마티스약제)와 비약물치료(금연·운동) 모두 / 보통=한 가지만 / 미흡=설명 안 함" },

    // ── 환자의사관계 PPI (6 × 3점: 아주우수 3 / 우수 2 / 보통 1 / 미흡 0) ──
    { id: "ppi1", category: "환자의사관계(PPI)", description: "나와 좋은 유대관계를 형성하려고 했다", levels: ppiLv, criteria: "환자확인·자기소개, 편하게 시작, 편안한 분위기, 공감과 지지, 무비판적 수용, 진정성/솔직함, 신뢰, 자신감, 존중" },
    { id: "ppi2", category: "환자의사관계(PPI)", description: "내 이야기를 효율적으로 물어보고 잘 들어주었다", levels: ppiLv, criteria: "면담주제 협상, 대답 여유 주기, 경청 자세, 호응, 확인, 개방형/폐쇄형 질문의 적절한 사용, 쉬운 용어, 한 번에 하나씩 묻는 분리질문" },
    { id: "ppi3", category: "환자의사관계(PPI)", description: "나의 생각과 배경을 효과적으로 알아냈다", levels: ppiLv, criteria: "일상생활 영향 파악, 기분/정서표현 격려, 생각/걱정 질문, 나의 기대 파악, 입장·배경·처지에 대한 관심" },
    { id: "ppi4", category: "환자의사관계(PPI)", description: "내가 이해하기 쉽게 설명하였다", levels: ppiLv, criteria: "필요한 정보 제공, 근거 있는 설명, 환자 의견·선택권 고려, 쉬운 용어, 기억하기 쉽게 설명, 이해 점검 및 질문 기회. ★특히 면담을 끝내기 전에 '더 궁금하신 점 있으세요?'처럼 환자에게 추가 질문 기회를 명시적으로 주었는지 반드시 확인한다 — 질문 기회를 주지 않고 면담을 끝냈으면 이 항목을 한 단계 이상 낮춘다." },
    { id: "ppi5", category: "환자의사관계(PPI)", description: "면담을 체계적으로 이끌어나갔다", levels: ppiLv, criteria: "논리적·체계적 순서, 적절한 시간 배분, 주기적 요약/면담 방향 제시, 환자 반응에 따라 질문 이어가기" },
    { id: "ppi6", category: "환자의사관계(PPI)", description: "신체진찰 태도가 좋았다", levels: ppiLv, criteria: "손 위생, 사전 설명, 가려주기, 환자 안전과 불편함 배려" },
  ],

  teaching: {
    impression: "류마티스 관절염",
    sections: [
      {
        key: "hx",
        title: "근거 — 문진",
        items: [
          "6주 이상 지속·악화된 양측 대칭성 손가락·손목 관절통",
          "1시간 이상의 아침 조조강직(약 2시간)",
          "MCP·손목 등 소관절 침범, 대칭성",
          "휴식 시(아침) 악화, 주무르면 호전되는 염증성 양상",
          "전신 피로감 동반",
        ],
      },
      {
        key: "px",
        title: "근거 — 신체진찰",
        items: [
          "양측 셋째·다섯째 중수지(MCP)관절·손목·발목의 발적과 압통",
          "좌측 팔꿈치 압통 및 약 130도 관절구축",
          "관절의 대칭적·소관절 우세 침범",
        ],
      },
      {
        key: "ddx",
        title: "감별진단",
        items: ["골관절염(퇴행성 관절염)", "쇼그렌 증후군", "전신홍반루푸스(SLE)"],
      },
      {
        key: "wu",
        title: "검사",
        items: [
          "자가항체 포함 혈액검사(RF, Anti-CCP, CBC, ESR/CRP, ANA)",
          "손 X-ray(방사선 검사)",
          "필요 시 관절 초음파",
        ],
      },
      {
        key: "tx",
        title: "치료",
        items: [
          "항류마티스약제(MTX 포함 DMARDs)로 조기 시작",
          "초기 증상 조절을 위해 소량 스테로이드·소염제 병용 가능(근본치료는 아님)",
          "효과 미흡 시 생물학적제제 고려",
          "비약물치료: 금연, 규칙적 운동, 관절 보호",
        ],
      },
      {
        key: "edu-disease",
        title: "교육 — 질환 설명",
        items: ["면역 이상으로 관절을 싸는 활막에 염증이 생겨 관절이 붓고 아프며, 방치하면 관절이 변형·파괴될 수 있는 만성 자가면역질환임을 쉬운 말로 설명한다."],
      },
      {
        key: "edu-treat",
        title: "교육 — 치료·관리",
        items: [
          "조기에 항류마티스약제로 꾸준히 치료하면 관절 손상을 늦추고 일상생활을 유지할 수 있음을 설명한다.",
          "금연이 질병 활성도와 치료반응에 중요함을 교육한다.",
        ],
      },
      {
        key: "edu-prog",
        title: "교육 — 경과·예후",
        items: [
          "완치되는 병은 아니지만 조기·적극 치료로 관절 변형을 상당 부분 예방할 수 있음을 안내한다.",
          "정기적 추적과 약물 순응의 중요성을 설명한다.",
        ],
      },
    ],
  },
};
