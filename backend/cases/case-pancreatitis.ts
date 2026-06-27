// 전라컨소시엄 CPX 증례: 급성췌장염 (주증상: 급성 상복부·배꼽주위 통증)
// 채점표(병력청취 13×3 / 신체진찰 5×5 / 환자교육 2×3 / PPI 6×4)를 그대로 옮김.

import type { PatientCase } from "./case-types";
import { yesno, tri, edu, ppi } from "./rubric";

export const pancreatitisCase: PatientCase = {
  id: "pancreatitis",
  title: "급성 복통 35세 남성",
  chiefComplaint: "급성 상복부 및 배꼽주위 통증과 복부팽만",
  doorway:
    "35세 남성 · 심해지는 복부 통증으로 응급실 내원\n활력징후 — 혈압 110/70, 맥박 90회/분, 호흡 16회/분, 체온 37.5℃",

  persona: {
    name: "정민호",
    age: 35,
    sex: "남",
    personality: "통증이 심해 등을 구부린 채 힘들어하고 불안해함. 묻는 말에만 답함.",
    speakingStyle: "존댓말, 짧게 대답, 먼저 정보를 주지 않음. 통증을 자주 호소함.",
  },

  openingStatement:
    "선생님... 어제부터 윗배가 너무 아파서 왔어요. 점점 더 심해지는 것 같아요.",

  publicInfo:
    "어제 과음한 뒤 새벽부터 윗배가 심하게 아파 응급실에 왔다. 통증 때문에 등을 구부린 자세를 취하고 있다.",

  gatedFacts: [
    { id: "onset", triggerHint: "언제부터/어떻게 시작했는지 물으면", answer: "새벽부터요. 어제 술을 많이 마셨는데 그 다음부터 오한이 들고 배가 아프기 시작했어요." },
    { id: "site", triggerHint: "처음 아픈 부위를 물으면", answer: "윗배하고 배꼽 주위가 제일 아파요. 특히 왼쪽 윗배가 심해요." },
    { id: "fever", triggerHint: "열감/오한 등 동반증상을 물으면", answer: "네, 열이 나고 으슬으슬 추워요. 입맛도 없고 입술이 마르네요." },
    { id: "prev", triggerHint: "전에도 같은 증상이 있었는지 물으면", answer: "이렇게 아픈 건 처음이에요." },
    { id: "course", triggerHint: "지속성인지 단발성인지 물으면", answer: "처음부터 계속 아프고 점점 더 심해져요. 쥐어짜듯이 아파요." },
    { id: "posture", triggerHint: "자세에 따라 통증이 달라지는지 물으면", answer: "똑바로 누우면 더 아파서 등을 구부리고 있어요. 숨을 크게 쉬면 더 아파요." },
    { id: "pmh", triggerHint: "과거 다른 질환(당뇨/심장/간 등)을 물으면", answer: "당뇨가 있어서 약을 먹고 있어요. 다른 건 없어요." },
    { id: "scope", triggerHint: "위내시경이나 초음파를 해본 적 있는지 물으면", answer: "내시경이나 초음파는 해본 적 없어요." },
    { id: "alcohol", triggerHint: "음주에 대해 물으면", answer: "2~3일에 한 번씩 소주 두 병 정도 마셔요. 자주 과음하는 편이에요." },
    { id: "alcohol-prev", triggerHint: "과거 음주 후 같은 증상이 있었는지 물으면", answer: "전에 술 먹고 이렇게 아팠던 적은 없었어요." },
    { id: "diet", triggerHint: "식이/식습관을 물으면", answer: "고기를 좋아하고 평소에 과식하는 편이에요." },
    { id: "appendix", triggerHint: "과거 수술/장유착 여부를 물으면", answer: "5년 전에 맹장이 터져서 수술받았어요. 그때 유착 얘기를 들었는데... 그게 또 문제일까요?" },
    { id: "radiation", triggerHint: "통증이 등/어깨로 퍼지는지 물으면", answer: "등 쪽으로도 좀 뻗치는 것 같아요." },
    { id: "meds", triggerHint: "복용 약을 물으면", answer: "당뇨약 하루 한 알 먹어요." },
    { id: "smoke", triggerHint: "흡연을 물으면", answer: "담배는 스무 살부터 하루 한 갑 피워요." },
    { id: "family", triggerHint: "가족력을 물으면", answer: "가족 중에 특별히 아픈 사람은 없어요." },
  ],

  hiddenDiagnosis:
    "급성 췌장염(과음 후)이 강하게 의심되지만 환자는 의학지식이 없어 진단명을 모른다. '무슨 병 같냐'고 물어도 모른다고 답한다. (감별: 급성담낭염, 위십이지장궤양, 급성간염, 소장폐쇄)",

  rubric: [
    // ── 병력청취 (13 × 3점) ──
    { id: "hx1", category: "병력청취", description: "복통이 언제부터 시작됐는지 물었다", levels: yesno(3), criteria: "예=복통 시작 시점을 물음 / 아니오=안 물음" },
    { id: "hx2", category: "병력청취", description: "복통이 처음 시작된 부위를 물었다", levels: yesno(3) },
    { id: "hx3", category: "병력청취", description: "동반증상(열감)이 있었는지 물었다", levels: yesno(3), criteria: "열감은 반드시 물어야 예. 안 물으면 아니오" },
    { id: "hx4", category: "병력청취", description: "전에도 같은 복통이 있었는지 물었다", levels: yesno(3) },
    { id: "hx5", category: "병력청취", description: "복통이 지속성인지 단발성인지 물었다", levels: yesno(3) },
    { id: "hx6", category: "병력청취", description: "자세 변경에 따라 통증 정도가 변하는지 물었다", levels: yesno(3) },
    { id: "hx7", category: "병력청취", description: "과거 다른 질환(당뇨·심혈관·간 등)을 물었다", levels: yesno(3) },
    { id: "hx8", category: "병력청취", description: "위내시경이나 초음파를 해본 적 있는지 물었다", levels: yesno(3) },
    { id: "hx9", category: "병력청취", description: "음주에 대해 물었다", levels: yesno(3) },
    { id: "hx10", category: "병력청취", description: "과거 음주 후 같은 증상이 있었는지 물었다", levels: yesno(3) },
    { id: "hx11", category: "병력청취", description: "식이와 관련된 질문을 했다", levels: yesno(3) },
    { id: "hx12", category: "병력청취", description: "과거 충수절제/복막염 수술 후 장유착 치료력을 물었다", levels: yesno(3) },
    { id: "hx13", category: "병력청취", description: "등/견갑골로 퍼지는 방사통이 있는지 물었다", levels: yesno(3) },

    // ── 신체진찰 (5 × 5점, 제대로함 5 / 못함 2 / 안함 0) ──
    { id: "px1", category: "신체진찰", description: "신체진찰 전 손을 씻는다(언급/시행)", levels: tri(5, 2) },
    { id: "px2", category: "신체진찰", description: "복부 청진을 촉진 전에 시행한다", levels: tri(5, 2), criteria: "제대로함=촉진 전 청진 / 안함=청진 안 하거나 촉진 먼저" },
    { id: "px3", category: "신체진찰", description: "복부 진찰 전 환자의 자세를 바르게 한다", levels: tri(5, 2) },
    { id: "px4", category: "신체진찰", description: "통증 없는 부위부터 시작해 통증 부위를 마지막에 촉지한다", levels: tri(5, 2) },
    { id: "px5", category: "신체진찰", description: "상복부를 누른 채 호흡 시 통증 악화 여부를 진찰·질문한다", levels: tri(5, 2) },

    // ── 환자교육 (2 × 3점, 우수 3 / 보통 1 / 미흡 0) ──
    { id: "edu1", category: "환자교육", description: "예상되는 진단명이나 원인을 설명했다", levels: edu(3, 1), criteria: "우수=원인/진단 3가지 이상 / 보통=1~2가지 / 미흡=설명 안 함" },
    { id: "edu2", category: "환자교육", description: "예상되는 진단 및 치료계획을 설명했다", levels: edu(3, 1) },

    // ── 환자의사관계 PPI (5 × 4점) ──
    { id: "ppi1", category: "환자의사관계(PPI)", description: "효율적으로 잘 물어보았다(개방형 질문·확인·요약)", levels: ppi },
    { id: "ppi2", category: "환자의사관계(PPI)", description: "환자의 말을 잘 들어주었다(경청·눈맞춤)", levels: ppi },
    { id: "ppi3", category: "환자의사관계(PPI)", description: "환자의 입장을 이해하려 노력했다(공감)", levels: ppi },
    { id: "ppi4", category: "환자의사관계(PPI)", description: "환자가 이해하기 쉽게 설명했다", levels: ppi },
    { id: "ppi5", category: "환자의사관계(PPI)", description: "좋은 유대관계를 형성하려 했다(자기소개·존중)", levels: ppi },

    // ── 신체진찰태도 (1 × 4점) ──
    { id: "att1", category: "신체진찰태도", description: "신체진찰 태도가 좋았다(손 위생·가려주기·사전설명)", levels: ppi },
  ],

  physicalExam: [
    { rubricId: "px1", label: "진찰 전 손을 씻는다", region: "handR", effect: "wave", finding: "정상", resultText: "손을 깨끗이 씻고 진찰을 시작합니다." },
    { rubricId: "px2", label: "복부 청진을 먼저 시행한다", region: "upperAbdomen", effect: "wave", finding: "정상", resultText: "장음을 청진합니다. 장음은 정상입니다." },
    { rubricId: "px3", label: "환자의 자세를 바르게 한다", region: "fullBody", effect: "press", finding: "정상", resultText: "무릎을 살짝 굽히게 해 복부 긴장을 풀어줍니다." },
    { rubricId: "px4", label: "통증 없는 부위부터 촉진한다", region: "lowerAbdomenR", effect: "press", finding: "정상", resultText: "통증이 없는 우하복부부터 부드럽게 촉진합니다. 특이 소견 없습니다." },
    { rubricId: "px5", label: "상복부를 누르며 호흡 시 통증을 확인한다", region: "upperAbdomen", effect: "press", finding: "양성", resultText: "상복부에 심한 압통! 숨을 들이쉴 때 통증이 더 심해진다고 호소합니다." },
  ],

  teaching: {
    impression: "급성 췌장염",
    sections: [
      {
        key: "hx",
        title: "근거 — 문진",
        items: [
          "과음 후 발생한 급성 상복부 통증",
          "등으로 퍼지는 방사통",
          "발열·오한 동반",
          "지속적이고 점점 심해지는 경련성 통증",
          "오심·식욕저하",
          "잦은 과음력(위험인자)",
        ],
      },
      {
        key: "px",
        title: "근거 — 신체진찰",
        items: ["상복부 압통", "흡기 시 통증 악화", "장음 감소 가능"],
      },
      {
        key: "ddx",
        title: "감별진단",
        items: ["급성 담낭염", "위십이지장 궤양", "급성 간염", "소장폐쇄"],
      },
      {
        key: "wu",
        title: "검사",
        items: ["혈청 아밀라아제·리파아제", "복부 CT", "복부 초음파", "간기능검사·전해질"],
      },
      {
        key: "tx",
        title: "치료",
        items: ["금식 및 수액 요법", "진통제", "원인 교정(금주)", "중증도 평가 후 입원"],
      },
      {
        key: "edu-disease",
        title: "교육 — 질환 설명",
        items: ["췌장에 염증이 생긴 상태로, 과도한 음주가 흔한 원인임을 설명한다."],
      },
      {
        key: "edu-emergency",
        title: "교육 — 응급",
        items: ["복통이 심해지거나 고열·호흡곤란이 생기면 즉시 내원하도록 교육한다."],
      },
      {
        key: "edu-life",
        title: "교육 — 생활습관(금주·식이)",
        items: [
          "치료 기간 및 이후 반드시 금주하도록 교육한다.",
          "회복기에는 저지방 식이로 소량씩 규칙적으로 식사하도록 권고한다.",
          "금연을 권고한다.",
        ],
      },
      {
        key: "edu-prog",
        title: "교육 — 예후",
        items: [
          "대부분 보존적 치료로 호전되나 중증 췌장염은 합병증 위험이 있어 입원 관찰이 필요함을 설명한다.",
          "재발 방지를 위해 금주가 핵심임을 강조한다.",
        ],
      },
    ],
  },
};
