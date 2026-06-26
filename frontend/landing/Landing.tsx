import Navbar from "./Navbar";
import ParticleHero from "./ParticleHero";
import DualPanel from "./DualPanel";
import { landingConfig, type LandingConfig } from "./config";

/**
 * 설정(LandingConfig) 하나로 전체 랜딩을 구성하는 재사용 템플릿.
 * 다른 프로젝트에선 frontend/landing/ 를 복사하고 config.ts 만 바꾸면 된다.
 */
export default function Landing({ config = landingConfig }: { config?: LandingConfig }) {
  const { theme, nav, hero, panels, closing, footer } = config;

  // 색상 테마를 CSS 변수로 주입 → bg-ink / text-ink-soft / var(--bg) 등이 전부 따라온다
  const themeVars = `:root{--bg:${theme.bg};--color-bg:${theme.bg};--color-ink:${theme.ink};--color-ink-soft:${theme.inkSoft};}`;

  return (
    <main id="top" className="relative">
      <style dangerouslySetInnerHTML={{ __html: themeVars }} />

      <Navbar brand={nav.brand} items={nav.items} />

      <ParticleHero
        eyebrow={hero.eyebrow}
        particleWord={hero.particleWord}
        caption={hero.caption}
        captionSub={hero.captionSub}
        body={hero.body}
        primaryCta={hero.primaryCta}
        secondaryCta={hero.secondaryCta}
        scrollHint={hero.scrollHint}
        inkColor={theme.ink}
      />

      <DualPanel
        left={panels.left}
        right={panels.right}
        dark={{ bg: theme.panelDark, text: theme.panelDarkText }}
      />

      {/* 닫는 CTA */}
      <section
        id="contact"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-6 text-center"
      >
        <span className="font-display text-sm italic text-ink-soft/70">{closing.eyebrow}</span>
        <h2 className="max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">
          {closing.titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < closing.titleLines.length - 1 && <br />}
            </span>
          ))}
        </h2>
        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">{closing.body}</p>
        <a
          href={closing.cta.href}
          className="rounded-full bg-ink px-8 py-3 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
        >
          {closing.cta.label}
        </a>
      </section>

      {/* 푸터 */}
      <footer className="flex items-center justify-between border-t border-ink/10 px-6 py-8 text-xs text-ink-soft sm:px-10">
        <span className="font-display text-base text-ink">{footer.brand}</span>
        <span>{footer.note}</span>
      </footer>
    </main>
  );
}
