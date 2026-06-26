# 랜딩 템플릿 (재사용용)

입자 애니메이션 히어로 + 분할 패널 + 닫는 CTA로 구성된 **도메인 무관 랜딩 템플릿**.
디자인/인터랙션은 그대로 두고 **`config.ts` 값만 바꾸면** 새 브랜드의 랜딩이 나온다.

## 다른 프로젝트에 가져다 쓰는 법

1. **이 폴더(`frontend/landing/`)를 통째로 복사**한다.
2. 페이지에서 렌더한다:
   ```tsx
   // app/page.tsx
   import Landing from "@/frontend/landing/Landing";
   export default function Home() {
     return <Landing />;
   }
   ```
3. **`config.ts`의 `landingConfig` 값만 수정**한다. 컴포넌트는 건드릴 필요 없다.

## config.ts 에서 바꾸는 것들

| 키 | 설명 |
|---|---|
| `theme` | 배경/글자/입자/어두운 패널 **색상** (브랜드 컬러) |
| `nav` | 상단 알약 내비의 로고(`brand`)와 메뉴(`items`) |
| `hero.particleWord` | 입자로 그려지는 **큰 글자** (1~4글자 권장) |
| `hero.eyebrow` | 좌상단 이탤릭 라벨. `strong` 부분만 진하게 강조 |
| `hero.caption / captionSub` | 입자 아래 또렷한 부제 |
| `hero.body / primaryCta / secondaryCta` | 하단 문구와 버튼 |
| `panels.left / right` | 분할 패널의 라벨·제목·태그·문단 |
| `closing` | 닫는 섹션의 제목(줄 단위 배열)·문구·버튼 |
| `footer` | 푸터 브랜드/문구 |

## 의존성 / 전제

- Next.js (App Router) + Tailwind v4.
- Tailwind 토큰 `--color-ink`, `--color-ink-soft`, `--bg`, 그리고 `.font-display`(세리프),
  `.grain`(필름 그레인 오버레이)이 전역 CSS에 정의돼 있어야 한다 → `app/globals.css`, `app/layout.tsx` 참고.
- 색상은 `config.theme`가 런타임에 CSS 변수로 주입하므로, 프로젝트마다 globals를 고칠 필요는 없다.
- 폰트(세리프=Instrument Serif)는 `app/layout.tsx`에서 로드한다. 폰트를 바꾸려면 그쪽을 수정.

## 컴포넌트 구성

```
config.ts        # ★ 여기만 수정
Landing.tsx      # 설정 → 전체 조립 + 테마 색상 주입
Navbar.tsx       # 중앙 알약 내비
ParticleHero.tsx # 입자 인터랙티브 히어로 (마우스/휠 반응)
DualPanel.tsx    # 좌/우 분할 패널 (마우스 따라 블롭 이동)
```
