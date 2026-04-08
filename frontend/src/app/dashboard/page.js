"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileText, GraduationCap, BarChart3, 
  Send, Sparkles, BrainCircuit, Database, RefreshCw, LogOut, ChevronRight,
  Clock, Construction, Lock, History, CheckCircle2, AlertTriangle, Trash2,
  User, Bell, X, Camera, Shield, UserCircle, Menu, Download, BookOpen, Layers, ListOrdered,
  MessageSquare, Star
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const AnalyticsChart = dynamic(() => import('../../components/AnalyticsChart'), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>
});

// ─── KONSTANTE PER VALIDIM ────────────────────────────────────────────────────
const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 100;
const MAX_TOPIC_LENGTH = 200;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState({ totalEvaluations: 0 });
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    currentPassword: '',
    newPassword: '',
    avatarPreview: null,
    avatarFile: null
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusIndex, setStatusIndex] = useState(0);

  // ─── EDGE CASE 1: double submit guard ─────────────────────────────────────
  const isSubmitting = useRef(false);

  // ─── EDGE CASE 2: validim errors per field ────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});
  const [materialFieldErrors, setMaterialFieldErrors] = useState({});

  // ─── EDGE CASE 3: error specifik per API / network ───────────────────────
  const [apiError, setApiError] = useState(null);

  // ─── FEEDBACK MODAL STATE & LOGIC ───────────────────────────────────────
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, message: '' });
  const [feedbackStatus, setFeedbackStatus] = useState({ type: 'idle', text: '' }); // idle, loading, success, error
  const feedbackRef = useRef(null);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) {
      setFeedbackStatus({ type: 'error', text: 'Ju lutem zgjidhni një vlerësim me yje!' });
      return;
    }
    if (!feedbackForm.message.trim()) {
      setFeedbackStatus({ type: 'error', text: 'Mesazhi nuk mund të jetë bosh!' });
      return;
    }

    setFeedbackStatus({ type: 'loading', text: '' });
    try {
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackForm.rating,
          message: feedbackForm.message,
          userId: user.id,
          fullName: profileForm.fullName || user.email
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Dërgimi dështoi.");

      setFeedbackStatus({ type: 'success', text: 'Feedback-u u dërgua me sukses! Faleminderit.' });
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackForm({ rating: 0, message: '' });
        setFeedbackStatus({ type: 'idle', text: '' });
      }, 2500);
    } catch (err) {
      setFeedbackStatus({ type: 'error', text: err.message });
    }
  };

  // State per AI Grading
  const [inputData, setInputData] = useState({ 
    studentAnswer: '', 
    questionText: '', 
    rubric: '', 
    subject: 'Programming' 
  });

  // State per Exam Generation
  const [examInput, setExamInput] = useState({
    subject: '',
    level: '',
    topic: '',
    numQuestions: 5
  });
  const [examQuestions, setExamQuestions] = useState(null);

  // State per Learning Materials
  const [materialInput, setMaterialInput] = useState({
    subject: '',
    level: '',
    topic: '',
    materialType: 'summary'
  });
  const [generatedMaterial, setGeneratedMaterial] = useState(null);

  const gradingAreaRef = useRef(null);

  const loadingMessages = [
    "Analyzing text...",
    "Consulting AI..",
    "Comparing with rubric...",
    "Generating strengths...",
    "Finalizing report..."
  ];

  const resetGradingFields = () => {
    setResult(null);
    setError(null);
    setFieldErrors({});
    setApiError(null);
    setInputData({ 
      studentAnswer: '', 
      questionText: '', 
      rubric: '', 
      subject: 'Programming' 
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTab === 'grading' && gradingAreaRef.current && !gradingAreaRef.current.contains(event.target) && !result && !loading) {
        resetGradingFields();
      }
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (isFeedbackOpen && feedbackRef.current && !feedbackRef.current.contains(event.target)) {
        setIsFeedbackOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab, isProfileOpen, isFeedbackOpen, result, loading]);

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
        setProfileForm(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.email.split('@')[0],
          avatarPreview: user.user_metadata?.avatar_url || null
        }));
        
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

  // ─── EDGE CASE: session expiry check ─────────────────────────────────────
  const checkSessionAndRun = useCallback(async (fn) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setApiError("Sesioni juaj ka skaduar. Po ju ridrejtojmë tek login...");
      setTimeout(() => router.push('/login'), 2000);
      return;
    }
    await fn();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ─── VALIDIM PER GRADING ─────────────────────────────────────────────────
  const validateGradingInputs = () => {
    const errors = {};

    // EDGE CASE 1: input bosh
    if (!inputData.questionText.trim()) {
      errors.questionText = "Pyetja nuk mund të jetë bosh.";
    }
    if (!inputData.studentAnswer.trim()) {
      errors.studentAnswer = "Përgjigja e studentit nuk mund të jetë bosh.";
    }

    // EDGE CASE 2: input shumë i gjatë
    if (inputData.questionText.length > MAX_QUESTION_LENGTH) {
      errors.questionText = `Pyetja nuk mund të kalojë ${MAX_QUESTION_LENGTH} karaktere. (${inputData.questionText.length}/${MAX_QUESTION_LENGTH})`;
    }
    if (inputData.studentAnswer.length > MAX_ANSWER_LENGTH) {
      errors.studentAnswer = `Përgjigja nuk mund të kalojë ${MAX_ANSWER_LENGTH} karaktere. (${inputData.studentAnswer.length}/${MAX_ANSWER_LENGTH})`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── VALIDIM PER MATERIALS ───────────────────────────────────────────────
  const validateMaterialInputs = () => {
    const errors = {};

    if (!materialInput.subject.trim()) {
      errors.subject = "Lënda nuk mund të jetë bosh.";
    }
    if (!materialInput.topic.trim()) {
      errors.topic = "Tema nuk mund të jetë bosh.";
    }
    if (materialInput.subject.length > MAX_SUBJECT_LENGTH) {
      errors.subject = `Lënda nuk mund të kalojë ${MAX_SUBJECT_LENGTH} karaktere.`;
    }
    if (materialInput.topic.length > MAX_TOPIC_LENGTH) {
      errors.topic = `Tema nuk mund të kalojë ${MAX_TOPIC_LENGTH} karaktere.`;
    }

    setMaterialFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // LOGJIKA PER GENERATE EXAM
  const handleGenerateExam = async () => {
    if (!examInput.topic || !examInput.subject) {
      alert("Ju lutem plotësoni Lëndën dhe Temën.");
      return;
    }
    setLoading(true);
    setExamQuestions(null);
    try {
      const res = await fetch('/api/v1/exams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examInput),
      });
      const data = await res.json();
      if (data.success) {
        setExamQuestions(data.questions);
      } else {
        alert("Gabim gjatë gjenerimit: " + data.error);
      }
    } catch (err) {
      alert("Gabim teknik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // LOGJIKA PER DOWNLOAD PDF
  const handleDownloadMaterialPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text(materialInput.subject.toUpperCase(), 20, 20);
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`Tema: ${materialInput.topic}`, 20, 30);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(60);
    const splitText = doc.splitTextToSize(generatedMaterial, 170);
    doc.text(splitText, 20, 45);
    doc.save(`Material_${materialInput.topic}.pdf`);
  };

  // ─── EDGE CASES: double submit + API failure + session + network ──────────
  const handleGenerateMaterials = async () => {
    if (!validateMaterialInputs()) return;

    // EDGE CASE: double submit guard
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setLoading(true);
    setGeneratedMaterial(null);
    setApiError(null);

    await checkSessionAndRun(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch('/api/v1/materials/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(materialInput),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // EDGE CASE: API failure - status jo 200
        if (!res.ok) {
          if (res.status === 401) {
            setApiError("Sesioni ka skaduar. Po ju ridrejtojmë...");
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
          if (res.status === 429) {
            setApiError("Shumë kërkesa njëherësh. Ju lutem prisni pak sekonda dhe provoni përsëri.");
            return;
          }
          if (res.status >= 500) {
            setApiError("Serveri ka një problem teknik. Ju lutem provoni përsëri pas pak.");
            return;
          }
          throw new Error(`Gabim i serverit: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          setGeneratedMaterial(data.content); 
        } else {
          setApiError("Gabim gjatë gjenerimit: " + (data.error || "E panjohur"));
        }
      } catch (err) {
        // EDGE CASE: network error / timeout
        if (err.name === 'AbortError') {
          setApiError("Kërkesa mori shumë kohë. Kontrolloni lidhjen tuaj dhe provoni përsëri.");
        } else if (!navigator.onLine) {
          setApiError("Nuk ka lidhje interneti. Kontrolloni rrjetin tuaj.");
        } else {
          setApiError("Gabim i lidhjes: " + err.message);
        }
      }
    });

    setLoading(false);
    isSubmitting.current = false;
  };

  // LOGJIKA PER DOWNLOAD WORD - FRONTEND ONLY
  const handleDownloadMaterialWord = () => {
    try {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
        "xmlns:w='urn:schemas-microsoft-com:office:word' "+
        "xmlns='http://www.w3.org/TR/REC-html40'>"+
        "<head><meta charset='utf-8'><title>Export HTML to Doc</title></head><body>";
      const footer = "</body></html>";
      const html = header + 
                   "<h1 style='color: #1e3a8a; font-family: Arial;'>"+ materialInput.subject.toUpperCase() +"</h1>" +
                   "<h3 style='color: #64748b; font-family: Arial;'>Tema: "+ materialInput.topic +"</h3>" +
                   "<hr>" +
                   "<p style='font-family: Georgia; line-height: 1.6; white-space: pre-wrap;'>"+ generatedMaterial +"</p>" + 
                   footer;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Material_${materialInput.topic}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setApiError("Gabim gjatë shkarkimit: " + err.message);
    }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    if(!confirm("Are you sure?")) return;
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) { alert("Error: " + error.message); return; }
    setConversations(conversations.filter(c => c.id !== id));
    setStats(prev => ({ ...prev, totalEvaluations: Math.max(0, prev.totalEvaluations - 1) }));
  };

  const loadConversation = async (conv) => {
    setLoading(true); setError(null); setActiveTab('grading');
    try {
      const { data: messages, error: msgError } = await supabase
        .from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (messages && messages.length >= 2) {
        try { 
          const content = JSON.parse(messages[1].content);
          setResult(content); 
        } catch (e) { 
          setResult({ feedback: messages[1].content, score: "N/A" }); 
        }
        const userText = messages[0].content;
        if (userText.includes('|')) {
            const parts = userText.split('|');
            const q = parts[0].replace('Question: ', '').trim();
            const a = parts[1].replace('Answer: ', '').trim();
            setInputData(prev => ({ ...prev, questionText: q, studentAnswer: a }));
        }
      }
    } catch (err) { setError("Failed to load history."); } finally { setLoading(false); }
  };

  // ─── EDGE CASES: double submit + session + API failure + network per grading
  const handleGrade = async () => {
    if (!validateGradingInputs()) return;

    // EDGE CASE: double submit guard
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setLoading(true);
    setError(null);
    setResult(null);
    setApiError(null);

    await checkSessionAndRun(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch('/api/v1/grading/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputData),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // EDGE CASE: API failure
        if (!res.ok) {
          if (res.status === 401) {
            setError("Sesioni ka skaduar. Po ju ridrejtojmë...");
            setTimeout(() => router.push('/login'), 2000);
            return;
          }
          if (res.status === 429) {
            setError("Shumë kërkesa. Ju lutem prisni pak sekonda.");
            return;
          }
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          setResult(data.data);
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .insert([{ user_id: user.id, title: `Evaluation: ${inputData.questionText.substring(0, 30)}...` }])
            .select().single();
          if (convError) throw convError;
          await supabase.from('messages').insert([
            { conversation_id: convData.id, role: 'user', content: `Question: ${inputData.questionText} | Answer: ${inputData.studentAnswer}` },
            { conversation_id: convData.id, role: 'assistant', content: JSON.stringify(data.data) }
          ]);
          setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations + 1 }));
          fetchHistory(user.id);
        } else {
          throw new Error(data.error || "Evaluation failed.");
        }
      } catch (err) {
        // EDGE CASE: network error / timeout
        if (err.name === 'AbortError') {
          setError("Kërkesa mori shumë kohë. Kontrolloni lidhjen tuaj.");
        } else if (!navigator.onLine) {
          setError("Nuk ka lidhje interneti. Kontrolloni rrjetin tuaj.");
        } else {
          setError(err.message);
        }
      }
    });

    setLoading(false);
    isSubmitting.current = false;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let avatarUrl = profileForm.avatarPreview;
      if (profileForm.avatarFile) {
        const fileExt = profileForm.avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('profiles').upload(filePath, profileForm.avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: profileForm.fullName, avatar_url: avatarUrl }
      });
      if (updateError) throw updateError;
      if (profileForm.newPassword) {
        if (!profileForm.currentPassword) throw new Error("Current password is required!");
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email, password: profileForm.currentPassword
        });
        if (verifyError) throw new Error("Invalid current password!");
        const { error: pwdError } = await supabase.auth.updateUser({ password: profileForm.newPassword });
        if (pwdError) throw pwdError;
      }
      alert("Profile successfully updated!");
      setIsProfileOpen(false);
      window.location.reload();
    } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  const renderedProfileModal = useMemo(() => (
    <AnimatePresence>
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div ref={profileRef} initial={{ scale: 0.97, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 10 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative">
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={20}/></button>
              <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
                <div className="w-full h-full bg-white/20 rounded-3xl flex items-center justify-center border-2 border-white/30 overflow-hidden shadow-lg">
                  {profileForm.avatarPreview ? <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-white/80"/>}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"><Camera size={24} className="text-white" /></div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { const file = e.target.files[0]; if(file) setProfileForm({...profileForm, avatarPreview: URL.createObjectURL(file), avatarFile: file}); }} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight truncate px-4">{profileForm.fullName || user?.email.split('@')[0]}</h3>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">{user?.email}</p>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-6 md:p-8 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><UserCircle size={14}/> Full Name</label>
                <input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Shield size={14}/> Current Password</label>
                <input type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Shield size={14}/> New Password</label>
                <input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsProfileOpen(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-slate-100 text-slate-500">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-blue-600 text-white shadow-lg">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ), [isProfileOpen, profileForm, loading, user]);

  const renderedFeedbackModal = useMemo(() => (
    <AnimatePresence>
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div ref={feedbackRef} initial={{ scale: 0.97, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 10 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
            
            <div className="bg-slate-900 p-8 text-white text-center relative">
              <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <MessageSquare size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Na dërgoni Feedback</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Mendimi juaj na ndihmon!</p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="p-6 md:p-8">
              
              {/* Star Rating System */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                    className={`p-2 transition-all hover:scale-110 active:scale-95 ${feedbackForm.rating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-slate-200'}`}
                  >
                    <Star size={32} fill={feedbackForm.rating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Mesazhi ose Sugjerimi</label>
                <textarea 
                  rows="4" 
                  value={feedbackForm.message} 
                  onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})} 
                  placeholder="Çfarë mund të përmirësojmë?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Messages */}
              <AnimatePresence>
                {feedbackStatus.type !== 'idle' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <p className={`text-[10px] font-black uppercase tracking-widest italic text-center p-2 rounded-xl ${
                      feedbackStatus.type === 'error' ? 'text-red-500 bg-red-50' : 
                      feedbackStatus.type === 'success' ? 'text-green-500 bg-green-50' : 'text-blue-500 bg-blue-50 animate-pulse'
                    }`}>
                      {feedbackStatus.type === 'loading' ? 'Po dërgohet...' : feedbackStatus.text}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsFeedbackOpen(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">Anulo</button>
                <button type="submit" disabled={feedbackStatus.type === 'loading'} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={16} /> Dërgo
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ), [isFeedbackOpen, feedbackForm, feedbackStatus]);

  if (authLoading || !user) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold uppercase italic tracking-widest text-blue-600">Authenticating...</div>;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-xl transition-transform duration-300 md:relative md:translate-x-0 md:shadow-sm shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                    <GraduationCap size={24} />
                </div>
                <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase italic">AI Assistant</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20}/></button>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => { setActiveTab('grading'); resetGradingFields(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><FileText size={20} /> AI Grading</button>
          <button 
            onClick={() => { 
              router.push('/dashboard/exams');
              setIsSidebarOpen(false); 
            }} 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-100 text-slate-500"
          >
            <Sparkles size={20} /> AI Exams
          </button>
          <button onClick={() => { setActiveTab('learning_materials'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'learning_materials' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><BookOpen size={20} /> AI Materials</button>
          <button onClick={() => { setActiveTab('analytics_soon'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics_soon' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><div className="flex items-center gap-3"><BarChart3 size={20} /> Analytics</div><span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold tracking-tighter">SOON</span></button>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
          <button onClick={() => { setIsFeedbackOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold uppercase text-xs italic tracking-widest">
            <MessageSquare size={20} /> Feedback
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold uppercase text-xs italic tracking-widest">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 bg-white rounded-xl shadow-sm border border-slate-100"><Menu size={20}/></button>
                <div className="flex flex-col">
                    <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight italic uppercase leading-none truncate max-w-[150px] md:max-w-none">Welcome, {profileForm.fullName.split(' ')[0]}!</h2>
                    <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase italic tracking-widest mt-1 opacity-70">AI Teaching Assistant</p>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <button className="hidden sm:block p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 md:gap-3 pl-1 pr-2 md:pl-2 md:pr-4 py-1 md:py-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm transition-all active:scale-95">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 overflow-hidden flex items-center justify-center text-white shadow-md shadow-blue-100">
                        {profileForm.avatarPreview ? <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={16} />}
                    </div>
                    <div className="text-left hidden lg:block">
                        <p className="text-[9px] font-black text-slate-400 uppercase italic leading-none mb-1">Profile</p>
                        <p className="text-xs font-bold text-slate-700 leading-none truncate max-w-[80px]">{profileForm.fullName}</p>
                    </div>
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10 text-center">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Evaluations</p><h4 className="text-2xl md:text-3xl font-black mt-1 tracking-tighter">{stats.totalEvaluations}</h4></div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-b-blue-500 border-b-4"><p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">Class Average</p><h4 className="text-2xl md:text-3xl font-black mt-1 text-blue-600 tracking-tighter">78.4%</h4></div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sm:col-span-2 md:col-span-1"><p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">AI Accuracy</p><h4 className="text-2xl md:text-3xl font-black mt-1 tracking-tighter">99.2%</h4></div>
                </div>
                <div className="mb-10 h-[300px] md:h-[350px] bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><AnalyticsChart /></div>
              </motion.div>
            )}

            {activeTab === 'grading' && (
              <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Loading / Error states të qarta */}
                {(error || apiError) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{error || apiError}</span>
                  </motion.div>
                )}
                <div ref={gradingAreaRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12">
                  <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><Sparkles className="text-blue-500" size={20} /> Task Details</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">Exam Question</label>
                        <textarea
                          value={inputData.questionText}
                          className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm md:text-base ${fieldErrors.questionText ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          rows="3"
                          placeholder="Type question here..."
                          maxLength={MAX_QUESTION_LENGTH}
                          onChange={(e) => {
                            setInputData({...inputData, questionText: e.target.value});
                            if (fieldErrors.questionText) setFieldErrors(p => ({...p, questionText: null}));
                          }}
                        />
                        {/* Character counter — tregon kur afrohet limiti */}
                        <div className="flex justify-between mt-1">
                          {fieldErrors.questionText
                            ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.questionText}</p>
                            : <span />
                          }
                          <span className={`text-[10px] font-bold italic ${inputData.questionText.length > MAX_QUESTION_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>
                            {inputData.questionText.length}/{MAX_QUESTION_LENGTH}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">Student Answer</label>
                        <textarea
                          value={inputData.studentAnswer}
                          className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 md:h-40 font-medium text-sm md:text-base ${fieldErrors.studentAnswer ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          placeholder="Paste student answer..."
                          maxLength={MAX_ANSWER_LENGTH}
                          onChange={(e) => {
                            setInputData({...inputData, studentAnswer: e.target.value});
                            if (fieldErrors.studentAnswer) setFieldErrors(p => ({...p, studentAnswer: null}));
                          }}
                        />
                        <div className="flex justify-between mt-1">
                          {fieldErrors.studentAnswer
                            ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.studentAnswer}</p>
                            : <span />
                          }
                          <span className={`text-[10px] font-bold italic ${inputData.studentAnswer.length > MAX_ANSWER_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>
                            {inputData.studentAnswer.length}/{MAX_ANSWER_LENGTH}
                          </span>
                        </div>
                      </div>

                      {/* EDGE CASE double submit: butoni disabled gjatë loading */}
                      <button
                        onClick={handleGrade}
                        disabled={loading || isSubmitting.current}
                        className={`relative w-full font-black uppercase tracking-widest py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}
                      >
                        <AnimatePresence mode="wait">
                          {loading ? (
                            <motion.div key="l" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2 text-sm md:text-base"><BrainCircuit className="animate-spin" size={20} /> <span>Processing...</span></motion.div>
                          ) : (
                            <motion.div key="s" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 text-sm md:text-base"><Send size={18} /> <span>Analyze with AI</span></motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </section>

                  <section className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl min-h-[400px] md:min-h-[500px] relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-8 text-center">
                          <div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-20 h-20 md:w-28 md:h-28 border-4 border-blue-500/10 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-400 animate-pulse" size={30} /></div></div>
                          <div className="space-y-2"><motion.p key={statusIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg md:text-2xl font-bold text-blue-50 italic uppercase tracking-tighter">{loadingMessages[statusIndex]}</motion.p></div>
                        </motion.div>
                      ) : result ? (
                        <motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
                          <div className="flex items-center justify-between">
                            <div className="max-w-[60%]"><h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Evaluation Report</h3><p className="text-slate-400 text-[10px] md:text-sm italic tracking-tight leading-tight">AI can make mistakes.</p></div>
                            <div className="bg-slate-800 p-3 md:p-4 rounded-2xl text-center border border-slate-700 shadow-inner"><span className="text-3xl md:text-5xl font-black text-green-400">{result.score}</span><span className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase italic">Points</span></div>
                          </div>
                          <div className="h-px bg-slate-700"></div>
                          <div><h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-xs md:text-sm uppercase italic tracking-tighter"><BrainCircuit size={16} /> AI Analysis</h4><p className="text-slate-300 text-xs md:text-sm italic bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 leading-relaxed max-h-40 overflow-y-auto">{result.feedback}</p></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20">
                              <h5 className="text-green-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><CheckCircle2 size={12}/> Strengths</h5>
                              <ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.strengths?.map((s, i) => <li key={i}>• {s}</li>) || <li>None identified.</li>}</ul>
                            </div>
                            <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20">
                              <h5 className="text-red-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><AlertTriangle size={12}/> Suggestions</h5>
                              <ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.weaknesses?.map((w, i) => <li key={i}>• {w}</li>) || <li>Correct answer.</li>}</ul>
                            </div>
                          </div>
                        </motion.div>
                      ) : <div className="text-center opacity-30"><Database size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] italic tracking-widest">System ready</p></div>}
                    </AnimatePresence>
                  </section>
                </div>
                
                <div className="mt-8 md:mt-12">
                  <div className="flex items-center gap-4 mb-8">
                     <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><History size={20} className="text-blue-600" /> History</h3>
                     <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                     {conversations.length > 0 ? conversations.map((conv) => (
                        <motion.div key={conv.id} onClick={() => loadConversation(conv)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all relative cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                               <span className="text-[8px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase italic">{new Date(conv.created_at).toLocaleDateString()}</span>
                               <button onClick={(e) => deleteConversation(e, conv.id)} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                            </div>
                            <p className="text-xs md:text-sm font-bold text-slate-700 mb-4 uppercase italic tracking-tighter line-clamp-2">{conv.title}</p>
                            <div className="flex items-center justify-between text-[8px] md:text-[10px] text-slate-400 font-black uppercase italic">
                               <span>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               <div className="flex items-center gap-1 text-blue-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all lg:translate-x-2 lg:group-hover:translate-x-0">View <ChevronRight size={12} /></div>
                            </div>
                        </motion.div>
                     )) : <div className="col-span-full py-10 md:py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400 font-bold uppercase text-[10px] md:text-xs tracking-widest">No saved evaluations yet.</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'exams' && (
              <motion.div key="exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><Sparkles className="text-blue-500" size={20} /> Generate Exam</h2>
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> Subject</label>
                        <input type="text" placeholder="e.g. Java Programming" value={examInput.subject} onChange={(e) => setExamInput({...examInput, subject: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> Level</label>
                        <input type="text" placeholder="e.g. 2nd Year University" value={examInput.level} onChange={(e) => setExamInput({...examInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> Topic</label>
                        <input type="text" placeholder="e.g. Loops & Arrays" value={examInput.topic} onChange={(e) => setExamInput({...examInput, topic: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><ListOrdered size={14}/> Questions Count</label>
                        <input type="number" value={examInput.numQuestions} onChange={(e) => setExamInput({...examInput, numQuestions: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" />
                      </div>
                      <button onClick={handleGenerateExam} disabled={loading} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={18} />}
                        <span>Gjenero Pyetjet</span>
                      </button>
                    </div>
                  </section>
                  <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 flex items-center gap-2"><LayoutDashboard size={18} /> Exam Preview</h3>
                    </div>
                    <div className="p-8 flex-1 overflow-y-auto">
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                             <BrainCircuit size={48} className="text-blue-600 animate-bounce" />
                             <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">AI po krijon pyetjet...</p>
                          </motion.div>
                        ) : examQuestions ? (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {examQuestions.map((q, idx) => (
                              <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-[10px] font-black text-blue-500 uppercase italic mb-1 block">Question {idx + 1}</span>
                                <p className="text-slate-800 font-bold italic">{q}</p>
                              </div>
                            ))}
                          </motion.div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                            <Construction size={64} />
                            <p className="font-black uppercase italic text-xs tracking-widest">Plotëso formën për të filluar</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {/* TAB-I PER LEARNING MATERIALS */}
            {activeTab === 'learning_materials' && (
              <motion.div key="learning_materials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Error state i qartë për materials */}
                {apiError && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{apiError}</span>
                    <button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600 shrink-0"><X size={14}/></button>
                  </motion.div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><BookOpen className="text-blue-500" size={20} /> Gjenero Materiale</h2>
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> Lënda</label>
                        <input
                          type="text"
                          placeholder="p.sh. Matematikë"
                          value={materialInput.subject}
                          maxLength={MAX_SUBJECT_LENGTH}
                          onChange={(e) => {
                            setMaterialInput({...materialInput, subject: e.target.value});
                            if (materialFieldErrors.subject) setMaterialFieldErrors(p => ({...p, subject: null}));
                          }}
                          className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                        />
                        {materialFieldErrors.subject && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.subject}</p>}
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> Niveli</label>
                        <input type="text" placeholder="p.sh. Klasa 10" value={materialInput.level} onChange={(e) => setMaterialInput({...materialInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> Tema</label>
                        <input
                          type="text"
                          placeholder="p.sh. Trigonometria"
                          value={materialInput.topic}
                          maxLength={MAX_TOPIC_LENGTH}
                          onChange={(e) => {
                            setMaterialInput({...materialInput, topic: e.target.value});
                            if (materialFieldErrors.topic) setMaterialFieldErrors(p => ({...p, topic: null}));
                          }}
                          className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.topic ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                        />
                        {materialFieldErrors.topic && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.topic}</p>}
                      </div>
                      {/* EDGE CASE double submit: disabled gjatë loading */}
                      <button
                        onClick={handleGenerateMaterials}
                        disabled={loading || isSubmitting.current}
                        className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}
                      >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={18} />}
                        <span>{loading ? 'Duke gjeneruar...' : 'Gjenero Materialin'}</span>
                      </button>
                    </div>
                  </section>

                  <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 flex items-center gap-2"><BookOpen size={18} /> Material Preview</h3>
                      {generatedMaterial && (
                        <div className="flex gap-2">
                          <button 
                            onClick={handleDownloadMaterialWord}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <Download size={14} /> Word
                          </button>
                          <button 
                            onClick={handleDownloadMaterialPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100"
                          >
                            <FileText size={14} /> PDF
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex-1 overflow-y-auto bg-white">
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                             <BrainCircuit size={48} className="text-blue-600 animate-bounce" />
                             <p className="font-black uppercase italic text-xs tracking-widest animate-pulse">AI po shkruan materialin...</p>
                          </div>
                        ) : generatedMaterial ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-slate-700 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-6">
                              {generatedMaterial}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
                            <BookOpen size={64} />
                            <p className="font-black uppercase italic text-xs tracking-widest">Gati për gjenerim</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics_soon' && (
              <motion.div key="soon" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex items-center justify-center py-10">
                <div className="text-center bg-white p-8 md:p-16 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-2xl max-w-lg relative overflow-hidden mx-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
                  <div className="bg-blue-50 w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-slate-800 mb-4 tracking-tighter uppercase italic">Coming Soon...</h2>
                  <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed italic">The <span className="text-blue-600 font-bold italic">Detailed Analytics</span> module is under development.</p>
                  <div className="mt-8 flex items-center justify-center gap-2 text-blue-400 font-black text-[10px] md:text-xs uppercase tracking-widest animate-pulse italic"><Clock size={16} /> Work in progress</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {renderedProfileModal}
      {renderedFeedbackModal}
    </div>
  );
}