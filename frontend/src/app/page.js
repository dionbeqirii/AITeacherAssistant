"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileText, GraduationCap, BarChart3, 
  Send, Sparkles, BrainCircuit, Database, AlertCircle, RefreshCw 
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Importimi Dinamik i Grafikut
const AnalyticsChart = dynamic(() => import('../components/AnalyticsChart'), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>
});

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('grading');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [inputData, setInputData] = useState({ 
    studentAnswer: '', 
    questionText: '', 
    rubric: '', 
    subject: 'Programim' 
  });

  const loadingMessages = [
    "Duke analizuar tekstin...",
    "Duke u konsultuar me Llama-3.3...",
    "Duke krahasuar me rubrikën...",
    "Duke gjeneruar pikat e forta...",
    "Po përfundoj raportin..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGrade = async () => {
    if (!inputData.questionText || !inputData.studentAnswer) {
      setError("Ju lutem plotësoni të paktën Pyetjen dhe Përgjigjen.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await fetch('http://127.0.0.1:3000/api/v1/grading/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (!res.ok) throw new Error(`Serveri ktheu statusin ${res.status}`);

      const data = await res.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        throw new Error(data.error || "Dështoi vlerësimi nga AI.");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" 
        ? "Lidhja dështoi. Sigurohu që Backend-i është i ndezur në portën 3000!" 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase italic">AI Assistant</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <FileText size={20} /> Vlerësimi AI
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
            <LayoutDashboard size={20} /> Provimet
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
            <BarChart3 size={20} /> Analitika
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Studentë të Vlerësuar</p>
            <h4 className="text-3xl font-black mt-1">1,284</h4>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-b-blue-500 border-b-4">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mesatarja e Klasës</p>
            <h4 className="text-3xl font-black mt-1 text-blue-600">78.4%</h4>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Saktësia e AI</p>
            <h4 className="text-3xl font-black mt-1">99.2%</h4>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-10 h-[350px]">
           <AnalyticsChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Side */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-blue-500" size={20} /> 
              Detajet e Detyrës
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Pyetja e Provimit</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                  rows="3"
                  placeholder="Shkruaj pyetjen këtu..."
                  onChange={(e) => setInputData({...inputData, questionText: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Përgjigja e Studentit</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-40 placeholder:text-slate-300"
                  placeholder="Ngjit përgjigjen e studentit..."
                  onChange={(e) => setInputData({...inputData, studentAnswer: e.target.value})}
                ></textarea>
              </div>
              
              <button 
                onClick={handleGrade}
                disabled={loading}
                className={`relative w-full overflow-hidden font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl 
                  ${loading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
                      <BrainCircuit className="animate-spin" size={20} />
                      <span>Duke Procesuar...</span>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2">
                      <Send size={18} />
                      <span>Analizo me AI</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </section>

          {/* Result / Loading / Error Side */}
          <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl min-h-[500px] relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-8">
                  <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-28 h-28 border-4 border-blue-500/10 border-t-blue-500 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="text-blue-400 animate-pulse" size={40} />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <motion.p key={statusIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-blue-50">
                      {loadingMessages[statusIndex]}
                    </motion.p>
                    <p className="text-slate-500 animate-pulse">Llama-3.3 po gjeneron raportin...</p>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/50">
                    <AlertCircle size={40} className="text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-red-50">Ndodhi një gabim</h3>
                    <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">{error}</p>
                  </div>
                  <button onClick={handleGrade} className="flex items-center gap-2 mx-auto text-blue-400 hover:text-blue-300 font-bold transition-all uppercase text-xs tracking-widest">
                    <RefreshCw size={14} /> Provo përsëri
                  </button>
                </motion.div>
              ) : result ? (
                <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Raporti i Vlerësimit</h3>
                      <p className="text-slate-400 text-sm italic">Gjeneruar nga AI Teaching Assistant</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl text-center border border-slate-700">
                      <span className="text-5xl font-black text-green-400">{result.score}</span>
                      <span className="block text-[10px] font-black text-slate-500 uppercase">Pikë / 100</span>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                  <div>
                    <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase">
                      <BrainCircuit size={16} /> Analiza e Përgjigjes
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-sm bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                      {result.feedback}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20">
                      <h5 className="text-green-400 text-[10px] font-black mb-3 uppercase tracking-widest">Pikat e Forta</h5>
                      <ul className="text-xs space-y-2 text-slate-300">
                        {result.strengths?.map((s, i) => <li key={i} className="flex items-start gap-2"><span>•</span> {s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                      <h5 className="text-red-400 text-[10px] font-black mb-3 uppercase tracking-widest">Për Përmirësim</h5>
                      <ul className="text-xs space-y-2 text-slate-300">
                        {result.weaknesses?.map((w, i) => <li key={i} className="flex items-start gap-2"><span>•</span> {w}</li>)}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center space-y-4">
                  <Database size={64} className="mx-auto text-slate-800" />
                  <div className="space-y-1">
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-tighter">Sistemi është gati</p>
                    <p className="text-slate-700 text-sm">Pritet hyrja e të dhënave nga profesori...</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>
    </div>
  );
}