"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMarket } from "@/components/market";
import { SEED_INSTRUMENTS, simPrice, fmtPrice } from "@/lib/market-core";

type Candle = { t: number; o: number; h: number; l: number; c: number };

const STEP = 15_000;
const HIST = 64;

function sample(symbol: string, base: number, vol: string, t: number): Candle {
  const v = Number(vol);
  const pts = [t - STEP, t - STEP * 0.75, t - STEP * 0.5, t - STEP * 0.25, t].map((x) =>
    simPrice(symbol, base, v, x),
  );
  return {
    t,
    o: pts[0],
    h: Math.max(...pts),
    l: Math.min(...pts),
    c: pts[pts.length - 1],
  };
}

export function CandleChart({
  symbol,
  decimals,
  markers = [],
}: {
  symbol: string;
  decimals: number;
  markers?: Array<{ price: number; label: string; tone: "amber" | "up" | "down" }>;
}) {
  const { quotes } = useMarket();
  const quote = quotes[symbol];
  const seed = useMemo(
    () => SEED_INSTRUMENTS.find((i) => i.symbol === symbol),
    [symbol],
  );
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [candles, setCandles] = useState<Candle[]>([]);

  const H = 400;

  useEffect(() => {
    if (!seed) return;
    const now = Math.ceil(Date.now() / STEP) * STEP;
    const arr: Candle[] = [];
    for (let i = HIST; i >= 1; i--) arr.push(sample(symbol, seed.basePrice, String(seed.volatility), now - i * STEP));
    setCandles(arr);
  }, [symbol, seed]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.max(320, el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const price = quote?.price;
  useEffect(() => {
    if (!price || !candles.length) return;
    const boundary = Math.ceil(Date.now() / STEP) * STEP;
    setCandles((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      if (boundary > last.t) {
        next.push({ t: boundary, o: price, h: price, l: price, c: price });
        if (next.length > HIST + 8) next.shift();
      } else {
        next[next.length - 1] = {
          ...last,
          c: price,
          h: Math.max(last.h, price),
          l: Math.min(last.l, price),
        };
      }
      return next;
    });
  }, [price, candles.length]);

  const geo = useMemo(() => {
    if (!candles.length) return null;
    const padL = 8;
    const padR = 74;
    const padT = 16;
    const padB = 26;
    const plotW = Math.max(120, width - padL - padR);
    const plotH = H - padT - padB;
    const values = candles.flatMap((c) => [c.h, c.l]).concat(markers.map((m) => m.price));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = (max - min) * 0.12 || max * 0.002;
    min -= pad;
    max += pad;
    const y = (v: number) => padT + ((max - v) / (max - min)) * plotH;
    const slot = plotW / candles.length;
    const bw = Math.max(2, Math.min(11, slot * 0.62));
    const gridCount = 5;
    const rows = Array.from({ length: gridCount + 1 }, (_, i) => {
      const v = max - ((max - min) / gridCount) * i;
      return { v, y: y(v) };
    });
    return { padL, padR, padT, padB, plotW, plotH, y, slot, bw, rows, min, max };
  }, [candles, width, markers]);

  const last = candles[candles.length - 1];
  const up = last ? last.c >= last.o : true;

  return (
    <div ref={wrap} className="relative w-full bg-panel" style={{ height: H }}>
      {!geo && (
        <div className="absolute inset-0 flex items-center justify-center text-xs tracking-[0.2em] text-warm uppercase">
          Warming up feed…
        </div>
      )}
      {geo && (
        <svg width={width} height={H} className="block">
          {/* grid */}
          {geo.rows.map((r, i) => (
            <g key={i}>
              <line
                x1={geo.padL}
                x2={width - geo.padR}
                y1={r.y}
                y2={r.y}
                stroke="#1e222a"
                strokeDasharray={i === 0 || i === geo.rows.length - 1 ? "0" : "2 4"}
              />
              <text
                x={width - geo.padR + 8}
                y={r.y + 3.5}
                className="tnum"
                fill="#7c8797"
                fontSize="10"
                fontFamily="var(--font-plex)"
              >
                {fmtPrice(r.v, decimals)}
              </text>
            </g>
          ))}

          {/* candles */}
          {candles.map((c, i) => {
            const x = geo.padL + i * geo.slot + geo.slot / 2;
            const rising = c.c >= c.o;
            const color = rising ? "#0ecb81" : "#f6465d";
            const yo = geo.y(c.o);
            const yc = geo.y(c.c);
            return (
              <g key={c.t} opacity={i < candles.length - 1 ? 1 : 0.95}>
                <line x1={x} x2={x} y1={geo.y(c.h)} y2={geo.y(c.l)} stroke={color} strokeWidth={1} />
                <rect
                  x={x - geo.bw / 2}
                  y={Math.min(yo, yc)}
                  width={geo.bw}
                  height={Math.max(1.2, Math.abs(yc - yo))}
                  fill={color}
                  opacity={rising ? 0.92 : 0.92}
                />
              </g>
            );
          })}

          {/* markers */}
          {markers.map((m) => {
            const yy = geo.y(m.price);
            const color =
              m.tone === "up" ? "#0ecb81" : m.tone === "down" ? "#f6465d" : "#ffb020";
            return (
              <g key={m.label + m.price}>
                <line
                  x1={geo.padL}
                  x2={width - geo.padR}
                  y1={yy}
                  y2={yy}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="6 4"
                  opacity={0.85}
                />
                <rect x={geo.padL + 4} y={yy - 8} width={m.label.length * 6.4 + 12} height={16} fill="#08090a" stroke={color} />
                <text
                  x={geo.padL + 10}
                  y={yy + 4}
                  fill={color}
                  fontSize="10"
                  fontFamily="var(--font-plex)"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* live price tag */}
          {last && (
            <g>
              <line
                x1={geo.padL}
                x2={width - geo.padR}
                y1={geo.y(last.c)}
                y2={geo.y(last.c)}
                stroke="#ffb020"
                strokeWidth={1}
                strokeDasharray="1 3"
              />
              <rect
                x={width - geo.padR + 2}
                y={geo.y(last.c) - 9}
                width={geo.padR - 6}
                height={18}
                fill="#ffb020"
              />
              <text
                x={width - geo.padR + 8}
                y={geo.y(last.c) + 4}
                fill="#08090a"
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-plex)"
              >
                {fmtPrice(last.c, decimals)}
              </text>
            </g>
          )}

          {/* time axis */}
          <line
            x1={geo.padL}
            x2={width - geo.padR}
            y1={H - geo.padB + 6}
            y2={H - geo.padB + 6}
            stroke="#1e222a"
          />
          <text x={geo.padL} y={H - 8} fill="#5c6470" fontSize="10" fontFamily="var(--font-plex)">
            −16 min
          </text>
          <text
            x={width - geo.padR - 46}
            y={H - 8}
            fill={up ? "#0ecb81" : "#f6465d"}
            fontSize="10"
            fontFamily="var(--font-plex)"
          >
            15s candles
          </text>
        </svg>
      )}
    </div>
  );
}
