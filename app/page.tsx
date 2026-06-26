import Navbar from "@/frontend/components/Navbar";
import ParticleHero from "@/frontend/components/ParticleHero";
import DualPanel from "@/frontend/components/DualPanel";

export default function Home() {
  return (
    <main id="top" className="relative">
      <Navbar />
      <ParticleHero />
      <DualPanel />

      {/* 닫는 CTA */}
      <section
        id="contact"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-6 text-center"
      >
        <span className="font-display text-sm italic text-ink-soft/70">
          Curated Clinical Practice
        </span>
        <h2 className="max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">
          예비 의사를 위한 <br /> CPX 모의 테스트
        </h2>
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
          업로드된 증례와 채점 자료를 기반으로, 표준화환자(SP)와 실제처럼
          면담하고 면담이 끝나면 채점표 기준으로 즉시 채점과 피드백을 받습니다.
        </p>
        <a
          href="/session"
          className="rounded-full bg-ink px-8 py-3 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
        >
          면담 시작하기
        </a>
      </section>

      <footer className="flex items-center justify-between border-t border-ink/10 px-6 py-8 text-xs text-ink-soft sm:px-10">
        <span className="font-display text-base text-ink">CODE Medi</span>
        <span>
          CPX 가상환자 트레이너 · by team{" "}
          <span className="font-display italic text-ink">patientpatient</span> · 2026
        </span>
      </footer>
    </main>
  );
}
