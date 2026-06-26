"use client";

const NAV = [
  { label: "면담", href: "#start" },
  { label: "채점", href: "#evaluate" },
  { label: "증례", href: "#cases" },
  { label: "소개", href: "#about" },
  { label: "문의", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex items-center justify-between px-4 sm:px-6">
      {/* 좌측 모서리 아이콘 */}
      <button
        aria-label="edit"
        className="pointer-events-auto grid h-9 w-9 place-items-center rounded-md border border-ink/20 bg-[var(--bg)]/60 backdrop-blur transition-colors hover:bg-ink/5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      {/* 중앙 알약형 내비 */}
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full bg-ink px-2.5 py-2 text-[var(--bg)] shadow-lg shadow-black/10">
        <a href="#top" className="px-3 font-display text-lg leading-none tracking-tight">
          CODE&nbsp;Medi
        </a>
        <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" />
        <ul className="hidden items-center sm:flex">
          {NAV.map((n) => (
            <li key={n.label}>
              <a
                href={n.href}
                className="rounded-full px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <span className="ml-1 grid grid-cols-3 gap-[3px] px-2 opacity-60">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-white" />
          ))}
        </span>
      </nav>

      {/* 우측 모서리 아이콘 */}
      <button
        aria-label="mail"
        className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-ink/20 bg-[var(--bg)]/60 text-ink backdrop-blur transition-colors hover:bg-ink/5"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </button>
    </header>
  );
}
