"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'; // Shto LabelList
import React from 'react';

// Një paletë ngjyrash më e pasur dhe e koordinuar me UI
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#22d3ee', // cyan-500
  '#f43f5e', // rose-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

// Custom Tooltip Component per nje dizajn me te bukur
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 text-sm font-medium">
        <p className="text-slate-700 font-bold mb-1">{`Lënda: ${label}`}</p>
        <p className="text-blue-600 font-bold">{`Mesatarja: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 italic font-bold uppercase text-xs tracking-widest">
        Nuk ka të dhëna për grafikun e vlerësimeve.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white p-4 rounded-2xl border border-slate-100">
      <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Mesatarja e Notave sipas Lëndëve</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} barCategoryGap="20%"> {/* Shtojme barCategoryGap per me shume hapesire */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /> {/* Ngjyre me e zbehte per griden */}
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} /> {/* Tick me bold dhe font me te vogel */}
          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}`} domain={[0, 10]} /> {/* Sigurojme domain 0-10 */}
          <Tooltip 
            cursor={{fill: '#f8fafc'}}
            content={<CustomTooltip />} // Perdorim Custom Tooltip
          />
          <Bar dataKey="score" radius={[8, 8, 0, 0]} animationDuration={800} fill={CHART_COLORS[0]}> {/* Radius me i madh per qoshe te rrumbullakosura, animacion */}
            {
                // Kalojme ngjyre dinamike per cdo shtylle, si dhe vleren si label
                data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))
            }
            <LabelList dataKey="score" position="top" fill="#64748b" fontSize={12} fontWeight="bold" formatter={(value) => value.toFixed(1)} /> {/* Shfaq vleren direkt mbi shtylla */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
