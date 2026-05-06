"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FileText, GraduationCap, BarChart3, 
  Send, Sparkles, BrainCircuit, Database, RefreshCw, LogOut, ChevronRight,
  Clock, Construction, Lock, History, CheckCircle2, AlertTriangle, Trash2,
  User, Bell, X, Camera, Shield, UserCircle, Menu, Download, BookOpen, Layers, ListOrdered,
  MessageSquare, Star, TrendingUp, Award, Zap, Activity, ClipboardList, Calendar, Target,
  Save, FileDown, Loader2, BookMarked, Plus, Pencil, Search, ChevronDown, Check,
  // IKONAT E REJA KËTU:
  Users, Hash, Mail, Book 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const AnalyticsChart = dynamic(() => import('../../components/AnalyticsChart'), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-slate-100 animate-pulse rounded-2xl"></div>
});

const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 100;
const MAX_TOPIC_LENGTH = 200;

function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) return;
    const duration = 1200; const step = 16;
    const increment = end / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{decimals > 0 ? display.toFixed(decimals) : Math.floor(display)}{suffix}</span>;
}

// ─── NOTA BADGE ───────────────────────────────────────────────────────────────
function GradeBadge({ value, scale }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[10px] font-black text-slate-300 italic">—</span>;
  }
  const num = parseFloat(value);
  const max = scale === '1-5' ? 5 : 10;
  const pct = num / max;
  let color = 'bg-red-100 text-red-600';
  if (pct >= 0.9) color = 'bg-emerald-100 text-emerald-700';
  else if (pct >= 0.7) color = 'bg-blue-100 text-blue-700';
  else if (pct >= 0.5) color = 'bg-amber-100 text-amber-700';
  return <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-black ${color}`}>{num}</span>;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalEvaluations: 0, 
    classAverage: 0, 
    aiAccuracy: 0, 
    thisWeek: 0, 
    statsLoading: true,
    chartData: [] // NEW: Shtojmë të dhënat e grafikut këtu
  });
  const [conversations, setConversations] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', currentPassword: '', newPassword: '', avatarPreview: null, avatarFile: null });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const isSubmitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [materialFieldErrors, setMaterialFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, message: '' });
  const [feedbackStatus, setFeedbackStatus] = useState({ type: 'idle', text: '' });
  const feedbackRef = useRef(null);

  // ─── STATE AI EXAMS ───────────────────────────────────────────────────────
  const [examFormData, setExamFormData] = useState({ professorName: '', subject: '', topic: '', level: 'Fakultet', numQuestions: 5, type: 'multiple-choice', difficulty: 'Medium', extraInfo: '' });
  const [examQuestions, setExamQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [examLoading, setExamLoading] = useState(false);

  // ─── STATE HOMEWORK ───────────────────────────────────────────────────────
  const [homeworkInput, setHomeworkInput] = useState({ subject: '', topic: '', level: '', numTasks: 3, type: 'open', deadline: '', extraInfo: '' });
  const [generatedHomework, setGeneratedHomework] = useState(null);
  const [homeworkFieldErrors, setHomeworkFieldErrors] = useState({});
  const [homeworkApiError, setHomeworkApiError] = useState(null);

    // STATE GRADEBOOK & ABSENCES ───────────────────────────────────────────
  const [gradebook, setGradebook] = useState([]);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookError, setGradebookError] = useState(null);
  const [gbScale, setGbScale] = useState('1-5');
  const [gbFilterSubject, setGbFilterSubject] = useState('all');
  const [gbFilterClass, setGbFilterClass] = useState('all'); // NEW: State for Class/Group filter
  const [gbSearchQuery, setGbSearchQuery] = useState('');
  const [gbShowForm, setGbShowForm] = useState(false);
  const [gbEditingId, setGbEditingId] = useState(null);
  const [gbForm, setGbForm] = useState({ 
    subject: '', 
    student_name: '', 
    class_group: '',       // NEW: Class/Group
    student_id_number: '', // NEW: Student ID Number
    email_contact: '',     // NEW: Email/Contact
    period_1: '', 
    period_2: '', 
    period_3: '',
    notes: '',             // NEW: Notes
    scale: '5-10'          // NEW: Shkalla e Notave
  });

  const [gbFormErrors, setGbFormErrors] = useState({});
  const [gbSaving, setGbSaving] = useState(false);
  const [gbAddMode, setGbAddMode] = useState('new'); // 'new' ose 'existing'
  const [gbSelectedExistingStudent, setGbSelectedExistingStudent] = useState(null); // Ruaj studentin e zgjedhur

  // STATE I SHTUAR PËR MUNGESAT

  const [gradebookSubTab, setGradebookSubTab] = useState('grades');
  const [absencesFilter, setAbsencesFilter] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  const [absencesError, setAbsencesError] = useState(null);
  const [showAbsenceDropdown, setShowAbsenceDropdown] = useState(false);
  const absenceDropdownRef = useRef(null);

  const [inputData, setInputData] = useState({ studentAnswer: '', questionText: '', rubric: '', subject: 'Programming' });
  const [materialInput, setMaterialInput] = useState({ subject: '', level: '', topic: '', materialType: 'summary' });
  const [generatedMaterial, setGeneratedMaterial] = useState(null);
  const gradingAreaRef = useRef(null);
  const loadingMessages = ["Analyzing text...", "Consulting AI..", "Comparing with rubric...", "Generating strengths...", "Finalizing report..."];
  
  const resetGradingFields = () => { 
    setResult(null); setError(null); setFieldErrors({}); setApiError(null); setInputData({ studentAnswer: '', questionText: '', rubric: '', subject: 'Programming' });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTab === 'grading' && gradingAreaRef.current && !gradingAreaRef.current.contains(event.target) && !result && !loading) resetGradingFields();
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (isFeedbackOpen && feedbackRef.current && !feedbackRef.current.contains(event.target)) setIsFeedbackOpen(false);
      if (showAbsenceDropdown && absenceDropdownRef.current && !absenceDropdownRef.current.contains(event.target)) setShowAbsenceDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab, isProfileOpen, isFeedbackOpen, result, loading, showAbsenceDropdown]);

  const fetchHistory = async (userId) => {
    const { data } = await supabase.from('conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setConversations(data);
  };

  const fetchStats = async (userId) => {
    try {
      // 1. Merr Statistikat e Aktivitetit të AI-së (nga Conversations)
      // Kjo pjesë mbetet për `totalEvaluations`, `thisWeek`, `aiAccuracy`
      const { data: convData, count: totalEvaluationsCount, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (convError) console.error("Error fetching conversations:", convError);

      const totalEvaluations = totalEvaluationsCount || 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeek = convData ? convData.filter(c => new Date(c.created_at) >= weekAgo).length : 0;

      let aiAccuracy = 0;
      if (convData && convData.length > 0) {
        const { data: msgs, error: msgsError } = await supabase
          .from('messages')
          .select('content')
          .in('conversation_id', convData.map(c => c.id))
          .eq('role', 'assistant');

        if (msgsError) console.error("Error fetching messages:", msgsError);

        if (msgs && msgs.length > 0) {
          const scores = msgs.map(m => {
            try {
              const p = JSON.parse(m.content);
              return typeof p.score === 'number' ? p.score : null;
            } catch {
              return null;
            }
          }).filter(s => s !== null);

          if (scores.length > 0) {
            aiAccuracy = parseFloat(((scores.filter(s => s > 0).length / scores.length) * 100).toFixed(1)); 
          }
        }
      }

      // 2. Merr Statistikat e Notave (nga Gradebook)
      // Kjo pjesë do të llogarisë `classAverage` dhe `chartData`
      const { data: gradebookEntries, error: gbError } = await supabase
        .from('gradebook')
        .select('subject, average')
        .eq('user_id', userId);
      
      if (gbError) console.error("Error fetching gradebook:", gbError);

      let classAverage = 0;
      const subjectAverages = {}; // Do te mbaje mesataret per cdo lende

      if (gradebookEntries && gradebookEntries.length > 0) {
        // Llogarit mesataren e pergjithshme te klases
        const allAverages = gradebookEntries.map(entry => entry.average).filter(avg => avg !== null);
        if (allAverages.length > 0) {
          classAverage = parseFloat((allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length).toFixed(1));
        }

        // Llogarit mesataret per cdo lende per grafiku
        const gradesBySubject = {};
        gradebookEntries.forEach(entry => {
          if (entry.subject && entry.average !== null) {
            if (!gradesBySubject[entry.subject]) {
              gradesBySubject[entry.subject] = [];
            }
            gradesBySubject[entry.subject].push(entry.average);
          }
        });

        for (const subject in gradesBySubject) {
          const grades = gradesBySubject[subject];
          if (grades.length > 0) {
            subjectAverages[subject] = parseFloat((grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1));
          }
        }
      }

      // Formatimi i të dhënave të grafikut për lëndët (mesatarja)
      const chartDataForSubjects = Object.entries(subjectAverages).map(([subject, average]) => ({
        name: subject,
        score: average, // 'score' këtu përfaqëson mesataren e lëndës
      }));

      setStats({
        totalEvaluations,
        classAverage, // Tani vjen nga gradebook
        aiAccuracy: aiAccuracy, 
        thisWeek,
        statsLoading: false,
        chartData: chartDataForSubjects, // Tani chartData përmban mesataret e lëndëve nga gradebook
      });
    } catch (err) {
      console.error("Gabim gjatë marrjes së statistikave të dashboard-it:", err);
      setStats(prev => ({ ...prev, statsLoading: false }));
    }
  };




  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); }
      else { setUser(user); setProfileForm(prev => ({ ...prev, fullName: user.user_metadata?.full_name || user.email.split('@')[0], avatarPreview: user.user_metadata?.avatar_url || null })); await fetchStats(user.id); fetchHistory(user.id); }
      setAuthLoading(false);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    let interval;
    if (loading) { interval = setInterval(() => { setStatusIndex(prev => (prev + 1) % loadingMessages.length); }, 2000); }
    else { setStatusIndex(0); }
    return () => clearInterval(interval);
  }, [loading]);

  const checkSessionAndRun = useCallback(async (fn) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApiError("Sesioni juaj ka skaduar. Po ju ridrejtojmë..."); setTimeout(() => router.push('/login'), 2000); return; }
    await fn();
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) { setFeedbackStatus({ type: 'error', text: 'Ju lutem zgjidhni një vlerësim me yje!' }); return; }
    if (!feedbackForm.message.trim()) { setFeedbackStatus({ type: 'error', text: 'Mesazhi nuk mund të jetë bosh!' }); return; }
    setFeedbackStatus({ type: 'loading', text: '' });
    try {
      const res = await fetch('/api/v1/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: feedbackForm.rating, message: feedbackForm.message, userId: user.id, fullName: profileForm.fullName || user.email }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Dërgimi dështoi.");
      setFeedbackStatus({ type: 'success', text: 'Feedback-u u dërgua me sukses! Faleminderit.' });
      setTimeout(() => { setIsFeedbackOpen(false); setFeedbackForm({ rating: 0, message: '' }); setFeedbackStatus({ type: 'idle', text: '' }); }, 2500);
    } catch (err) { setFeedbackStatus({ type: 'error', text: err.message }); }
  };

  // ─── GRADEBOOK HANDLERS ───────────────────────────────────────────────────
  const fetchGradebook = useCallback(async (subject = 'all') => {
    setGradebookLoading(true); 
    setGradebookError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setGradebookError("Sesioni ka skaduar. Po ju ridrejtojmë...");
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      const url = subject !== 'all' 
        ? `/api/v1/gradebook?subject=${encodeURIComponent(subject)}` 
        : '/api/v1/gradebook';
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      if (res.status === 401) {
        setGradebookError("Sesioni ka skaduar.");
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      
      if (data.success) {
        setGradebook(data.data);
      } else {
        setGradebookError(data.error || "Gabim gjatë ngarkimit.");
      }
    } catch (err) { 
      console.error('Fetch gradebook error:', err);
      setGradebookError("Gabim lidhje. Provoni përsëri.");
    } finally { 
      setGradebookLoading(false); 
    }
  }, [router]);

  // FUNKSIONI I SHTUAR PËR FETCH ABSENCES
  const fetchAbsences = useCallback(async () => {
    setAbsencesLoading(true);
    setAbsencesError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setAbsencesError("Sesioni ka skaduar.");
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      const res = await fetch('/api/v1/absences');
      const data = await res.json();
      
      if (data.success) {
        setAbsences(data.data);
      } else {
        setAbsencesError(data.error || "Gabim gjatë ngarkimit të mungesave.");
      }
    } catch (err) {
      console.error('Fetch absences error:', err);
      // setAbsencesError("Gabim lidhje. Provoni përsëri."); // Silent fail për t'u mos ndërprerë demo
    } finally {
      setAbsencesLoading(false);
    }
  }, [router]);

    // Gjej këtë pjesë rreth rreshtit 218:
    useEffect(() => {
      if (activeTab === 'gradebook') fetchGradebook('all'); // Gjithmonë merr të gjitha fillimisht
    }, [activeTab, fetchGradebook]); 
    // Hoqëm gbFilterSubject nga dependency që të mos bëjë re-fetch dhe të fshijë lëndët e tjera


  // USE EFFECT I SHTUAR PËR MUNGESAT
  useEffect(() => {
    if (activeTab === 'gradebook' && gradebookSubTab === 'absences') {
      fetchAbsences();
    }
  }, [activeTab, gradebookSubTab, fetchAbsences]);

  // FUNKSIONI PËR TË REGJISTRUAR NJË MUNGESË TË RE
  const handleRecordAbsence = async (reason) => {
    setShowAbsenceDropdown(false);
    
    // Optimistic UI Update (Përditëso UI direkt që përdoruesi ta shohë ndryshimin)
    const newAbsence = {
      id: Date.now(),
      student_name: absencesFilter,
      date: new Date().toISOString(),
      reason: reason
    };
    
    setAbsences(prev => [newAbsence, ...prev]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/v1/absences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAbsence)
      });
    } catch (err) {
      console.error('Gabim gjatë ruajtjes së mungesës:', err);
    }
  };

  // NEW: Lista unike e lëndëve për filter
  const gbSubjects = useMemo(() => {
    const s = [...new Set(gradebook.map(g => g.subject))].sort((a, b) => a.localeCompare(b, 'sq'));
    return s;
  }, [gradebook]);

  // NEW: Lista unike e klasave/grupeve për filter
  const gbClasses = useMemo(() => {
    const cleanedClassGroups = gradebook.map(g => g.class_group) 
                                      .filter(Boolean)        
                                      .map(c => c.trim());    
    const uniqueClassGroups = [...new Set(cleanedClassGroups)];
    return uniqueClassGroups.sort((a, b) => a.localeCompare(b, 'sq'));
  }, [gradebook]);

  // NEW: Lista e studentëve unikë për zgjedhje në formularin "Shto lëndë"
  const gbUniqueStudents = useMemo(() => {
    const studentsMap = new Map();
    gradebook.forEach(s => {
      // Krijojmë një ID unike bazuar në emër + klasë (ose student_id_number nëse disponohet)
      const studentIdentifier = s.student_id_number && s.student_id_number !== '' 
                                ? s.student_id_number 
                                : `${s.student_name}-${s.class_group}`;
      
      // Vetëm nëse nuk e kemi shtuar këtë student më parë, e shtojmë
      if (!studentsMap.has(studentIdentifier)) {
        studentsMap.set(studentIdentifier, {
          id: studentIdentifier, // ID e brendshme, jo ajo e rreshtit te Supabase. Kjo ID na duhet per key te React.
          student_name: s.student_name,
          class_group: s.class_group,
          student_id_number: s.student_id_number,
          email_contact: s.email_contact,
          notes: s.notes,
          // Nuk përfshijmë subject, period_x, average, scale pasi këto janë specifike për lëndën
        });
      }
    });
    return Array.from(studentsMap.values()).sort((a, b) => a.student_name.localeCompare(b.student_name, 'sq'));
  }, [gradebook]);


  // Filtrim + kërkim + RENDITJE ALFABETIKE
  const gbFiltered = useMemo(() => {
    return gradebook.filter(g => {
      const matchSubject = gbFilterSubject === 'all' || g.subject === gbFilterSubject;
      const matchClass = gbFilterClass === 'all' || g.class_group === gbFilterClass;

      const matchSearch = gbSearchQuery === '' || 
                          g.student_name.toLowerCase().includes(gbSearchQuery.toLowerCase()) || 
                          g.subject.toLowerCase().includes(gbSearchQuery.toLowerCase()) ||
                          g.class_group?.toLowerCase().includes(gbSearchQuery.toLowerCase()) || 
                          g.student_id_number?.toLowerCase().includes(gbSearchQuery.toLowerCase()); 
      return matchSubject && matchClass && matchSearch; 
    }).sort((a, b) => a.student_name.localeCompare(b.student_name, 'sq')); 
  }, [gradebook, gbFilterSubject, gbFilterClass, gbSearchQuery]); 


  // Grupim sipas lëndes
  const gbGrouped = useMemo(() => {
    const groups = {};
    gbFiltered.forEach(g => {
      if (!groups[g.subject]) groups[g.subject] = [];
      groups[g.subject].push(g);
    });
    return groups;
  }, [gbFiltered]);


  const validateGbForm = () => {
    const errors = {};
    if (!gbForm.subject.trim()) errors.subject = "Lënda është e detyrueshme.";
    
    // Validimi i detajeve të studentit varet nga modaliteti
    if (gbEditingId) { // Në modalitetin e editimit, validimi i rregullt
        if (!gbForm.student_name.trim()) errors.student_name = "Emri i studentit është i detyrueshëm.";
        if (!gbForm.class_group.trim()) errors.class_group = "Klasa/Grupi është e detyrueshme.";
    } else if (gbAddMode === 'new') { // Shtim i studentit të ri
        if (!gbForm.student_name.trim()) errors.student_name = "Emri i studentit është i detyrueshëm.";
        if (!gbForm.class_group.trim()) errors.class_group = "Klasa/Grupi është e detyrueshme.";
    } else if (gbAddMode === 'existing') { // Shtim lënde për student ekzistues
        if (!gbSelectedExistingStudent) errors.student_name = "Ju lutem zgjidhni një student ekzistues.";
        // Të dhënat e studentit do të jenë pre-mbushur, kështu që nuk i validojmë këtu
    }

    const max = gbForm.scale === '1-5' ? 5 : 10;
    const min = gbForm.scale === '5-10' ? 5 : 1; // Shto këtë rresht
    ['period_1', 'period_2', 'period_3'].forEach((p) => {
      const val = gbForm[p];
      if (val !== '' && val !== null) {
        const num = parseFloat(val);
        // Ndrysho kushtin këtu:
        if (isNaN(num) || num < min || num > max) {
          errors[p] = `Nota duhet të jetë ${min}-${max}.`;
        }
      }
    });
    setGbFormErrors(errors);
    return Object.keys(errors).length === 0;
  };




  const handleGbSave = async () => {
    if (!validateGbForm()) return;
    setGbSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const payload = { ...gbForm }; // KORRIGJIM: Perdoret gjithe gbForm direkt, qe permban gbForm.scale
      const method = gbEditingId ? 'PUT' : 'POST';
      if (gbEditingId) payload.id = gbEditingId;
      const res = await fetch('/api/v1/gradebook', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setGbShowForm(false); setGbEditingId(null);
        // Pastro formen, por tashme duke perdorur vlerat default te gbForm
        setGbForm({ 
            subject: '', 
            student_name: '', 
            class_group: '',       
            student_id_number: '', 
            email_contact: '',     
            period_1: '', 
            period_2: '', 
            period_3: '',
            notes: '',             
            scale: '5-10'         // Ktheje ne shkallen default
        });
        setGbFormErrors({});
        fetchGradebook(gbFilterSubject);
      } else { setGbFormErrors({ general: data.error || "Gabim gjatë ruajtjes." }); }
    } catch { setGbFormErrors({ general: "Gabim lidhje. Provoni përsëri." }); }
    finally { setGbSaving(false); }
  };

  const handleGbEdit = (student) => {
    setGbAddMode('new'); // Kur editohet nje rresht specifik, e trajtojme si edit te nje "rekordi" te ri
    setGbSelectedExistingStudent(null); // Pastrojme zgjedhjen e studentit ekzistues
    setGbForm({ 
      subject: student.subject, 
      student_name: student.student_name, 
      class_group: student.class_group || '',       
      student_id_number: student.student_id_number || '', 
      email_contact: student.email_contact || '',     
      period_1: student.period_1 ?? '', 
      period_2: student.period_2 ?? '', 
      period_3: student.period_3 ?? '',
      notes: student.notes || '',                    
      scale: student.scale || '5-10'                 
    });
    setGbEditingId(student.id);
    setGbShowForm(true);
    setGbFormErrors({});
  };



  const handleGbDelete = async (id) => {
    if (!confirm("A jeni i sigurt që doni ta fshini këtë student?")) return;
    try {
      const res = await fetch(`/api/v1/gradebook?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchGradebook(gbFilterSubject);
      else alert("Gabim gjatë fshirjes: " + data.error);
    } catch { alert("Gabim lidhje."); }
  };

  const handleGbCancel = () => { setGbShowForm(false); setGbEditingId(null);
    setGbForm({ 
      subject: '', 
      student_name: '', 
      class_group: '',       
      student_id_number: '', 
      email_contact: '',     
      period_1: '', 
      period_2: '', 
      period_3: '',
      notes: '',             
      scale: '5-10'          
    }); 
    setGbFormErrors({}); 
    setGbAddMode('new'); // Kthejme modalitetin ne 'new'
    setGbSelectedExistingStudent(null); // Pastrojme zgjedhjen e studentit ekzistues
  };




  // ─── EXPORT GRADEBOOK PDF ─────────────────────────────────────────────────
  const handleGbExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 58, 138);
    doc.text("REGJISTRI I NOTAVE", pageWidth / 2, y, { align: 'center' }); y += 8;
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        // Kjo linjë nuk ka më kuptim sepse shkalla është per student, mund ta heqim ose ta modifikojmë
    // doc.text(`Shkalla: ${gbScale}  |  Data: ${new Date().toLocaleDateString('sq-AL')}`, pageWidth / 2, y, { align: 'center' }); y += 10;
    // Ose mund të shfaqim vetëm datën
    doc.text(`Data: ${new Date().toLocaleDateString('sq-AL')}`, pageWidth / 2, y, { align: 'center' }); y += 10;

    doc.setDrawColor(200, 210, 230); doc.line(15, y, pageWidth - 15, y); y += 8;
    Object.entries(gbGrouped).forEach(([subject, students]) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 58, 138);
      doc.text(subject.toUpperCase(), 15, y); y += 8;

      // Header tabele
      doc.setFillColor(239, 246, 255); doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
      doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "bold");
      doc.text("Studenti", 17, y);
      doc.text("P.1", pageWidth - 75, y, { align: 'center' });
      doc.text("P.2", pageWidth - 55, y, { align: 'center' });
      doc.text("P.3", pageWidth - 35, y, { align: 'center' });
      doc.text("Mes.", pageWidth - 15, y, { align: 'right' });
      y += 7;

      students.forEach((s, idx) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, pageWidth - 30, 7, 'F'); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 41, 59);
        doc.text(s.student_name, 17, y);
        doc.text(s.period_1 !== null ? String(s.period_1) : '—', pageWidth - 75, y, { align: 'center' });
        doc.text(s.period_2 !== null ? String(s.period_2) : '—', pageWidth - 55, y, { align: 'center' });
        doc.text(s.period_3 !== null ? String(s.period_3) : '—', pageWidth - 35, y, { align: 'center' });
        doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 138);
        doc.text(s.average !== null ? String(s.average) : '—', pageWidth - 15, y, { align: 'right' });
        y += 7;
      });
      y += 6;
    });
    doc.save(`Regjistri_Notave_${new Date().toLocaleDateString('sq-AL').replace(/\//g, '-')}.pdf`);
  };

  // ─── AI EXAMS HANDLERS ────────────────────────────────────────────────────
  const handleExamGenerate = async (e) => {
    e.preventDefault();
    setExamLoading(true); setExamQuestions([]); setIsSaved(false);
    try {
      const res = await fetch('/api/v1/exams/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(examFormData) });
      const result = await res.json();
      if (result.success) setExamQuestions(result.data); else alert("Gabim gjatë gjenerimit: " + result.error);
    } catch { alert("Nuk u arrit lidhja me serverin."); }
    finally { setExamLoading(false); }
  };

  const handleSaveToHistory = async () => {
    if (examQuestions.length === 0) return; setIsSaving(true);
    try {
      const res = await fetch('/api/v1/exams/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: examFormData.subject, topic: examFormData.topic, level: examFormData.level, difficulty: examFormData.difficulty, professorName: examFormData.professorName, questions: examQuestions }) });
      const result = await res.json();
      if (result.success) setIsSaved(true); else alert("Gabim: " + (result.error || "Nuk u ruajt dot."));
    } catch (err) { alert("Gabim lidhjeje: " + err.message); }
    finally { setIsSaving(false); }
  };

  const downloadExamWord = async () => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import('docx');
    const { saveAs } = await import('file-saver');
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: `PROVIM: ${examFormData.subject.toUpperCase()}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), new Paragraph({ text: `Profesor: ${examFormData.professorName} | Tema: ${examFormData.topic}`, alignment: AlignmentType.CENTER }), new Paragraph({ text: `Niveli: ${examFormData.level} | Vështirësia: ${examFormData.difficulty}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }), new Paragraph({ children: [new TextRun({ text: "Emri dhe Mbiemri: ___________________________    Data: ________", size: 24 })], spacing: { after: 600 } }), ...examQuestions.flatMap((q, i) => [new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.question}`, bold: true, size: 24 })], spacing: { before: 400 } }), ...(q.options ? q.options.map((opt, j) => new Paragraph({ text: `${String.fromCharCode(65 + j)}) ${opt}`, indent: { left: 720 } })) : [new Paragraph({ text: "Përgjigje: __________________________________________________" }), new Paragraph({ text: "____________________________________________________________" })])]) ] }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `${examFormData.subject || 'Provim'}.docx`));
  };

  const downloadExamPDF = async () => {
    await import('jspdf-autotable');
    const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(18); doc.text(`PROVIM: ${examFormData.subject.toUpperCase()}`, pw / 2, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`Profesor: ${examFormData.professorName} | Tema: ${examFormData.topic}`, pw / 2, 30, { align: 'center' });
    doc.text(`Niveli: ${examFormData.level} | Vështirësia: ${examFormData.difficulty}`, pw / 2, 36, { align: 'center' });
    doc.line(20, 45, pw - 20, 45);
    doc.text("Emri dhe Mbiemri: ___________________________    Data: ________", 20, 55);
    let y = 70;
    examQuestions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); const sq = doc.splitTextToSize(`${i + 1}. ${q.question}`, pw - 40); doc.text(sq, 20, y); y += sq.length * 7;
      doc.setFont("helvetica", "normal");
      if (q.options) { q.options.forEach((opt, j) => { doc.text(`${String.fromCharCode(65 + j)}) ${opt}`, 30, y); y += 7; }); }
      else { doc.text("Përgjigje: __________________________________________________", 30, y); y += 14; }
      y += 5;
    });
    doc.save(`${examFormData.subject || 'Provim'}.pdf`);
  };

  // ─── HOMEWORK HANDLERS ────────────────────────────────────────────────────
  const validateHomeworkInputs = () => {
    const errors = {};
    if (!homeworkInput.subject.trim()) errors.subject = "Lënda nuk mund të jetë bosh.";
    if (!homeworkInput.topic.trim()) errors.topic = "Tema nuk mund të jetë bosh.";
    if (homeworkInput.numTasks < 1 || homeworkInput.numTasks > 10) 
   errors.numTasks = "Numri duhet të jetë 5-10.";
    setHomeworkFieldErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleGenerateHomework = async () => {
    if (!validateHomeworkInputs()) return;
    if (isSubmitting.current) return; isSubmitting.current = true;
    setLoading(true); setGeneratedHomework(null); setHomeworkApiError(null);
    await checkSessionAndRun(async () => {
      try {
        const controller = new AbortController(); const tid = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/v1/homework/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(homeworkInput), signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) { if (res.status === 401) { setHomeworkApiError("Sesioni ka skaduar."); setTimeout(() => router.push('/login'), 2000); return; } throw new Error(`Gabim: ${res.status}`); }
        const data = await res.json();
        if (data.success) setGeneratedHomework(data.homework); else setHomeworkApiError(data.error || "Gabim i panjohur.");
      } catch (err) { if (err.name === 'AbortError') setHomeworkApiError("Kërkesa mori shumë kohë."); else setHomeworkApiError("Gabim: " + err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleDownloadHomeworkPDF = () => {
    if (!generatedHomework) return;
    const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth(); const margin = 20;
    const uw = pw - margin * 2; let y = 20;
    const anp = (s = 20) => { if (y + s > 280) { doc.addPage(); y = 20; } };
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 58, 138); doc.text(homeworkInput.subject.toUpperCase(), pw / 2, y, { align: 'center' }); y += 8;
    doc.setFontSize(11); doc.setTextColor(100); doc.setFont("helvetica", "normal"); doc.text(`Tema: ${homeworkInput.topic}  |  Niveli: ${homeworkInput.level || 'N/A'}`, pw / 2, y, { align: 'center' });
    y += 6;
    if (homeworkInput.deadline) { doc.setFont("helvetica", "italic"); doc.setTextColor(180, 80, 50);
    doc.text(`Afati: ${homeworkInput.deadline}`, pw / 2, y, { align: 'center' }); y += 6; }
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.5); doc.line(margin, y, pw - margin, y); y += 10;
    generatedHomework.forEach((task, idx) => {
      anp(30); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 58, 138); const tl = doc.splitTextToSize(`${idx + 1}. ${task.title}`, uw); doc.text(tl, margin, y); y += tl.length * 6 + 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60); const dl = doc.splitTextToSize(task.description, uw); anp(dl.length * 5 + 5); doc.text(dl, margin, y); y += dl.length * 5 + 6;
      if (task.requirements?.length > 0) { anp(10); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40); doc.text("Kërkesat:", margin, y); y += 6; doc.setFont("helvetica", "normal"); doc.setTextColor(70); task.requirements.forEach(r => { anp(7); const rl = doc.splitTextToSize(`• ${r}`, uw - 5); doc.text(rl, margin + 3, y); y += rl.length * 5 + 2; }); y += 3; }
      if (task.rubric?.length > 0) { anp(10); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40); doc.text("Kriteret e Vlerësimit:", margin, y);
      y += 6; task.rubric.forEach(r => { anp(7); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80); doc.text(`• ${r.criteria}`, margin + 3, y); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 138); doc.text(`${r.points} pikë`, pw - margin, y, { align: 'right' }); y += 6; }); }
      y += 5; anp(5); doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.3); doc.line(margin, y, pw - margin, y);
      y += 8;
    });
    doc.save(`Detyra_${homeworkInput.subject}_${homeworkInput.topic}.pdf`);
  };

  const handleDownloadHomeworkWord = async () => {
    if (!generatedHomework) return;
    try {
      const tl = homeworkInput.type === 'open' ? 'E Hapur' : homeworkInput.type === 'practical' ? 'Praktike' : 'E Kombinuar';
      let body = `<h1 style='color:#1e3a8a;font-family:Arial;text-align:center;'>${homeworkInput.subject.toUpperCase()}</h1><p style='text-align:center;color:#64748b;font-family:Arial;'>Tema: ${homeworkInput.topic} | Tipi: ${tl}</p>`;
      if (homeworkInput.deadline) body += `<p style='text-align:center;color:#b45309;'><b>Afati: ${homeworkInput.deadline}</b></p>`;
      body += `<hr/>`;
      generatedHomework.forEach((task, idx) => {
        body += `<h2 style='color:#1e3a8a;font-family:Arial;'>${idx + 1}. ${task.title}</h2><p style='font-family:Georgia;line-height:1.7;'>${task.description}</p>`;
        if (task.requirements?.length > 0) { body += `<p style='font-weight:bold;'>Kërkesat:</p><ul>`; task.requirements.forEach(r => { body += `<li>${r}</li>`; }); body += `</ul>`; }
        if (task.rubric?.length > 0) { body += `<p style='font-weight:bold;'>Kriteret:</p><table style='width:100%;border-collapse:collapse;'><tr style='background:#eff6ff;'><th style='border:1px solid #bfdbfe;padding:6px;'>Kriteri</th><th style='border:1px solid #bfdbfe;padding:6px;text-align:center;'>Pikët</th></tr>`; task.rubric.forEach(r => { body += `<tr><td style='border:1px solid #e2e8f0;padding:6px;'>${r.criteria}</td><td style='border:1px solid #e2e8f0;padding:6px;text-align:center;'>${r.points}</td></tr>`; }); body += `</table>`; }
        body += `<hr/>`;
      });
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${body}</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `Detyra_${homeworkInput.subject}.doc`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setHomeworkApiError("Gabim shkarkimi: " + err.message); }
  };

  // ─── GRADING HANDLERS ─────────────────────────────────────────────────────
  const validateGradingInputs = () => {
    const errors = {};
    if (!inputData.questionText.trim()) errors.questionText = "Pyetja nuk mund të jetë bosh.";
    if (!inputData.studentAnswer.trim()) errors.studentAnswer = "Përgjigja nuk mund të jetë bosh.";
    if (inputData.questionText.length > MAX_QUESTION_LENGTH) errors.questionText = `Max ${MAX_QUESTION_LENGTH} karaktere.`;
    if (inputData.studentAnswer.length > MAX_ANSWER_LENGTH) errors.studentAnswer = `Max ${MAX_ANSWER_LENGTH} karaktere.`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMaterialInputs = () => {
    const errors = {};
    if (!materialInput.subject.trim()) errors.subject = "Lënda nuk mund të jetë bosh.";
    if (!materialInput.topic.trim()) errors.topic = "Tema nuk mund të jetë bosh.";
    setMaterialFieldErrors(errors); return Object.keys(errors).length === 0;
  };

  const handleGenerateMaterials = async () => {
    if (!validateMaterialInputs()) return;
    if (isSubmitting.current) return; isSubmitting.current = true;
    setLoading(true); setGeneratedMaterial(null); setApiError(null);
    await checkSessionAndRun(async () => {
      try {
        const controller = new AbortController(); const tid = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/v1/materials/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(materialInput), signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) { throw new Error(`Gabim: ${res.status}`); }
        const data = await res.json();
        if (data.success) setGeneratedMaterial(data.content); else setApiError(data.error || "Gabim i panjohur.");
      } catch (err) { if (err.name === 'AbortError') setApiError("Kërkesa mori shumë kohë."); else setApiError("Gabim: " + err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleDownloadMaterialPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(30, 58, 138); doc.text(materialInput.subject.toUpperCase(), 20, 20); doc.setFontSize(14); doc.setTextColor(100); doc.text(`Tema: ${materialInput.topic}`, 20, 30); doc.setLineWidth(0.5); doc.line(20, 35, 190, 35);
    doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.setTextColor(60); doc.text(doc.splitTextToSize(generatedMaterial, 170), 20, 45); doc.save(`Material_${materialInput.topic}.pdf`);
  };

  const handleDownloadMaterialWord = () => {
    try {
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><h1 style='color:#1e3a8a;font-family:Arial;'>${materialInput.subject.toUpperCase()}</h1><h3 style='color:#64748b;font-family:Arial;'>Tema: ${materialInput.topic}</h3><hr><p style='font-family:Georgia;line-height:1.6;white-space:pre-wrap;'>${generatedMaterial}</p></body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `Material_${materialInput.topic}.doc`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setApiError("Gabim shkarkimi: " + err.message); }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation(); if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) { alert("Error: " + error.message); return; }
    setConversations(conversations.filter(c => c.id !== id));
    setStats(prev => ({ ...prev, totalEvaluations: Math.max(0, prev.totalEvaluations - 1) }));
  };

  const loadConversation = async (conv) => {
    setLoading(true); setError(null); setActiveTab('grading');
    try {
      const { data: messages, error: msgError } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (messages?.length >= 2) {
        try { setResult(JSON.parse(messages[1].content));
        } catch { setResult({ feedback: messages[1].content, score: "N/A" }); }
        const ut = messages[0].content;
        if (ut.includes('|')) { const parts = ut.split('|'); setInputData(prev => ({ ...prev, questionText: parts[0].replace('Question: ', '').trim(), studentAnswer: parts[1].replace('Answer: ', '').trim() })); }
      }
    } catch { setError("Failed to load history."); } finally { setLoading(false); }
  };

  const handleGrade = async () => {
    if (!validateGradingInputs()) return;
    if (isSubmitting.current) return; isSubmitting.current = true;
    setLoading(true); setError(null); setResult(null); setApiError(null);
    await checkSessionAndRun(async () => {
      try {
        const controller = new AbortController(); const tid = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/v1/grading/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputData), signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) { throw new Error(`Server returned status ${res.status}`); }
        const data = await res.json();
        
        if (data.success) {
          setResult(data.data);
          const { data: convData, error: convError } = await supabase.from('conversations').insert([{ user_id: user.id, title: `Evaluation: ${inputData.questionText.substring(0, 30)}...` }]).select().single();
          if (convError) throw convError;
          await supabase.from('messages').insert([{ conversation_id: convData.id, role: 'user', content: `Question: ${inputData.questionText} | Answer: ${inputData.studentAnswer}` }, { conversation_id: convData.id, role: 'assistant', content: JSON.stringify(data.data) }]);
          setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations + 1, thisWeek: prev.thisWeek + 1 }));
          fetchHistory(user.id);
        } else { throw new Error(data.error || "Evaluation failed."); }
      } catch (err) { if (err.name === 'AbortError') setError("Kërkesa mori shumë kohë.");
      else if (!navigator.onLine) setError("Nuk ka lidhje interneti."); else setError(err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      let avatarUrl = profileForm.avatarPreview;
      if (profileForm.avatarFile) { const fe = profileForm.avatarFile.name.split('.').pop();
        const fn = `${user.id}-${Date.now()}.${fe}`; const fp = `avatars/${fn}`; const { error: ue } = await supabase.storage.from('profiles').upload(fp, profileForm.avatarFile);
        if (ue) throw ue; const { data: pd } = supabase.storage.from('profiles').getPublicUrl(fp); avatarUrl = pd.publicUrl;
      }
      const { error: ue } = await supabase.auth.updateUser({ data: { full_name: profileForm.fullName, avatar_url: avatarUrl } });
      if (ue) throw ue;
      if (profileForm.newPassword) { if (!profileForm.currentPassword) throw new Error("Current password required!");
        const { error: ve } = await supabase.auth.signInWithPassword({ email: user.email, password: profileForm.currentPassword }); if (ve) throw new Error("Invalid current password!");
        const { error: pe } = await supabase.auth.updateUser({ password: profileForm.newPassword }); if (pe) throw pe;
      }
      alert("Profile updated!"); setIsProfileOpen(false); window.location.reload();
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
                <div className="w-full h-full bg-white/20 rounded-3xl flex items-center justify-center border-2 border-white/30 overflow-hidden shadow-lg">{profileForm.avatarPreview ? <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-white/80"/>}</div>
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"><Camera size={24} className="text-white" /></div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { const f = e.target.files[0];
                  if(f) setProfileForm({...profileForm, avatarPreview: URL.createObjectURL(f), avatarFile: f}); }} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight truncate px-4">{profileForm.fullName || user?.email.split('@')[0]}</h3>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">{user?.email}</p>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-6 md:p-8 space-y-4">
              <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><UserCircle size={14}/> Full Name</label><input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Shield size={14}/> Current Password</label><input type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Shield size={14}/> New Password</label><input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
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
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30"><MessageSquare size={32} className="text-blue-400" /></div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Na dërgoni Feedback</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Mendimi juaj na ndihmon!</p>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-6 md:p-8">
              <div className="flex justify-center gap-2 mb-6">{[1,2,3,4,5].map(star => (<button key={star} type="button" onClick={() => setFeedbackForm({...feedbackForm, rating: star})} className={`p-2 transition-all hover:scale-110 active:scale-95 ${feedbackForm.rating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-slate-200'}`}><Star size={32} fill={feedbackForm.rating >= star ? "currentColor" : "none"} /></button>))}</div>
              <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Mesazhi</label><textarea rows="4" value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})} placeholder="Çfarë mund të përmirësojmë?" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <AnimatePresence>{feedbackStatus.type !== 'idle' && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4"><p className={`text-[10px] font-black uppercase tracking-widest italic text-center p-2 rounded-xl ${feedbackStatus.type === 'error' ? 'text-red-500 bg-red-50' : feedbackStatus.type === 'success' ? 'text-green-500 bg-green-50' : 'text-blue-500 bg-blue-50 animate-pulse'}`}>{feedbackStatus.type === 'loading' ? 'Po dërgohet...' : feedbackStatus.text}</p></motion.div>)}</AnimatePresence>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsFeedbackOpen(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-slate-100 text-slate-500">Anulo</button>
                <button type="submit" disabled={feedbackStatus.type === 'loading'} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16}/> Dërgo</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ), [isFeedbackOpen, feedbackForm, feedbackStatus]);

  if (authLoading || !user) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold uppercase italic tracking-widest text-blue-600">Authenticating...</div>;

  const metricCards = [
    { key: 'total', label: 'Total Evaluations', value: stats.totalEvaluations, suffix: '', decimals: 0, icon: Activity, iconBg: 'bg-blue-500', iconColor: 'text-white', valuColor: 'text-slate-800', accent: 'border-l-blue-500', badge: stats.thisWeek > 0 ? `+${stats.thisWeek} këtë javë` : 'Asnjë këtë javë', badgeBg: stats.thisWeek > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400', trend: stats.thisWeek > 0 },
    { key: 'avg', label: 'Mesatarja e Klasës', value: stats.classAverage, suffix: '/100', decimals: 1, icon: TrendingUp, iconBg: 'bg-emerald-500', iconColor: 'text-white', valuColor: 'text-emerald-600', accent: 'border-l-emerald-500', badge: stats.classAverage >= 70 ? 'Mbi mesatare' : stats.classAverage > 0 ? 'Nën mesatare' : 'Pa të dhëna', badgeBg: stats.classAverage >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500', trend: stats.classAverage >= 70, progressValue: stats.classAverage },
    { key: 'acc', label: 'AI Accuracy', value: stats.aiAccuracy, suffix: '%', decimals: 1, icon: Zap, iconBg: 'bg-violet-500', iconColor: 'text-white', valuColor: 'text-violet-600', accent: 'border-l-violet-500', badge: 'Llama 3.3 70B', badgeBg: 'bg-violet-50 text-violet-600', trend: true, progressValue: stats.aiAccuracy },
    { key: 'week', label: 'Këtë Javë', value: stats.thisWeek, suffix: '', decimals: 0, icon: Award, iconBg: 'bg-amber-500', iconColor: 'text-white', valuColor: 'text-amber-600', accent: 'border-l-amber-500', badge: 'Aktivitet 7-ditor', badgeBg: 'bg-amber-50 text-amber-600', trend: stats.thisWeek > 0 },
  ];

  const hwTypeConfig = { open: { label: 'E Hapur', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' }, practical: { label: 'Praktike', bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' }, mixed: { label: 'E Kombinuar', bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' } };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-xl transition-transform duration-300 md:relative md:translate-x-0 md:shadow-sm shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><GraduationCap size={24} /></div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase italic">AI Assistant</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20}/></button>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => { setActiveTab('gradebook'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gradebook' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><BookMarked size={20} /> Gradebook</button>
          <button onClick={() => { setActiveTab('grading'); resetGradingFields(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><FileText size={20} /> AI Grading</button>
          <button onClick={() => { setActiveTab('ai_exams'); setExamQuestions([]); setIsSaved(false); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai_exams' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><Sparkles size={20} /> AI Exams</button>
          <button onClick={() => { setActiveTab('learning_materials'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'learning_materials' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><BookOpen size={20} /> AI Materials</button>
          <button onClick={() => { setActiveTab('homework'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'homework' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><ClipboardList size={20} /> AI Homework</button>
          <button onClick={() => { setActiveTab('timer_soon'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'timer_soon' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><div className="flex items-center gap-3"><BarChart3 size={20} /> Timer</div><span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold tracking-tighter">SOON</span></button>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
          <button onClick={() => { setIsFeedbackOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold uppercase text-xs italic tracking-widest"><MessageSquare size={20} /> Feedback</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold uppercase text-xs italic tracking-widest"><LogOut size={20} /> Logout</button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 bg-white rounded-xl shadow-sm border border-slate-100"><Menu size={20}/></button>
            <div className="flex flex-col">
              <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight italic uppercase leading-none truncate max-w-[150px] md:max-w-none">Welcome, {profileForm.fullName.split(' ')[0]}!</h2>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase italic tracking-widest mt-1 opacity-70">AI Teaching Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="hidden sm:block p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all relative"><Bell size={20}/><span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span></button>
            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 md:gap-3 pl-1 pr-2 md:pl-2 md:pr-4 py-1 md:py-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm transition-all active:scale-95">
              <div className="w-8 h-8 rounded-xl bg-blue-600 overflow-hidden flex items-center justify-center text-white shadow-md shadow-blue-100">{profileForm.avatarPreview ? <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={16} />}</div>
              <div className="text-left hidden lg:block"><p className="text-[9px] font-black text-slate-400 uppercase italic leading-none mb-1">Profile</p><p className="text-xs font-bold text-slate-700 leading-none truncate max-w-[80px]">{profileForm.fullName}</p></div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-8">
                  {metricCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div key={card.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 border-l-4 ${card.accent} hover:shadow-md transition-shadow`}>
                        <div className="flex items-start justify-between">
                          <div className={`${card.iconBg} w-10 h-10 rounded-xl flex items-center justify-center shadow-sm`}><Icon size={20} className={card.iconColor} /></div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${card.badgeBg} flex items-center gap-1`}>{card.trend && <TrendingUp size={10} />}{card.badge}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                          {stats.statsLoading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" /> : <p className={`text-3xl font-black tracking-tighter ${card.valuColor}`}><AnimatedNumber value={card.value} suffix={card.suffix} decimals={card.decimals} /></p>}
                        </div>
                        {card.progressValue !== undefined && !stats.statsLoading && (
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(card.progressValue, 100)}%` }} transition={{ delay: i * 0.08 + 0.3, duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${card.iconBg}`} /></div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }} className="mb-10 h-[300px] md:h-[350px] bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><AnalyticsChart data={stats.chartData} /></motion.div>
              </motion.div>
            )}

            {/* ── GRADING ──────────────────────────────────────────────────────── */}
            {activeTab === 'grading' && (
              <motion.div key="grading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {(error || apiError) && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{error || apiError}</span></motion.div>)}
                <div ref={gradingAreaRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12">
                  <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><Sparkles className="text-blue-500" size={20} /> Task Details</h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">Exam Question</label>
                        <textarea value={inputData.questionText} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm md:text-base ${fieldErrors.questionText ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} rows="3" placeholder="Type question here..." maxLength={MAX_QUESTION_LENGTH} onChange={(e) => { setInputData({...inputData, questionText: e.target.value}); if (fieldErrors.questionText) setFieldErrors(p => ({...p, questionText: null})); }} />
                        <div className="flex justify-between mt-1">{fieldErrors.questionText ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.questionText}</p> : <span />}<span className={`text-[10px] font-bold italic ${inputData.questionText.length > MAX_QUESTION_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>{inputData.questionText.length}/{MAX_QUESTION_LENGTH}</span></div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">Student Answer</label>
                        <textarea value={inputData.studentAnswer} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 md:h-40 font-medium text-sm md:text-base ${fieldErrors.studentAnswer ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} placeholder="Paste student answer..." maxLength={MAX_ANSWER_LENGTH} onChange={(e) => { setInputData({...inputData, studentAnswer: e.target.value}); if (fieldErrors.studentAnswer) setFieldErrors(p => ({...p, studentAnswer: null})); }} />
                        <div className="flex justify-between mt-1">{fieldErrors.studentAnswer ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.studentAnswer}</p> : <span />}<span className={`text-[10px] font-bold italic ${inputData.studentAnswer.length > MAX_ANSWER_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>{inputData.studentAnswer.length}/{MAX_ANSWER_LENGTH}</span></div>
                      </div>
                      <button onClick={handleGrade} disabled={loading || isSubmitting.current} className={`relative w-full font-black uppercase tracking-widest py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>
                        <AnimatePresence mode="wait">{loading ? <motion.div key="l" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2"><BrainCircuit className="animate-spin" size={20} /> <span>Processing...</span></motion.div> : <motion.div key="s" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2"><Send size={18} /> <span>Analyze with AI</span></motion.div>}</AnimatePresence>
                      </button>
                    </div>
                  </section>
                  <section className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl min-h-[400px] md:min-h-[500px] relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
                    <AnimatePresence mode="wait">
                      {loading ? (<motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-8 text-center"><div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-20 h-20 md:w-28 md:h-28 border-4 border-blue-500/10 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-400 animate-pulse" size={30} /></div></div><div className="space-y-2"><motion.p key={statusIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg md:text-2xl font-bold text-blue-50 italic uppercase tracking-tighter">{loadingMessages[statusIndex]}</motion.p></div></motion.div>)
                      : result ? (<motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8"><div className="flex items-center justify-between"><div className="max-w-[60%]"><h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Evaluation Report</h3><p className="text-slate-400 text-[10px] md:text-sm italic">AI can make mistakes.</p></div><div className="bg-slate-800 p-3 md:p-4 rounded-2xl text-center border border-slate-700 shadow-inner"><span className="text-3xl md:text-5xl font-black text-green-400">{result.score}</span><span className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase italic">Points</span></div></div><div className="h-px bg-slate-700"></div><div><h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-xs md:text-sm uppercase italic tracking-tighter"><BrainCircuit size={16} /> AI Analysis</h4><p className="text-slate-300 text-xs md:text-sm italic bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 leading-relaxed max-h-40 overflow-y-auto">{result.feedback}</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20"><h5 className="text-green-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><CheckCircle2 size={12}/> Strengths</h5><ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.strengths?.map((s, i) => <li key={i}>• {s}</li>) || <li>None identified.</li>}</ul></div><div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20"><h5 className="text-red-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><AlertTriangle size={12}/> Suggestions</h5><ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.weaknesses?.map((w, i) => <li key={i}>• {w}</li>) || <li>Correct answer.</li>}</ul></div></div></motion.div>)
                      : <div className="text-center opacity-30"><Database size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] italic tracking-widest">System ready</p></div>}
                    </AnimatePresence>
                  </section>
                </div>
                <div className="mt-8 md:mt-12">
                  <div className="flex items-center gap-4 mb-8"><h3 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><History size={20} className="text-blue-600" /> History</h3><div className="h-px flex-1 bg-slate-200"></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {conversations.length > 0 ? conversations.map(conv => (
                      <motion.div key={conv.id} onClick={() => loadConversation(conv)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all relative cursor-pointer">
                        <div className="flex justify-between items-start mb-4"><span className="text-[8px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase italic">{new Date(conv.created_at).toLocaleDateString()}</span><button onClick={(e) => deleteConversation(e, conv.id)} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button></div>
                        <p className="text-xs md:text-sm font-bold text-slate-700 mb-4 uppercase italic tracking-tighter line-clamp-2">{conv.title}</p>
                        <div className="flex items-center justify-between text-[8px] md:text-[10px] text-slate-400 font-black uppercase italic"><span>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><div className="flex items-center gap-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">View <ChevronRight size={12} /></div></div>
                      </motion.div>
                    )) : <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400 font-bold uppercase text-xs tracking-widest">No saved evaluations yet.</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── AI EXAMS ─────────────────────────────────────────────────────── */}
            {activeTab === 'ai_exams' && (
              <motion.div key="ai_exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-[1400px] mx-auto space-y-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-5"><div><div className="flex items-center gap-2 mb-1"><span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">AI Studio</span><h1 className="text-xl md:text-3xl font-black text-slate-700 tracking-tighter uppercase italic">Exam Generator</h1></div><p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">Krijo materiale testimi në pak sekonda</p></div></div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      <button type="button" disabled={true} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed opacity-60"><Clock size={16} /> Historiku</button>
                      {examQuestions.length > 0 && (<button onClick={handleSaveToHistory} disabled={isSaving || isSaved} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>{isSaved ? <CheckCircle2 size={18} /> : (isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />)}{isSaved ? 'U Ruajt' : 'Ruaj'}</button>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <div className="lg:col-span-4">
                      <form onSubmit={handleExamGenerate} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6 lg:sticky lg:top-8">
                        <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Target size={20} /></div><h2 className="text-lg font-black text-slate-600 uppercase tracking-tighter italic">Konfigurimi</h2></div>
                        <div className="space-y-5">
                          <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Profesor/Institucion</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder="Emri i plotë" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.professorName} onChange={(e) => setExamFormData({...examFormData, professorName: e.target.value})} required /></div></div>
                          <div className="space-y-4"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Detajet e Lëndës</label><input type="text" placeholder="Emri i lëndës" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.subject} onChange={(e) => setExamFormData({...examFormData, subject: e.target.value})} required /><input type="text" placeholder="Tema specifike" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.topic} onChange={(e) => setExamFormData({...examFormData, topic: e.target.value})} required /></div>
                          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Niveli</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.level} onChange={(e) => setExamFormData({...examFormData, level: e.target.value})}><option value="Fillore">Fillore</option><option value="Mesme">E Mesme</option><option value="Fakultet">Fakultet</option></select></div><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Vështirësia</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.difficulty} onChange={(e) => setExamFormData({...examFormData, difficulty: e.target.value})}><option value="Easy">I lehtë</option><option value="Medium">Mesatar</option><option value="Hard">I vështirë</option></select></div></div>
                          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nr. Pyetjeve</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none" value={examFormData.numQuestions} onChange={(e) => setExamFormData({...examFormData, numQuestions: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Tipi</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.type} onChange={(e) => setExamFormData({...examFormData, type: e.target.value})}><option value="multiple-choice">Zgjedhje</option><option value="open-ended">Shkrim</option><option value="mixed">Të kombinuara</option></select></div></div>
                          <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Instruksione Shtesë</label><textarea placeholder="P.sh: Përdor terma teknikë..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-medium text-sm text-slate-600 min-h-[100px] resize-none" value={examFormData.extraInfo} onChange={(e) => setExamFormData({...examFormData, extraInfo: e.target.value})} /></div>
                        </div>
                        <button type="submit" disabled={examLoading} className="w-full bg-slate-700 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group">{examLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-blue-400 group-hover:scale-125 transition-transform" />}{examLoading ? "Duke Gjeneruar..." : "Gjenero Provimin"}</button>
                      </form>
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 px-2">
                        <div className="flex items-center gap-3"><div className="w-2 h-8 bg-blue-500/30 rounded-full"></div><h3 className="text-lg md:text-xl font-black text-slate-500 uppercase tracking-tighter italic">Preview e Provimit</h3></div>
                        {examQuestions.length > 0 && (<div className="flex gap-2 w-full sm:w-auto"><button onClick={downloadExamWord} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><FileText size={16} className="text-blue-500/50" /> Word</button><button onClick={downloadExamPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><FileDown size={16} className="text-red-500/50" /> PDF</button></div>)}
                      </div>
                      <div className="space-y-6">
                        {examQuestions.map((q, idx) => (<div key={idx} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200/60 shadow-sm"><div className="flex items-start gap-4 md:gap-5 mb-8"><span className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black italic text-base md:text-lg shadow-sm border border-slate-100">{idx + 1}</span><h4 className="text-base md:text-xl font-bold text-slate-600 leading-relaxed pt-1 md:pt-2">{q.question}</h4></div>{q.options && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-16">{q.options.map((opt, i) => (<div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-blue-300 transition-all group cursor-default"><span className="w-8 h-8 bg-white group-hover:bg-slate-400 group-hover:text-white rounded-xl flex items-center justify-center border border-slate-200 text-[10px] text-slate-400 font-black transition-all">{String.fromCharCode(65 + i)}</span><p className="text-xs font-bold text-slate-500">{opt}</p></div>))}</div>)}<div className="mt-8 pt-6 border-t border-slate-50 flex justify-end"><div className="px-4 py-2 bg-slate-50 text-slate-500 rounded-2xl border border-slate-100 flex items-center gap-3"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Përgjigja:</span><span className="font-bold text-xs">{q.answer}</span></div></div></div>))}
                        {!examLoading && examQuestions.length === 0 && (<div className="bg-white rounded-[48px] border-4 border-dashed border-slate-100 p-10 md:p-20 text-center space-y-6"><div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-4"><BrainCircuit size={40} className="text-slate-200" /></div><div><h3 className="text-xl md:text-2xl font-black text-slate-300 uppercase tracking-tighter italic">Gati për Gjenerim</h3><p className="text-slate-300 font-bold text-xs md:text-sm mt-2">Plotëso konfigurimin anash.</p></div></div>)}
                        {examLoading && (<div className="bg-white rounded-[48px] p-10 md:p-20 text-center space-y-8"><div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto"><div className="absolute inset-0 border-8 border-slate-50 rounded-full"></div><div className="absolute inset-0 border-8 border-slate-400 rounded-full border-t-transparent animate-spin"></div></div><h3 className="text-xl md:text-2xl font-black text-slate-400 uppercase tracking-tighter italic">Duke Procesuar...</h3></div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── LEARNING MATERIALS ───────────────────────────────────────────── */}
            {activeTab === 'learning_materials' && (
              <motion.div key="learning_materials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {apiError && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{apiError}</span><button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600 shrink-0"><X size={14}/></button></motion.div>)}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><BookOpen className="text-blue-500" size={20} /> Gjenero Materiale</h2>
                    <div className="space-y-5">
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> Lënda</label><input type="text" placeholder="Vendos Lënden" value={materialInput.subject} maxLength={MAX_SUBJECT_LENGTH} onChange={(e) => { setMaterialInput({...materialInput, subject: e.target.value}); if (materialFieldErrors.subject) setMaterialFieldErrors(p => ({...p, subject: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{materialFieldErrors.subject && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.subject}</p>}</div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> Niveli</label><input type="text" placeholder="Vendos Nivelin" value={materialInput.level} onChange={(e) => setMaterialInput({...materialInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> Tema</label><input type="text" placeholder="Vendos Temën" value={materialInput.topic} maxLength={MAX_TOPIC_LENGTH} onChange={(e) => { setMaterialInput({...materialInput, topic: e.target.value}); if (materialFieldErrors.topic) setMaterialFieldErrors(p => ({...p, topic: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.topic ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{materialFieldErrors.topic && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.topic}</p>}</div>
                      <button onClick={handleGenerateMaterials} disabled={loading || isSubmitting.current} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>{loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={18} />}<span>{loading ? 'Duke gjeneruar...' : 'Gjenero Materialin'}</span></button>
                    </div>
                  </section>
                  <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 flex items-center gap-2"><BookOpen size={18} /> Material Preview</h3>{generatedMaterial && (<div className="flex gap-2"><button onClick={handleDownloadMaterialWord} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Download size={14} /> Word</button><button onClick={handleDownloadMaterialPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100"><FileText size={14} /> PDF</button></div>)}</div>
                    <div className="p-8 flex-1 overflow-y-auto bg-white"><AnimatePresence mode="wait">{loading ? <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40"><BrainCircuit size={48} className="text-blue-600 animate-bounce" /><p className="font-black uppercase italic text-xs tracking-widest animate-pulse">AI po shkruan materialin...</p></div> : generatedMaterial ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose max-w-none"><div className="whitespace-pre-wrap text-slate-700 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-6">{generatedMaterial}</div></motion.div> : <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20"><BookOpen size={64} /><p className="font-black uppercase italic text-xs tracking-widest">Gati për gjenerim</p></div>}</AnimatePresence></div>
                  </section>
                </div>
              </motion.div>
            )}

            {/* ── HOMEWORK ─────────────────────────────────────────────────────── */}
            {activeTab === 'homework' && (
              <motion.div key="homework" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {homeworkApiError && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{homeworkApiError}</span><button onClick={() => setHomeworkApiError(null)} className="ml-auto text-red-400 hover:text-red-600 shrink-0"><X size={14}/></button></motion.div>)}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <section className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-6">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><ClipboardList className="text-blue-500" size={20} /> Gjenero Detyra</h2>
                    <div className="space-y-5">
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> Lënda</label><input type="text" placeholder="Vendos Lënden" value={homeworkInput.subject} maxLength={MAX_SUBJECT_LENGTH} onChange={(e) => { setHomeworkInput({...homeworkInput, subject: e.target.value}); if (homeworkFieldErrors.subject) setHomeworkFieldErrors(p => ({...p, subject: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{homeworkFieldErrors.subject && <p className="text-[10px] text-red-500 font-bold italic mt-1">{homeworkFieldErrors.subject}</p>}</div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> Tema</label><input type="text" placeholder="Vendos Temën" value={homeworkInput.topic} maxLength={MAX_TOPIC_LENGTH} onChange={(e) => { setHomeworkInput({...homeworkInput, topic: e.target.value}); if (homeworkFieldErrors.topic) setHomeworkFieldErrors(p => ({...p, topic: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.topic ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{homeworkFieldErrors.topic && <p className="text-[10px] text-red-500 font-bold italic mt-1">{homeworkFieldErrors.topic}</p>}</div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> Niveli</label><input type="text" placeholder="Vendos Nivelin Shkollor" value={homeworkInput.level} onChange={(e) => setHomeworkInput({...homeworkInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><ListOrdered size={14}/> Nr.</label><input type="number" min="1" max="10" value={homeworkInput.numTasks} onChange={(e) => { setHomeworkInput({...homeworkInput, numTasks: parseInt(e.target.value) || 1}); if (homeworkFieldErrors.numTasks) setHomeworkFieldErrors(p => ({...p, numTasks: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.numTasks ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} /></div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Target size={14}/> Tipi</label><select value={homeworkInput.type} onChange={(e) => setHomeworkInput({...homeworkInput, type: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm cursor-pointer"><option value="open">E hapur</option><option value="practical">Praktike</option><option value="mixed">E kombinuar</option></select></div>
                      </div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Calendar size={14}/> Afati <span className="text-slate-300 normal-case font-bold">(opsional)</span></label><input type="date" value={homeworkInput.deadline} onChange={(e) => setHomeworkInput({...homeworkInput, deadline: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Sparkles size={14}/> Instruksione <span className="text-slate-300 normal-case font-bold">(opsionale)</span></label><textarea placeholder="p.sh. Fokusohuni te zgjidhjet analitike..." value={homeworkInput.extraInfo} onChange={(e) => setHomeworkInput({...homeworkInput, extraInfo: e.target.value})} rows="3" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm resize-none" /></div>
                      <button onClick={handleGenerateHomework} disabled={loading || isSubmitting.current} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>{loading ? <RefreshCw className="animate-spin" size={20} /> : <ClipboardList size={18} />}<span>{loading ? 'Duke gjeneruar...' : 'Gjenero Detyrat'}</span></button>
                    </div>
                  </section>
                  <section className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 flex items-center gap-2"><ClipboardList size={18} /> Detyrat — Preview</h3>{generatedHomework && (<div className="flex gap-2"><button onClick={handleDownloadHomeworkWord} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Download size={14} /> Word</button><button onClick={handleDownloadHomeworkPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100"><FileText size={14} /> PDF</button></div>)}</div>
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                      <AnimatePresence mode="wait">
                        {loading && (<motion.div key="hw-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center space-y-6 opacity-50"><div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><ClipboardList className="text-blue-400" size={22} /></div></div><p className="font-black uppercase italic text-xs tracking-widest animate-pulse text-slate-400">AI po krijon detyrat...</p></motion.div>)}
                        {!loading && generatedHomework && (
                          <motion.div key="hw-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-3 items-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{homeworkInput.subject}</span><span className="text-slate-300">|</span><span className="text-[10px] font-black text-slate-400 italic">{homeworkInput.topic}</span>{homeworkInput.deadline && (<><span className="text-slate-300">|</span><span className="text-[10px] font-black text-orange-500 flex items-center gap-1"><Calendar size={12} /> Afati: {new Date(homeworkInput.deadline).toLocaleDateString('sq-AL', { day: '2-digit', month: 'long', year: 'numeric' })}</span></>)}</div>
                            {generatedHomework.map((task, idx) => {
                              const tConf = hwTypeConfig[task.type] || hwTypeConfig.open;
                              return (
                                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                  <div className="p-5 border-b border-slate-50 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</span><h4 className="font-black text-slate-700 text-sm md:text-base italic tracking-tight">{task.title}</h4></div><span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${tConf.bg} ${tConf.text}`}><span className={`w-1.5 h-1.5 rounded-full ${tConf.dot}`}></span>{tConf.label}</span></div>
                                  <div className="p-5 space-y-4"><p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>{task.requirements?.length > 0 && (<div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> Kërkesat</p><ul className="space-y-2">{task.requirements.map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>{req}</li>))}</ul></div>)}{task.rubric?.length > 0 && (<div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50"><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={12}/> Kriteret</p><div className="space-y-2">{task.rubric.map((r, i) => (<div key={i} className="flex items-center justify-between"><span className="text-xs text-slate-600 font-medium">{r.criteria}</span><span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">{r.points} pikë</span></div>))}<div className="flex items-center justify-between pt-2 border-t border-blue-100 mt-2"><span className="text-[10px] font-black text-slate-500 uppercase">Total</span><span className="text-[10px] font-black text-blue-700 bg-blue-200 px-2 py-0.5 rounded-lg">{task.rubric.reduce((s, r) => s + (r.points || 0), 0)} pikë</span></div></div></div>)}</div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                        {!loading && !generatedHomework && (<motion.div key="hw-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center space-y-4 opacity-20"><ClipboardList size={64} /><p className="font-black uppercase italic text-xs tracking-widest">Plotëso formën për të filluar</p></motion.div>)}
                      </AnimatePresence>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {/* ── GRADEBOOK / REGJISTRI ─────────────────────────────────────────── */}
            {activeTab === 'gradebook' && (
              <motion.div key="gradebook" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                {/* Header */}
                {/* Rregullojmë gap dhe wrap për butona */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><BookMarked className="text-blue-600" size={24} /> Regjistri i Notave</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Menaxho notat e studentëve sipas lëndës</p>
                  </div>
                  {/* Butonat tani përdorin flex-wrap për të shkuar në rresht të ri në ekranet e vogla */}
                  <div className="flex flex-wrap justify-end gap-3">
                    {/* Export PDF */}
                    {gradebook.length > 0 && (
                      <button onClick={handleGbExportPDF} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100">
                        <FileDown size={14} /> PDF
                      </button>
                    )}
                    
                    {/* Butoni shto */}
                    <button onClick={() => { 
                        setGbShowForm(true); 
                        setGbEditingId(null); // Sigurohemi qe nuk jemi ne edit mode
                        setGbAddMode('new');  // Default to adding a new student
                        setGbSelectedExistingStudent(null); // Ensure no existing student is selected
                        setGbForm({ // Reset form fields to default
                            subject: '', 
                            student_name: '', 
                            class_group: '',        
                            student_id_number: '',  
                            email_contact: '',      
                            period_1: '', 
                            period_2: '', 
                            period_3: '',
                            notes: '',               
                            scale: '5-10'           
                        }); 
                        setGbFormErrors({}); 
                    }} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200 active:scale-95">
                      <Plus size={16} /> Shto Student
                    </button>
                  </div>
                </div>



                {/* VIEW PËR NOTAT (Default) */}
                {gradebookSubTab === 'grades' && (
                  <>
                    {/* Error */}
                    {gradebookError && (<div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{gradebookError}</span><button onClick={() => setGradebookError(null)} className="ml-auto"><X size={14}/></button></div>)}

<AnimatePresence>
  {gbShowForm && (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-3xl border border-blue-100 shadow-lg p-6 md:p-8">
      <h3 className="text-sm font-black text-slate-700 uppercase italic tracking-tighter mb-6 flex items-center gap-2">
        {gbEditingId ? <Pencil size={16} className="text-blue-500" /> : <Plus size={16} className="text-blue-500" />}
        {gbEditingId ? 'Ndrysho të dhënat e studentit' : (gbAddMode === 'new' ? 'Shto student të ri' : 'Shto lëndë për student ekzistues')}
      </h3>
      
      {/* NEW: Zgjedhës modaliteti: Shto Student të Ri / Shto Lëndë për Student Ekzistues */}
      {!gbEditingId && ( // Shfaqet vetëm në modalitetin e shtimit, jo të editimit
        <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">Modaliteti i Shtimit</label>
            <div className="flex gap-2">
                <button 
                    type="button" 
                    onClick={() => {
                        setGbAddMode('new');
                        setGbSelectedExistingStudent(null); // Pastrojme zgjedhjen
                        setGbForm(prev => ({ // Pastrojme detajet e studentit, por jo lenden/notat
                            ...prev, 
                            student_name: '', class_group: '', student_id_number: '', email_contact: '', notes: '' 
                        }));
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${gbAddMode === 'new' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    Student i Ri
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        setGbAddMode('existing');
                        setGbForm(prev => ({ // Pastrojme detajet e studentit, por jo lenden/notat
                            ...prev, 
                            student_name: '', class_group: '', student_id_number: '', email_contact: '', notes: '' 
                        }));
                        // Nese ka vetem 1 student, zgjidhe ate automatikisht
                        if (gbUniqueStudents.length === 1) {
                            setGbSelectedExistingStudent(gbUniqueStudents[0]);
                            setGbForm(prev => ({
                                ...prev,
                                student_name: gbUniqueStudents[0].student_name || '',
                                class_group: gbUniqueStudents[0].class_group || '',
                                student_id_number: gbUniqueStudents[0].student_id_number || '',
                                email_contact: gbUniqueStudents[0].email_contact || '',
                                notes: gbUniqueStudents[0].notes || '',
                            }));
                        }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${gbAddMode === 'existing' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    Student Ekzistues
                </button>
            </div>
        </div>
      )}

      {gbAddMode === 'existing' && !gbEditingId && (
        <div className="mb-6">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 block italic"><User size={14}/> Zgjidh Studentin Ekzistues *</label>
          <div className="relative">
            <select 
              value={gbSelectedExistingStudent ? (gbSelectedExistingStudent.student_id_number || `${gbSelectedExistingStudent.student_name}-${gbSelectedExistingStudent.class_group}`) : ''}
              onChange={(e) => {
                const selectedIdentifier = e.target.value;
                const student = gbUniqueStudents.find(s => (s.student_id_number || `${s.student_name}-${s.class_group}`) === selectedIdentifier);
                setGbSelectedExistingStudent(student);
                if (student) {
                  setGbForm(prev => ({
                    ...prev,
                    student_name: student.student_name || '',
                    class_group: student.class_group || '',
                    student_id_number: student.student_id_number || '',
                    email_contact: student.email_contact || '',
                    notes: student.notes || '',
                    // Lenda dhe notat mbeten te lira per tu shtuar
                  }));
                } else {
                  setGbForm(prev => ({
                    ...prev,
                    student_name: '', class_group: '', student_id_number: '', email_contact: '', notes: ''
                  }));
                }
              }}
              className="appearance-none w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 cursor-pointer transition-all"
            >
              <option value="">-- Zgjidh Student --</option>
              {gbUniqueStudents.map(s => (
                <option 
                  key={s.student_id_number || `${s.student_name}-${s.class_group}`} 
                  value={s.student_id_number || `${s.student_name}-${s.class_group}`}
                >
                  {s.student_name} ({s.class_group || 'Pa Klasë'}) {s.student_id_number ? `[ID: ${s.student_id_number}]` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      )}

      {/* Seksioni i Detajeve të Studentit */}
      <h4 className="text-xs font-bold text-slate-600 mb-4 flex items-center gap-2"><User size={14} className="text-blue-500"/> Detajet e Studentit</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Emri Mbiemri */}
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><User size={14}/> Studenti *</label>
          <input type="text" placeholder="Emri Mbiemri" value={gbForm.student_name} onChange={(e) => { setGbForm({...gbForm, student_name: e.target.value}); if (gbFormErrors.student_name) setGbFormErrors(p => ({...p, student_name: null})); }} 
            className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.student_name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} 
            readOnly={gbAddMode === 'existing' && !gbEditingId} // Fusha bëhet readOnly nëse është student ekzistues dhe jo në edit mode
          />
          {gbFormErrors.student_name && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.student_name}</p>}
        </div>
        
        {/* Klasa / Grupi */}
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Users size={14}/> Klasa / Grupi *</label>
          <input type="text" placeholder="p.sh. 10-A, Grupi 3" value={gbForm.class_group} onChange={(e) => { setGbForm({...gbForm, class_group: e.target.value}); if (gbFormErrors.class_group) setGbFormErrors(p => ({...p, class_group: null})); }} 
            className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.class_group ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} 
            readOnly={gbAddMode === 'existing' && !gbEditingId} // Fusha bëhet readOnly
          />
          {gbFormErrors.class_group && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.class_group}</p>}
        </div>
        
        {/* ID / Numri Amzës */}
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Hash size={14}/> ID / Nr. Regjistrit (Opsionale)</label>
          <input type="text" placeholder="p.sh. 123456" value={gbForm.student_id_number} onChange={(e) => setGbForm({...gbForm, student_id_number: e.target.value})} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all" 
            readOnly={gbAddMode === 'existing' && !gbEditingId} // Fusha bëhet readOnly
          />
        </div>

        {/* Email / Kontakt */}
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Mail size={14}/> Email / Kontakt (Opsionale)</label>
          <input type="email" placeholder="p.sh. student@example.com" value={gbForm.email_contact} onChange={(e) => setGbForm({...gbForm, email_contact: e.target.value})} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all" 
            readOnly={gbAddMode === 'existing' && !gbEditingId} // Fusha bëhet readOnly
          />
        </div>

        {/* Lënda (Mbetet gjithmonë e editueshme) */}
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Book size={14}/> Lënda *</label>
          <input type="text" placeholder="p.sh. Matematikë" value={gbForm.subject} onChange={(e) => { setGbForm({...gbForm, subject: e.target.value}); if (gbFormErrors.subject) setGbFormErrors(p => ({...p, subject: null})); }} className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
          {gbFormErrors.subject && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.subject}</p>}
        </div>
      </div>

      {/* SEKSIONI I NOTAVE (SHTO KETE PJESE) */}
      <h4 className="text-xs font-bold text-slate-600 mb-4 mt-8 flex items-center gap-2">
        <Activity size={14} className="text-emerald-500"/> Notat e Periudhave & Sistemi
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        {/* Zgjedhja e Sistemit */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">Sistemi i Notave</label>
          <select 
            value={gbForm.scale} 
            onChange={(e) => setGbForm({...gbForm, scale: e.target.value})}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1-5">Sistemi 1-5</option>
            <option value="5-10">Sistemi 5-10</option>

          </select>
        </div>

        {/* Period 1 */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">Periudha 1</label>
          <input 
            type="number" 
            step="0.1"
            placeholder="Nota 1"
            value={gbForm.period_1} 
            onChange={(e) => setGbForm({...gbForm, period_1: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_1 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_1 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_1}</p>}
        </div>

        {/* Period 2 */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">Periudha 2</label>
          <input 
            type="number" 
            step="0.1"
            placeholder="Nota 2"
            value={gbForm.period_2} 
            onChange={(e) => setGbForm({...gbForm, period_2: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_2 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_2 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_2}</p>}
        </div>

        {/* Period 3 */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">Periudha 3</label>
          <input 
            type="number" 
            step="0.1"
            placeholder="Nota 3"
            value={gbForm.period_3} 
            onChange={(e) => setGbForm({...gbForm, period_3: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_3 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_3 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_3}</p>}
        </div>
      </div>


      {/* Seksioni i Shënimeve */}
      <h4 className="text-xs font-bold text-slate-600 mb-4 flex items-center gap-2"><BookMarked size={14} className="text-purple-500"/> Shënime & Komente</h4>
                          <div className="mb-6">
                            {/* Shënime */}
                            <div>
                              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">Shënime (Opsionale)</label>
                              <textarea rows="3" placeholder="Shto shënime ose komente të rëndësishme për studentin..." value={gbForm.notes} onChange={(e) => setGbForm({...gbForm, notes: e.target.value})} 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all resize-y" 
                                readOnly={gbAddMode === 'existing' && !gbEditingId} // Fusha bëhet readOnly
                              />
                            </div>
                          </div>

                          {gbFormErrors.general && <p className="text-[10px] text-red-500 font-bold italic mt-3">{gbFormErrors.general}</p>}
                          <div className="flex gap-3 mt-6">
                            <button onClick={handleGbCancel} className="px-6 py-3 rounded-2xl font-bold uppercase text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">Anulo</button>
                            <button onClick={handleGbSave} disabled={gbSaving} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all disabled:opacity-50 active:scale-95">
                              {gbSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              {gbSaving ? 'Po ruhet...' : (gbEditingId ? 'Ruaj Ndryshimet' : 'Shto Student')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>



                    {/* Filtrime */}
                    {/* Rregullojmë gridin e filtrave për responsive */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Kërkim */}
                      <div className="relative col-span-full"> {/* Kërkimi zë gjithë gjerësinë në të gjitha ekranet */}
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder="Kërko student, lëndë, klasë, ose ID..." value={gbSearchQuery} onChange={(e) => setGbSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 transition-all" />
                      </div>
                      
                      {/* Filtro sipas lëndes */}
                      {gbSubjects.length > 0 && (
                        <div className="relative">
                          <select value={gbFilterSubject} onChange={(e) => setGbFilterSubject(e.target.value)} className="appearance-none w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 cursor-pointer transition-all">
                            <option value="all">Të gjitha lëndët</option>
                            {gbSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                      )}

                


                      {/* NEW: Filtro sipas Klasës/Grupit */}
                      {gbClasses.length > 0 && (
                        <div className="relative">
                          <select value={gbFilterClass} onChange={(e) => setGbFilterClass(e.target.value)} className="appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 cursor-pointer transition-all">
                            <option value="all">Të gjitha klasat/grupet</option>
                            {gbClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                      )}
                    </div>


                    {/* Loading */}
                    {gradebookLoading && (
                      <div className="py-20 text-center"><Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" /><p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest animate-pulse">Duke ngarkuar regjistrin...</p></div>
                    )}

                    {/* Empty state */}
                    {!gradebookLoading && gradebook.length === 0 && (
                      <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <BookMarked size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-black uppercase italic text-xs tracking-widest text-slate-300">Nuk ka studentë të shtuar.</p>
                        <p className="text-[10px] text-slate-300 font-bold mt-2">Kliko "Shto Student" për të filluar.</p>
                      </div>
                    )}

                    {/* Tabela e grupuar sipas lëndes */}
                    {!gradebookLoading && Object.entries(gbGrouped).map(([subject, students]) => (
                      <motion.div key={subject} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Header lënda */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                            <h3 className="font-black text-slate-700 uppercase tracking-tighter italic text-sm md:text-base">{subject}</h3>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg uppercase">{students.length} studentë</span>
                          </div>
                          {/* Mesatarja e lëndes */}
                          {(() => {
                            const avgs = students.filter(s => s.average !== null).map(s => s.average);
                            if (avgs.length === 0) return null;
                            const classAvg = (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1);
                            return <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Mesatarja e klasës: <span className="text-blue-600">{classAvg}</span></span>;
                          })()}
                        </div>

                        {/* Tabela */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-50">
                                {/* Japim një gjerësi minimale për kolona kyçe në ekranet e vogla */}
                                <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[150px]">Studenti</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">P.1</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">P.2</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">P.3</th>
                                <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mes.</th>
                                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px]">Veprime</th>
                              </tr>
                            </thead>
                            <tbody>
                              {students.map((student, idx) => (
                                <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-blue-500">{student.student_name.charAt(0).toUpperCase()}</span></div>
                                      <div> {/* <-- KY <div> I RI MBESHTJELL EMERIN DHE TE DHENAT E REJA */}
                                        <span className="font-bold text-sm text-slate-700">{student.student_name}</span>
                                        {/* NEW: Shfaq Klasën/Grupin dhe ID-në */}
                                        {(student.class_group || student.student_id_number) && (
                                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                {student.class_group} {student.student_id_number && `(${student.student_id_number})`}
                                            </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-4 py-4 text-center"><GradeBadge value={student.period_1} scale={student.scale} /></td>
                                  <td className="px-4 py-4 text-center"><GradeBadge value={student.period_2} scale={student.scale} /></td>
                                  <td className="px-4 py-4 text-center"><GradeBadge value={student.period_3} scale={student.scale} /></td>

                                  <td className="px-4 py-4 text-center">
                                    {student.average !== null ? (
                                      <span className="inline-flex items-center justify-center w-12 h-8 rounded-xl text-sm font-black bg-slate-900 text-white">{student.average}</span>
                                    ) : <span className="text-[10px] font-black text-slate-300 italic">—</span>}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleGbEdit(student)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={14} /></button>
                                      <button onClick={() => handleGbDelete(student.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                                      <div className="relative">
                                        <button 
                                          onClick={() => {
                                            setActiveTab('gradebook');
                                            setGradebookSubTab('absences');
                                            setAbsencesFilter(student.student_name);
                                          }} 
                                          className="p-2 text-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center"
                                        >
                                          <Calendar size={14} />
                                          <ChevronDown size={10} className="ml-1" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    ))}

                    {/* No results */}
                    {!gradebookLoading && gradebook.length > 0 && Object.keys(gbGrouped).length === 0 && (
                      <div className="py-16 text-center bg-white rounded-3xl border border-slate-100">
                        <Search size={32} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-black uppercase italic text-xs tracking-widest text-slate-300">Nuk u gjet asnjë rezultat.</p>
                      </div>
                    )}
                  </>
                )}

                {/* VIEW PËR MUNGESAT */}
                {gradebookSubTab === 'absences' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm mt-6 min-h-[400px] flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-red-500 rounded-full"></div>
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter italic text-sm md:text-base">Mungesat: {absencesFilter}</h3>
                      </div>
                      <div className="flex items-center gap-3 relative">
                        {/* Butoni Mungon me Dropdown */}
                        <div className="relative" ref={absenceDropdownRef}>
                          <button 
                            onClick={() => setShowAbsenceDropdown(!showAbsenceDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-red-200 active:scale-95"
                          >
                            <Plus size={14} /> Mungon <ChevronDown size={14} />
                          </button>
                          
                          <AnimatePresence>
                            {showAbsenceDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: 10 }} 
                                className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                              >
                                <button onClick={() => handleRecordAbsence('Me arsye')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-50 transition-colors">Me arsye</button>
                                <button onClick={() => handleRecordAbsence('Pa arsye')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Pa arsye</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button 
                          onClick={() => setGradebookSubTab('grades')} 
                          className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <ChevronRight size={14} className="rotate-180" /> Kthehu
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8 flex-1 bg-white rounded-b-3xl">
                      {absencesLoading && absences.length === 0 ? (
                        <div className="text-center py-10">
                          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest animate-pulse">Duke ngarkuar mungesat...</p>
                        </div>
                      ) : absencesError ? (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2">
                          <AlertTriangle size={16} className="shrink-0" /><span>{absencesError}</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const studentAbsences = absences.filter(a => a.student_name === absencesFilter);
                            
                            if (studentAbsences.length === 0) {
                              return (
                                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
                                  <Calendar size={48} className="mx-auto mb-4 text-slate-200" />
                                  <p className="text-sm font-bold text-slate-500">Nuk ka asnjë mungesë të regjistruar për <span className="text-blue-600">{absencesFilter}</span>.</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Kliko butonin "Mungon" për të shtuar.</p>
                                </div>
                              );
                            }

                            return studentAbsences.map(ab => (
                              <div key={ab.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                                    <Calendar size={16} className="text-slate-400" />
                                  </div>
                                  <div>
                                    <span className="block font-black text-sm text-slate-700">{new Date(ab.date).toLocaleDateString('sq-AL')}</span>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mungesë</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${ab.reason === 'Me arsye' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                  {ab.reason}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </motion.div>
            )}

            {/* ── timer SOON ───────────────────────────────────────────────── */}
            {activeTab === 'timer_soon' && (
              <motion.div key="soon" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex items-center justify-center py-10">
                <div className="text-center bg-white p-8 md:p-16 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-2xl max-w-lg relative overflow-hidden mx-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
                  <div className="bg-blue-50 w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600"><Lock size={32} /></div>
                  <h2 className="text-xl md:text-3xl font-black text-slate-800 mb-4 tracking-tighter uppercase italic">Coming Soon...</h2>
                  <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed italic">The <span className="text-blue-600 font-bold italic">Detailed Timer</span> module is under development.</p>
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