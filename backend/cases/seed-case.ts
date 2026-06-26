// ============================================================================
// ★★★ 당일 교체 대상 파일 ★★★
// 이 파일의 `seedCase` 객체(PatientCase) 하나만 갈아끼우면 즉시 새 증례로 동작한다.
// 아래 내용은 전부 CPX 연습용 placeholder 의학정보다. 실제 대회 증례가 아니다.
// ============================================================================

import type { PatientCase } from "./case-types";

export const seedCase: PatientCase = {
  id: "abd-pain-35f",
  title: "급성 복통 35세 여성",
  chiefComplaint: "오른쪽 아랫배 통증",

  persona: {
    name: "이수진",
    age: 35,
    sex: "여",
    personality: "통증으로 약간 불안해하고 지쳐 있음. 묻는 말에 성실히 답하지만 먼저 길게 말하지는 않음.",
    speakingStyle:
      "존댓말. 한두 문장으로 짧게 대답. 의학용어를 쓰지 않고 일상어로 표현(예: '쑤신다', '체한 것 같다').",
  },

  openingStatement:
    "안녕하세요 선생님... 어제부터 오른쪽 아랫배가 계속 아파서 왔어요. 점점 더 심해지는 것 같아요.",

  publicInfo:
    "어제 오후부터 통증이 시작됨. 오늘은 더 심해져서 내원함. 평소 건강한 편이라고 생각함.",

  gatedFacts: [
    {
      id: "onset",
      triggerHint: "언제부터/어떻게 시작됐는지 물으면",
      answer: "어제 오후쯤 처음엔 배꼽 근처가 애매하게 아팠어요. 그러다 밤새 오른쪽 아래로 옮겨갔어요.",
    },
    {
      id: "character",
      triggerHint: "통증 양상(어떻게 아픈지)을 물으면",
      answer: "쑤시듯이 계속 아파요. 가만히 있어도 아프고, 걸을 때 울리면 더 심해요.",
    },
    {
      id: "severity",
      triggerHint: "통증 정도(10점 만점 등)를 물으면",
      answer: "10점에 한 7점쯤 되는 것 같아요. 아까보다 더 아파졌어요.",
    },
    {
      id: "migration",
      triggerHint: "통증 위치가 옮겨갔는지 물으면",
      answer: "네, 처음엔 배꼽 쪽이었는데 지금은 오른쪽 아래가 콕 집어서 아파요.",
    },
    {
      id: "nausea",
      triggerHint: "메스꺼움/구토 동반 여부를 물으면",
      answer: "네, 속이 메스껍고 아까 한 번 토했어요. 입맛도 하나도 없어요.",
    },
    {
      id: "fever",
      triggerHint: "열이 있었는지 물으면",
      answer: "어젯밤에 좀 으슬으슬했어요. 열은 재보진 않았는데 미열은 있는 것 같아요.",
    },
    {
      id: "bowel",
      triggerHint: "배변/설사/변비를 물으면",
      answer: "오늘은 화장실을 못 갔어요. 설사는 없어요.",
    },
    {
      id: "menstrual",
      triggerHint: "월경력/마지막 생리를 물으면",
      answer: "마지막 생리는 2주쯤 전이었고 규칙적인 편이에요.",
    },
    {
      id: "sexual_pregnancy",
      triggerHint: "임신 가능성/성생활을 (정중히) 물으면",
      answer: "결혼은 했고요... 임신은 잘 모르겠어요. 따로 확인은 안 해봤어요.",
    },
    {
      id: "past_history",
      triggerHint: "과거 병력/수술력을 물으면",
      answer: "크게 아픈 적은 없었어요. 배 수술 같은 것도 받은 적 없어요.",
    },
    {
      id: "meds_allergy",
      triggerHint: "복용 약/알레르기를 물으면",
      answer: "따로 먹는 약은 없고, 약 알레르기도 없는 걸로 알아요.",
    },
    {
      id: "food",
      triggerHint: "최근 식사/상한 음식 여부를 물으면",
      answer: "어제 점심은 평소처럼 먹었어요. 특별히 이상한 걸 먹진 않았어요.",
    },
  ],

  hiddenDiagnosis:
    "충수염(맹장염)이 강하게 의심되는 상황이지만, 환자는 의학 지식이 없으므로 진단명을 절대 먼저 말하지 않는다. '무슨 병 같냐'고 물어도 '잘 모르겠다'고 환자답게 답한다.",

  rubric: [
    { id: "r-onset", category: "병력청취", description: "통증의 발현 시점과 시작 양상(언제부터/어떻게)을 물었다" },
    { id: "r-character", category: "병력청취", description: "통증의 양상(쑤심/쥐어짜는 등 성격)을 물었다" },
    { id: "r-location", category: "병력청취", description: "통증의 위치와 위치 이동(배꼽→우하복부) 여부를 물었다" },
    { id: "r-severity", category: "병력청취", description: "통증의 정도/심해지는 경과를 물었다" },
    { id: "r-assoc", category: "병력청취", description: "동반 증상(오심·구토·식욕저하)을 물었다" },
    { id: "r-fever", category: "병력청취", description: "발열/오한 여부를 물었다" },
    { id: "r-bowel", category: "병력청취", description: "배변 습관 변화(설사/변비)를 물었다" },
    { id: "r-menstrual", category: "병력청취", description: "월경력 및 임신 가능성을 (여성력) 확인했다" },
    { id: "r-past", category: "병력청취", description: "과거력·수술력·복약력·알레르기를 물었다" },
    { id: "r-exam", category: "신체진찰", description: "복부 진찰(압통/반발통 등) 의사를 환자에게 설명·시도했다" },
    { id: "r-education", category: "환자교육", description: "의심되는 문제와 다음 검사/계획을 환자가 이해하도록 설명했다" },
    { id: "r-ppi", category: "PPI", description: "환자의 불안/통증에 공감하고 경청하는 태도를 보였다" },
    { id: "r-manner", category: "임상예절", description: "인사·자기소개·환자 확인 등 기본 진료 예절을 지켰다" },
  ],
};
