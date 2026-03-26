"use client";
import React, { useState, useEffect, useRef } from 'react'; // Shtuar useRef këtu
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileText, GraduationCap, BarChart3, 
  Send, Sparkles, BrainCircuit, Database, AlertCircle, RefreshCw, LogOut, ChevronRight,
  Clock, Construction, Lock, History, CheckCircle2, AlertTriangle, Trash2, Lightbulb
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const AnalyticsChart = dynamic(() => import('../../components/AnalyticsChart'), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>
});

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState({ totalEvaluations: 0 });
  const [conversations, setConversations] = useState([]);
  const router = useRouter();

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

  // REFERENCE PËR SEKSIONIN E VLERËSIMIT
  const gradingAreaRef = useRef(null);

  const loadingMessages = [
    "Duke analizuar tekstin...",
    "Duke u konsultuar me Llama-3.3...",
    "Duke krahasuar me rubrikën...",
    "Duke gjeneruar pikat e forta...",
    "Po përfundoj raportin..."
  ];

  // FUNKSIONI PËR RESETIMIN E FUSHAVE
  const resetGradingFields = () => {
    setResult(null);
    setError(null);
    setInputData({ 
      studentAnswer: '', 
      questionText: '', 
      rubric: '', 
      subject: 'Programim' 
    });
  };

  // LOGJIKA PËR TË DIJTUR KUR KLIKON JASHTË
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Nëse jemi te tabi grading dhe klikojmë jashtë zonës së vlerësimit
      if (activeTab === 'grading' && 
          gradingAreaRef.current && 
          !gradingAreaRef.current.contains(event.target)) {
        resetGradingFields();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab]);

  const fetchHistory = async (userId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setConversations(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setStats({ totalEvaluations: count || 0 });
        fetchHistory(user.id);
      }
      setAuthLoading(false);
    };
    checkUser();
  }, [router]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      alert("Gabim nga databaza: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("Databaza bllokoi fshirjen!");
      return;
    }

    setConversations(conversations.filter(c => c.id !== id));
    setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations - 1 }));
  };

  const loadConversation = async (conv) => {
    setLoading(true);
    setError(null);
    setActiveTab('grading');

    try {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      if (messages && messages.length >= 2) {
        try {
          const aiData = JSON.parse(messages[1].content);
          setResult(aiData);
        } catch (e) {
          setResult({ feedback: messages[1].content, score: "N/A" });
        }

        const userText = messages[0].content;
        if (userText.includes('|')) {
            const parts = userText.split('|');
            const q = parts[0].replace('Pyetja: ', '').trim();
            const a = parts[1].replace('Përgjigja: ', '').trim();
            setInputData(prev => ({ ...prev, questionText: q, studentAnswer: a }));
        }
      }
    } catch (err) {
      setError("Dështoi ngarkimi i historikut.");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!inputData.questionText || !inputData.studentAnswer) {
      setError("Ju lutem plotësoni të paktën Pyetjen dhe Përgjigjen.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
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
        try {
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .insert([{ 
              user_id: user.id, 
              title: `Vlerësim: ${inputData.questionText.substring(0, 30)}...` 
            }])
            .select().single();

          if (!convError) {
            await supabase.from('messages').insert([
              { conversation_id: convData.id, role: 'user', content: `Pyetja: ${inputData.questionText} | Përgjigja: ${inputData.studentAnswer}` },
              { conversation_id: convData.id, role: 'assistant', content: JSON.stringify(data.data) }
            ]);
            setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations + 1 }));
            fetchHistory(user.id);
          }
        } catch (dbErr) { console.error("Gabim në DB:", dbErr); }
      } else {
        throw new Error(data.error || "Dështoi vlerësimi nga AI.");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Lidhja dështoi!" : err.message);
    } finally { setLoading(false); }
  };

  if (authLoading || !user) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold uppercase italic tracking-widest text-blue-600">Autentifikimi...</div>;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <GraduationCap size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase italic">AI Assistant</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => { setActiveTab('grading'); resetGradingFields(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <FileText size={20} /> Vlerësimi AI
          </button>
          <button onClick={() => setActiveTab('exams')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'exams' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <div className="flex items-center gap-3"><Sparkles size={20} /> Provimet</div>
            {activeTab !== 'exams' && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold tracking-tighter">SOON</span>}
          </button>
          <button onClick={() => setActiveTab('analytics_soon')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics_soon' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}>
            <div className="flex items-center gap-3"><BarChart3 size={20} /> Analitika</div>
            {activeTab !== 'analytics_soon' && <span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold tracking-tighter">SOON</span>}
          </button>
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold uppercase text-xs italic tracking-widest"><LogOut size={20} /> Dilni</button>
      </aside>

      <main className="flex-1 overflow-y-auto p-10">
        <AnimatePresence mode="wait">
          
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Mirëseerdhe, {user.email.split('@')[0]} !</h2>
                <p className="text-slate-400 text-sm font-medium italic">Statistikat e AI Teaching Assistant</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-center">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Vlerësime Totale</p>
                  <h4 className="text-3xl font-black mt-1 tracking-tighter">{stats.totalEvaluations}</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-b-blue-500 border-b-4">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mesatarja e Klasës</p>
                  <h4 className="text-3xl font-black mt-1 text-blue-600 tracking-tighter">78.4%</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Saktësia AI</p>
                  <h4 className="text-3xl font-black mt-1 tracking-tighter">99.2%</h4>
                </div>
              </div>
              <div className="mb-10 h-[350px] bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <AnalyticsChart />
              </div>
            </motion.div>
          )}

          {activeTab === 'grading' && (
            <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              {/* MBËSHTJELLËSI ME REF PËR CLICK OUTSIDE */}
              <div ref={gradingAreaRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><Sparkles className="text-blue-500" size={20} /> Detajet e Detyrës</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase mb-2 italic">Pyetja e Provimit</label>
                      <textarea value={inputData.questionText} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" rows="3" placeholder="Shkruaj pyetjen këtu..." onChange={(e) => setInputData({...inputData, questionText: e.target.value})}></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase mb-2 italic">Përgjigja e Studentit</label>
                      <textarea value={inputData.studentAnswer} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-40 font-medium" placeholder="Ngjit përgjigjen e studentit..." onChange={(e) => setInputData({...inputData, studentAnswer: e.target.value})}></textarea>
                    </div>
                    <button onClick={handleGrade} disabled={loading} className={`relative w-full font-black uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div key="l" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2"><BrainCircuit className="animate-spin" size={20} /> <span>Duke Procesuar...</span></motion.div>
                        ) : (
                          <motion.div key="s" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2"><Send size={18} /> <span>Analizo me AI</span></motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </section>

                <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl min-h-[500px] relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-8 text-center">
                        <div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-28 h-28 border-4 border-blue-500/10 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-400 animate-pulse" size={40} /></div></div>
                        <div className="space-y-2"><motion.p key={statusIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-blue-50 italic uppercase tracking-tighter">{loadingMessages[statusIndex]}</motion.p></div>
                      </motion.div>
                    ) : result ? (
                      <motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex items-center justify-between">
                          <div><h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1 italic">Raporti i Vlerësimit</h3><p className="text-slate-400 text-sm italic italic tracking-tight">GPT is AI and can makeOpen mistakes.</p></div>
                          <div className="bg-slate-800 p-4 rounded-2xl text-center border border-slate-700 shadow-inner"><span className="text-5xl font-black text-green-400">{result.score}</span><span className="block text-[10px] font-black text-slate-500 uppercase italic">Pikë</span></div>
                        </div>
                        <div className="h-px bg-slate-700"></div>
                        <div><h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-sm uppercase italic tracking-tighter"><BrainCircuit size={16} /> Analiza e AI</h4><p className="text-slate-300 text-sm italic bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 leading-relaxed">{result.feedback}</p></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20">
                            <h5 className="text-green-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><CheckCircle2 size={12}/> Pikat e Forta</h5>
                            <ul className="text-xs space-y-2 text-slate-400 font-medium">
                              {result.strengths?.map((s, i) => <li key={i}>• {s}</li>) || <li>Nuk u identifikuan.</li>}
                            </ul>
                          </div>
                          <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                            <h5 className="text-red-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><AlertTriangle size={12}/> Sugjerime</h5>
                            <ul className="text-xs space-y-2 text-slate-400 font-medium">
                              {result.weaknesses?.map((w, i) => <li key={i}>• {w}</li>) || <li>Përgjigje e saktë.</li>}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center opacity-30"><Database size={64} className="mx-auto mb-4" /><p className="font-black uppercase text-xs italic tracking-widest">Sistemi gati për analizë</p></div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              <div className="mt-12">
                <div className="flex items-center gap-4 mb-8">
                   <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><History size={24} className="text-blue-600" /> Historiku i Vlerësimeve</h3>
                   <div className="h-px flex-1 bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {conversations.length > 0 ? conversations.map((conv) => (
                      <motion.div 
                        key={conv.id} 
                        onClick={() => loadConversation(conv)}
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all relative cursor-pointer"
                      >
                         <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase italic">{new Date(conv.created_at).toLocaleDateString()}</span>
                            <button onClick={(e) => deleteConversation(e, conv.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                         </div>
                         <p className="text-sm font-bold text-slate-700 mb-4 uppercase italic tracking-tighter line-clamp-2">{conv.title}</p>
                         <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase italic">
                            <span>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <div className="flex items-center gap-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">Shiko <ChevronRight size={12} /></div>
                         </div>
                      </motion.div>
                   )) : (
                     <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400 font-bold uppercase text-xs tracking-widest">Nuk ka vlerësime të ruajtura ende.</div>
                   )}
                </div>
              </div>
            </motion.div>
          )}

          {(activeTab === 'exams' || activeTab === 'analytics_soon') && (
            <motion.div key="soon" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex items-center justify-center">
              <div className="text-center bg-white p-16 rounded-[48px] border border-slate-100 shadow-2xl max-w-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
                <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                  {activeTab === 'exams' ? <Construction size={40} /> : <Lock size={40} />}
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tighter uppercase italic">Së Shpejti...</h2>
                <p className="text-slate-500 font-medium leading-relaxed italic">
                  Moduli i <span className="text-blue-600 font-bold italic">{activeTab === 'exams' ? "Gjenerimit të Provimeve" : "Analitikës së Detajuar"}</span> është në fazë zhvillimi.
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest animate-pulse italic">
                  <Clock size={16} /> Duke punuar në të
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}