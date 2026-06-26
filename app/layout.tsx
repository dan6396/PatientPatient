import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CODE MEDI — CPX 가상환자 트레이너",
  description:
    "표준화환자(SP) 역할을 수행하는 LLM 에이전트와 면담을 연습하고, CPX 채점표 기준으로 즉시 피드백을 받으세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${instrument.variable} ${inter.variable}`}>
      <body>
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
