"use client";

import React from "react";
import Image from "next/image";
import { Source_Serif_4, IBM_Plex_Sans } from "next/font/google";

const displayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

// ---------------------------------------------------------------------------
// The panel is the RDC-NIR seal's own construction, scaled up to the screen:
// four fields (sun, sea, sugarcane, grain) split by a white cross, with the
// seal sitting at the crossing. Each field carries a line motif of its emblem.
// ---------------------------------------------------------------------------

const f2 = (n: number) => n.toFixed(2);

function SunRays() {
  const rays = Array.from({ length: 13 }, (_, i) => {
    const a = ((186 + i * 6.5) * Math.PI) / 180;
    const reach = i % 2 === 0 ? 240 : 150;
    return {
      key: i,
      x1: f2(100 + 16 * Math.cos(a)),
      y1: f2(100 + 16 * Math.sin(a)),
      x2: f2(100 + reach * Math.cos(a)),
      y2: f2(100 + reach * Math.sin(a)),
    };
  });
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 hidden h-full w-full md:block"
    >
      {rays.map((r) => (
        <line
          key={r.key}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function Waves() {
  const rows = [46, 56, 66, 76, 86, 96];
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 hidden h-full w-full md:block"
    >
      {rows.map((y, i) => (
        <path
          key={y}
          d={`M-10 ${y} q15 -5 30 0 t30 0 t30 0 t30 0`}
          fill="none"
          stroke="#fff"
          strokeOpacity={f2(0.16 + i * 0.05)}
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function Cane() {
  const stalks = [
    { x: 12, top: 46 },
    { x: 29, top: 30 },
    { x: 46, top: 50 },
    { x: 63, top: 32 },
    { x: 80, top: 44 },
    { x: 96, top: 36 },
  ];
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 hidden h-full w-full md:block"
    >
      {stalks.map(({ x, top }) => {
        const nodes: number[] = [];
        for (let y = 96; y > top + 4; y -= 13) nodes.push(y);
        return (
          <g key={x}>
            <line
              x1={x}
              y1="104"
              x2={x}
              y2={top}
              stroke="#fff"
              strokeOpacity="0.22"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {nodes.map((y) => (
              <line
                key={y}
                x1={x - 1.6}
                y1={y}
                x2={x + 1.6}
                y2={y}
                stroke="#0A3F25"
                strokeOpacity="0.85"
                strokeWidth="0.7"
              />
            ))}
            <path
              d={`M${x} ${top + 8} Q${x + 16} ${top - 8} ${x + 30} ${top + 2}`}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d={`M${x} ${top + 14} Q${x - 14} ${top} ${x - 26} ${top + 10}`}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

function Grain() {
  const stems = [
    { x: 22, top: 38 },
    { x: 50, top: 24 },
    { x: 78, top: 40 },
  ];
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 hidden h-full w-full md:block"
    >
      {stems.map(({ x, top }) => {
        const rowsY: number[] = [];
        for (let y = top + 6; y < 92; y += 9) rowsY.push(y);
        return (
          <g key={x}>
            <line
              x1={x}
              y1="104"
              x2={x}
              y2={top}
              stroke="#fff"
              strokeOpacity="0.25"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <ellipse cx={x} cy={top - 3} rx="1.9" ry="4.2" fill="#fff" fillOpacity="0.22" />
            {rowsY.map((y) => (
              <g key={y}>
                <ellipse
                  cx={f2(x - 4.6)}
                  cy={y}
                  rx="3.8"
                  ry="1.7"
                  transform={`rotate(-38 ${f2(x - 4.6)} ${y})`}
                  fill="#fff"
                  fillOpacity="0.2"
                />
                <ellipse
                  cx={f2(x + 4.6)}
                  cy={y}
                  rx="3.8"
                  ry="1.7"
                  transform={`rotate(38 ${f2(x + 4.6)} ${y})`}
                  fill="#fff"
                  fillOpacity="0.2"
                />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BrandPanel() {
  return (
    <div className="md:relative">
      <aside className="relative h-[132px] md:sticky md:top-0 md:h-screen">
        {/* The four fields, separated by a white seam like the seal's cross */}
        <div className="absolute inset-0 grid grid-cols-4 gap-[3px] bg-white md:grid-cols-2 md:grid-rows-2 md:gap-1">
          <div
            className="q-tl relative overflow-hidden"
            style={{ background: "linear-gradient(to top left, #F59E0B, #FFC21A)" }}
          >
            <SunRays />
          </div>
          <div
            className="q-tr relative overflow-hidden"
            style={{ background: "linear-gradient(to bottom, #1B2560, #2B3891)" }}
          >
            <Waves />
          </div>
          <div
            className="q-bl relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #0D5732, #093F25)" }}
          >
            <Cane />
          </div>
          <div
            className="q-br relative overflow-hidden"
            style={{ background: "linear-gradient(to right, #9A1F2B, #5A0A10)" }}
          >
            <Grain />
          </div>
        </div>

        {/* The seal: straddles the band on mobile, sits on the crossing on desktop */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
          <div className="seal-in h-[88px] w-[88px] rounded-full bg-white shadow-[0_18px_50px_rgba(8,20,45,0.38)] md:h-[clamp(190px,19vw,250px)] md:w-[clamp(190px,19vw,250px)]">
            <Image
              src="/logo.png"
              alt="Seal of the Regional Development Council, Negros Island Region"
              width={500}
              height={500}
              priority
              sizes="(min-width: 768px) 250px, 88px"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
        </div>

        <p className="absolute bottom-7 left-8 hidden max-w-[16rem] text-[13px] leading-snug text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] md:block">
          Department of Economy, Planning, and Development
        </p>
      </aside>
    </div>
  );
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${displayFont.variable} ${bodyFont.variable} min-h-screen bg-[#F8F9FA] text-[#14213D] md:grid md:grid-cols-[minmax(380px,52%)_1fr]`}
    >
      <style jsx global>{`
        .font-display {
          font-family: var(--font-display), Georgia, serif;
        }
        .font-body {
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
        }

        /* One orchestrated moment: the four fields open out from the crossing,
           then the seal turns into place. */
        @keyframes reveal-tl {
          from { clip-path: inset(100% 0 0 100%); }
          to   { clip-path: inset(0 0 0 0); }
        }
        @keyframes reveal-tr {
          from { clip-path: inset(100% 100% 0 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
        @keyframes reveal-bl {
          from { clip-path: inset(0 0 100% 100%); }
          to   { clip-path: inset(0 0 0 0); }
        }
        @keyframes reveal-br {
          from { clip-path: inset(0 100% 100% 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
        @keyframes seal-in {
          from { opacity: 0; transform: scale(0.82) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .q-tl { animation: reveal-tl 720ms cubic-bezier(0.22, 0.8, 0.3, 1) 0ms both; }
        .q-tr { animation: reveal-tr 720ms cubic-bezier(0.22, 0.8, 0.3, 1) 90ms both; }
        .q-bl { animation: reveal-bl 720ms cubic-bezier(0.22, 0.8, 0.3, 1) 180ms both; }
        .q-br { animation: reveal-br 720ms cubic-bezier(0.22, 0.8, 0.3, 1) 270ms both; }
        .seal-in { animation: seal-in 800ms cubic-bezier(0.22, 0.8, 0.3, 1) 520ms both; }

        @media (prefers-reduced-motion: reduce) {
          .q-tl, .q-tr, .q-bl, .q-br, .seal-in { animation: none; }
        }
      `}</style>

      <BrandPanel />

      <main className="font-body flex px-6 pb-14 pt-16 md:items-center md:justify-center md:px-12 md:py-14">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}
