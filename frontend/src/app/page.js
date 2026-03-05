"use client";
import React, { useState } from 'react';
import { LayoutDashboard, FileText, GraduationCap, BarChart3, Send, CheckCircle, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

// Importimi Dinamik i Grafikut (Zgjidh problemet e SSR)
const AnalyticsChart = dynamic(() => import('../components/AnalyticsChart'), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>
});

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('grading');
  const [inputData, setInputData] = useState({ studentAnswer: '', questionText: '', rubric: '', subject: 'Programim' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/grading/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      const data = await res.json();
      setResult(data.data);
    } catch (err) {
      alert("Gabim gjatë lidhjes me serverin! Sigurohu që Backend-i po punon në portën 3000.");
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">AI Assistant</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <FileText size={20} /> Vlerësimi AI
          </button>
          <button onClick={() => setActiveTab('exams')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
            <LayoutDashboard size={20} /> Provimet
          </button>
          <button onClick={() => setActiveTab('analytics')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
            <BarChart3 size={20} /> Analitika
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-slate-500 text-sm font-medium">Studentë të Vlerësuar</p>
            <h4 className="text-3xl font-bold mt-1">1,284</h4>
            <span className="text-green-500 text-xs font-bold flex items-center gap-1 mt-1">
              <CheckCircle size={12} /> +12% këtë muaj
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-slate-500 text-sm font-medium">Mesatarja e Klasës</p>
            <h4 className="text-3xl font-bold mt-1">78.4%</h4>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4">
                <div className="bg-blue-600 h-2 rounded-full w-[78%] transition-all duration-1000"></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-slate-500 text-sm font-medium">Saktësia e AI</p>
            <h4 className="text-3xl font-bold mt-1">99.2%</h4>
            <span className="text-blue-500 text-xs font-bold uppercase mt-1 inline-block">Llama-3.3 Engine</span>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-10">
           <AnalyticsChart />
        </div>

        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Vlerësimi Automatik i Detyrave</h2>
          <p className="text-slate-500">Analizo përgjigjet e studentëve duke përdorur inteligjencën artificiale të Groq.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Card */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pyetja e Provimit</label>
                <textarea 
                  className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  rows="3"
                  placeholder="P.sh. Shpjegoni parimin e punës së motorit me djegie të brendshme..."
                  onChange={(e) => setInputData({...inputData, questionText: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Përgjigja e Studentit</label>
                <textarea 
                  className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  rows="5"
                  placeholder="Shkruaj përgjigjen e studentit këtu..."
                  onChange={(e) => setInputData({...inputData, studentAnswer: e.target.value})}
                ></textarea>
              </div>
              <button 
                onClick={handleGrade}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Duke procesuar...
                  </div>
                ) : (
                  <><Send size={18} /> Analizo me AI</>
                )}
              </button>
            </div>
          </section>

          {/* Result Card */}
          <section className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl min-h-[450px] relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
            
            {result ? (
              <div className="space-y-6 relative z-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-blue-100 italic">Raporti i Vlerësimit</h3>
                  <div className="text-right">
                    <span className="block text-xs uppercase text-slate-400 font-bold tracking-widest">Pikët Totale</span>
                    <span className="text-5xl font-black text-green-400">{result.score}<span className="text-xl text-slate-500">/100</span></span>
                  </div>
                </div>
                <div className="h-px bg-slate-800"></div>
                <div>
                  <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Komenti i Profesorit AI:
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-sm lg:text-base">
                    {result.feedback}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <h5 className="text-green-400 text-xs uppercase font-black mb-3 tracking-tighter">Pikat e Forta</h5>
                    <ul className="text-sm space-y-2 text-slate-300">
                      {result.strengths?.map((s, i) => <li key={i} className="flex items-start gap-2"><span>✅</span> {s}</li>)}
                    </ul>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                    <h5 className="text-red-400 text-xs uppercase font-black mb-3 tracking-tighter">Sugjerime për përmirësim</h5>
                    <ul className="text-sm space-y-2 text-slate-300">
                      {result.weaknesses?.map((w, i) => <li key={i} className="flex items-start gap-2"><span>💡</span> {w}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} className="opacity-20" />
                </div>
                <p className="text-center text-sm max-w-[200px]">Plotësoni të dhënat majtas për të gjeneruar vlerësimin.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}