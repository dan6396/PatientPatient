// ============================================================================
// 재사용 가능한 랜딩 템플릿 설정.
// 다른 프로젝트에 쓸 땐 frontend/landing/ 폴더를 통째로 복사하고
// 이 파일(landingConfig)의 값만 바꾸면 똑같은 디자인의 새 랜딩이 나온다.
// 컴포넌트(디자인/애니메이션)는 건드릴 필요 없다.
// ============================================================================

export type NavItem = { label: string; href: string };
export type CtaItem = { label: string; href: string };

export type PanelContent = {
  eyebrow: string; // 작은 이탤릭 라벨
  title: string; // 큰 세리프 헤드라인
  tags: string[]; // 태그 칩들
  body: string; // 하단 문단
};

export type LandingConfig = {
  // ── 브랜드 색상 (프로젝트별로 바꾸는 핵심 노브) ──
  theme: {
    bg: string; // 페이지 배경
    ink: string; // 진한 글자색 + 입자 색
    inkSoft: string; // 보조 글자색
    panelDark: string; // 우측 어두운 패널 배경
    panelDarkText: string; // 우측 패널 기본 글자색
  };

  // ── 상단 알약형 내비게이션 ──
  nav: {
    brand: string;
    items: NavItem[];
  };

  // ── 히어로 (입자 애니메이션 영역) ──
  hero: {
    // 좌상단 이탤릭 라벨. strong 부분만 진하게 강조된다. (예: team **patient**patient)
    eyebrow: { pre?: string; strong?: string; post?: string };
    particleWord: string; // 입자로 그려질 큰 글자 (1~4글자 권장)
    caption: string; // 입자 아래 또렷한 부제 (자간 넓게 표시됨)
    captionSub?: string; // 그 아래 작은 보조 부제
    body: string; // 하단 문단
    primaryCta: CtaItem;
    secondaryCta?: CtaItem;
    scrollHint?: string;
  };

  // ── 좌/우 분할 패널 (마우스 따라 블롭 이동) ──
  panels: {
    left: PanelContent;
    right: PanelContent;
  };

  // ── 닫는 CTA 섹션 ──
  closing: {
    eyebrow: string;
    titleLines: string[]; // 줄바꿈 단위로 나눠서 입력
    body: string;
    cta: CtaItem;
  };

  // ── 푸터 ──
  footer: {
    brand: string;
    note: string;
  };
};

// ── 현재 프로젝트(CODE MEDI) 콘텐츠 ──
export const landingConfig: LandingConfig = {
  theme: {
    bg: "#d6d6cf",
    ink: "#16160f",
    inkSoft: "#4a4a40",
    panelDark: "#3a3a32",
    panelDarkText: "#e7e7df",
  },

  nav: {
    brand: "CODE Medi",
    items: [
      { label: "면담", href: "#start" },
      { label: "채점", href: "#evaluate" },
      { label: "증례", href: "#cases" },
      { label: "소개", href: "#about" },
      { label: "문의", href: "#contact" },
    ],
  },

  hero: {
    eyebrow: { pre: "team ", strong: "patient", post: "patient" },
    particleWord: "CPX",
    caption: "CLINICAL  PERFORMANCE  EXAMINATION",
    captionSub: "임상수행평가",
    body: "표준화환자(SP)와의 면담을 연습하고, CPX 채점표 기준으로 즉시 피드백을 받으세요.",
    primaryCta: { label: "면담 시작하기", href: "/session" },
    secondaryCta: { label: "어떻게 동작하나요", href: "#about" },
    scrollHint: "SCROLL ↓",
  },

  panels: {
    left: {
      eyebrow: "Standardized",
      title: "We simulate",
      tags: ["표준화환자(SP)", "실시간 문진", "캐릭터 유지", "정보 게이팅", "한국어 대화", "탈옥 방어"],
      body: "실제 표준화환자처럼 행동하는 AI와 면담을 연습합니다. 환자는 물어본 것에만 답하고, 먼저 정보를 흘리지 않으며, 진단명을 절대 먼저 말하지 않습니다. 의대생은 의사 역할로 자유롭게 병력을 청취합니다.",
    },
    right: {
      eyebrow: "Examination",
      title: "We evaluate",
      tags: ["병력청취", "신체진찰", "환자교육", "PPI", "임상예절", "자동 피드백"],
      body: "면담이 끝나면 전체 대화를 CPX 채점표에 비춰 항목별 충족·미충족을 즉시 판정합니다. 카테고리별 체크리스트와 함께, 놓친 항목 중심의 한국어 피드백을 한눈에 제공합니다.",
    },
  },

  closing: {
    eyebrow: "Curated Clinical Practice",
    titleLines: ["예비 의사를 위한", "CPX 모의 테스트"],
    body: "업로드된 증례와 채점 자료를 기반으로, 표준화환자(SP)와 실제처럼 면담하고 면담이 끝나면 채점표 기준으로 즉시 채점과 피드백을 받습니다.",
    cta: { label: "면담 시작하기", href: "/session" },
  },

  footer: {
    brand: "CODE Medi",
    note: "CPX 가상환자 트레이너 · by team patientpatient · 2026",
  },
};
