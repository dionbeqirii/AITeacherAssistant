"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList
} from 'recharts';
import React from 'react';

function scoreColor(score, alpha = 1) {
  if (score >= 8) return `rgba(16,185,129,${alpha})`;   // emerald
  if (score >= 6) return `rgba(59,130,246,${alpha})`;   // blue
  if (score >= 4) return `rgba(245,158,11,${alpha})`;   // amber
  return `rgba(239,68,68,${alpha})`;                     // red
}

function scoreBadgeClass(score) {
  if (score >= 8) return 'bg-emerald-100 text-emerald-700';
  if (score >= 6) return 'bg-blue-100 text-blue-700';
  if (score >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '12px 18px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      minWidth: 160,
    }}>
      <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: scoreColor(val) }} />
        <span style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>
          {val.toFixed(1)}
        </span>
        <span style={{ color: '#475569', fontSize: 11, fontWeight: 700 }}> / 10</span>
      </div>
    </div>
  );
};

export default function AnalyticsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/></svg>
        </div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Nuk ka të dhëna</p>
      </div>
    );
  }

  const avg = parseFloat((data.reduce((s, d) => s + d.score, 0) / data.length).toFixed(1));
  const best = data.reduce((a, b) => a.score > b.score ? a : b);
  const worst = data.reduce((a, b) => a.score < b.score ? a : b);

  return (
    <div className="h-full w-full flex flex-col rounded-3xl overflow-hidden border border-slate-100 shadow-sm" style={{ background: '#fff' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mb-0.5">Analitika e Klasës</p>
          <h3 className="text-sm font-black text-slate-700 tracking-tight">Mesatarja sipas Lëndëve</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Average pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black ${scoreBadgeClass(avg)}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            {avg} mes.
          </div>
          {/* Subject count */}
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {data.length} lëndë
          </div>
        </div>
      </div>

      {/* ── Mini stat row ── */}
      <div className="flex items-center gap-0 border-b border-slate-50">
        <div className="flex-1 flex flex-col items-center py-2.5 border-r border-slate-50">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Më e lartë</span>
          <span className="text-xs font-black text-emerald-500">{best.name} · {best.score}</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2.5 border-r border-slate-50">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mesatare</span>
          <span className={`text-xs font-black ${scoreBadgeClass(avg).split(' ')[1]}`}>{avg}</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Më e ulët</span>
          <span className="text-xs font-black text-red-400">{worst.name} · {worst.score}</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="flex-1 px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 18, right: 16, left: -18, bottom: 4 }}>
            <defs>
              {data.map((entry, i) => (
                <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={scoreColor(entry.score)} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={scoreColor(entry.score, 0.4)} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />

            <ReferenceLine
              y={avg}
              stroke={scoreColor(avg, 0.6)}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `Ø ${avg}`,
                position: 'insideTopRight',
                fill: scoreColor(avg, 0.8),
                fontSize: 9,
                fontWeight: 900,
                dy: -6,
              }}
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: '#cbd5e1', fontSize: 9, fontWeight: 700 }}
            />

            <Tooltip
              cursor={{ fill: 'rgba(241,245,249,0.6)', radius: 10 }}
              content={<CustomTooltip />}
            />

            <Bar dataKey="score" radius={[8, 8, 3, 3]} animationDuration={900} animationEasing="ease-out" maxBarSize={52}>
              {data.map((entry, i) => (
                <Cell key={i} fill={`url(#grad-${i})`} />
              ))}
              <LabelList
                dataKey="score"
                position="top"
                formatter={(v) => v.toFixed(1)}
                style={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
