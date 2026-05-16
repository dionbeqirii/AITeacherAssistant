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
  Users, Hash, Mail, Book, 
  Timer, Play, Pause, RotateCcw, Languages, Upload, FileImage, Moon, Sun
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { notify } from '../../lib/notifications';

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
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalEvaluations: 0, 
    classAverage: 0, 
    aiAccuracy: 0, 
    thisWeek: 0, 
    statsLoading: true,
    chartData: []
  });
  const [conversations, setConversations] = useState([]);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
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

  // ─── STATE NOTIFICATIONS ──────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        },
        (payload) => {
          if (payload.new && payload.new.user_id === user.id) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("❌ Gabim në lidhjen Realtime:", err);
      });

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [user]);

  const closeNotificationsAndMarkRead = async () => {
    setIsNotifOpen(false);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    }
  };

  const toggleNotifications = () => {
    if (isNotifOpen) closeNotificationsAndMarkRead();
    else setIsNotifOpen(true);
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };
  // ──────────────────────────────────────────────────────────────────────────

  // ─── STATE AI EXAMS ───────────────────────────────────────────────────────
  const [examFormData, setExamFormData] = useState({ professorName: '', subject: '', topic: '', level: 'Fakultet', numQuestions: 5, type: 'multiple-choice', difficulty: 'Medium', extraInfo: '' });
  const [examQuestions, setExamQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [examMode, setExamMode] = useState('manual');
  const [examMatFile, setExamMatFile] = useState(null);
  const [examMatPreview, setExamMatPreview] = useState(null);
  const [examMatCamera, setExamMatCamera] = useState(false);
  const examCameraRef = useRef(null);
  const examCanvasRef = useRef(null);
  const examFileInputRef = useRef(null);

  // ─── STATE HOMEWORK ───────────────────────────────────────────────────────
  const [homeworkInput, setHomeworkInput] = useState({ subject: '', topic: '', level: '', numTasks: 3, type: 'open', deadline: '', extraInfo: '' });
  const [generatedHomework, setGeneratedHomework] = useState(null);
  const [homeworkFieldErrors, setHomeworkFieldErrors] = useState({});
  const [homeworkApiError, setHomeworkApiError] = useState(null);
  const [hwMode, setHwMode] = useState('manual');
  const [hwMatFile, setHwMatFile] = useState(null);
  const [hwMatPreview, setHwMatPreview] = useState(null);
  const [hwMatCamera, setHwMatCamera] = useState(false);
  const hwCameraRef = useRef(null);
  const hwCanvasRef = useRef(null);
  const hwFileInputRef = useRef(null);

  // STATE GRADEBOOK & ABSENCES ───────────────────────────────────────────
  const [gradebook, setGradebook] = useState([]);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookError, setGradebookError] = useState(null);
  const [gbScale, setGbScale] = useState('1-5');
  const [gbFilterSubject, setGbFilterSubject] = useState('all');
  const [gbFilterClass, setGbFilterClass] = useState('all'); 
  const [gbSearchQuery, setGbSearchQuery] = useState('');
  const [gbShowForm, setGbShowForm] = useState(false);
  const [gbEditingId, setGbEditingId] = useState(null);
  const [gbForm, setGbForm] = useState({ 
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

  const [gbFormErrors, setGbFormErrors] = useState({});
  const [gbSaving, setGbSaving] = useState(false);
  const [gbAddMode, setGbAddMode] = useState('new'); 
  const [gbSelectedExistingStudent, setGbSelectedExistingStudent] = useState(null); 

  // STATE I SHTUAR PËR MUNGESAT
  const [gradebookSubTab, setGradebookSubTab] = useState('grades');
  const [absencesFilter, setAbsencesFilter] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  const [absencesError, setAbsencesError] = useState(null);
  const [showAbsenceDropdown, setShowAbsenceDropdown] = useState(false);
  const absenceDropdownRef = useRef(null);

  const [inputData, setInputData] = useState({ studentAnswer: '', questionText: '', rubric: '', subject: 'Programming' });
  const [gradingMode, setGradingMode] = useState('text');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [materialInput, setMaterialInput] = useState({ subject: '', level: '', topic: '', materialType: 'summary' });
  const [generatedMaterial, setGeneratedMaterial] = useState(null);
  const gradingAreaRef = useRef(null);
  
  const loadingMessages = [
    t('LOAD_ANALYZING'), 
    t('LOAD_CONSULTING'), 
    t('LOAD_COMPARING'), 
    t('LOAD_STRENGTHS'), 
    t('LOAD_FINALIZING')
  ];
  
  const resetGradingFields = () => {
    setResult(null); setError(null); setFieldErrors({}); setApiError(null);
    setInputData({ studentAnswer: '', questionText: '', rubric: '', subject: 'Programming' });
    setSelectedFile(null); setFilePreview(null); setIsCameraOpen(false);
    if (cameraRef.current?.srcObject) { cameraRef.current.srcObject.getTracks().forEach(t => t.stop()); cameraRef.current.srcObject = null; }
  };

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); }
    else { document.documentElement.classList.remove('dark'); }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTab === 'grading' && gradingAreaRef.current && !gradingAreaRef.current.contains(event.target) && !result && !loading) resetGradingFields();
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (isFeedbackOpen && feedbackRef.current && !feedbackRef.current.contains(event.target)) setIsFeedbackOpen(false);
      if (showAbsenceDropdown && absenceDropdownRef.current && !absenceDropdownRef.current.contains(event.target)) setShowAbsenceDropdown(false);
      
      if (isNotifOpen && notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
        setNotifications(prev => {
          const unreads = prev.filter(n => !n.is_read);
          if(unreads.length > 0) {
              const ids = unreads.map(n=>n.id);
              supabase.from('notifications').update({is_read: true}).in('id', ids).then();
              return prev.map(n => ({...n, is_read: true}));
          }
          return prev;
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab, isProfileOpen, isFeedbackOpen, result, loading, showAbsenceDropdown, isNotifOpen]);

  const fetchHistory = async (userId) => {
    const { data } = await supabase.from('conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setConversations(data);
  };

  const fetchStats = async (userId) => {
    try {
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

      const { data: gradebookEntries, error: gbError } = await supabase
        .from('gradebook')
        .select('subject, average')
        .eq('user_id', userId);
      
      if (gbError) console.error("Error fetching gradebook:", gbError);

      let classAverage = 0;
      const subjectAverages = {};

      if (gradebookEntries && gradebookEntries.length > 0) {
        const allAverages = gradebookEntries.map(entry => entry.average).filter(avg => avg !== null);
        if (allAverages.length > 0) {
          classAverage = parseFloat((allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length).toFixed(1));
        }

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

      const chartDataForSubjects = Object.entries(subjectAverages).map(([subject, average]) => ({
        name: subject,
        score: average, 
      }));

      setStats({
        totalEvaluations,
        classAverage,
        aiAccuracy: aiAccuracy, 
        thisWeek,
        statsLoading: false,
        chartData: chartDataForSubjects,
      });
    } catch (err) {
      console.error("Gabim gjatë marrjes së statistikave:", err);
      setStats(prev => ({ ...prev, statsLoading: false }));
    }
  };

  // ─── STATE PËR TIMER & STOPWATCH ──────────────────────────────────────────
  const [timerMode, setTimerMode] = useState('timer'); 
  const [time, setTime] = useState(15 * 60); 
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(15);
  
  const [isTimeUp, setIsTimeUp] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true; 
  }, []);

  useEffect(() => {
    let interval = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (timerMode === 'timer') {
            if (prevTime <= 1) {
              setIsTimerActive(false);
              setIsTimeUp(true);
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Gabim me zilen:", e));
              }
              return 0;
            }
            return prevTime - 1;
          } else {
            return prevTime + 1;
          }
        });
      }, 1000);
    } else if (!isTimerActive && time !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerMode]);

  useEffect(() => {
    if (!isTimerActive) {
      setTime(timerMode === 'timer' ? (inputMinutes || 0) * 60 : 0);
    }
  }, [timerMode, inputMinutes, isTimerActive]);

  const dismissTimeUp = () => {
    setIsTimeUp(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTime(timerMode === 'timer' ? (inputMinutes || 0) * 60 : 0);
  };

  const toggleTimer = () => setIsTimerActive(!isTimerActive);
  
  const resetTimer = () => {
    setIsTimerActive(false);
    dismissTimeUp(); 
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { 
        router.push('/login'); 
      } else { 
        const currentUser = session.user;
        setUser(currentUser); 
        
        setProfileForm(prev => ({ 
          ...prev, 
          fullName: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0], 
          avatarPreview: currentUser.user_metadata?.avatar_url || null 
        })); 
        
        await fetchStats(currentUser.id); 
        fetchHistory(currentUser.id); 
        fetchNotifications(currentUser.id);
      }
      setAuthLoading(false);
    };
    
    checkUser();
  }, [router, fetchNotifications]);

  useEffect(() => {
    let interval;
    if (loading) { interval = setInterval(() => { setStatusIndex(prev => (prev + 1) % loadingMessages.length); }, 2000); }
    else { setStatusIndex(0); }
    return () => clearInterval(interval);
  }, [loading]);

  const checkSessionAndRun = useCallback(async (fn) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApiError(t('ERR_SESSION_EXPIRED')); setTimeout(() => router.push('/login'), 2000); return; }
    await fn();
  }, [router, t]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) { setFeedbackStatus({ type: 'error', text: t('ERR_FB_RATING') }); return; }
    if (!feedbackForm.message.trim()) { setFeedbackStatus({ type: 'error', text: t('ERR_FB_MSG') }); return; }
    setFeedbackStatus({ type: 'loading', text: '' });
    try {
      const res = await fetch('/api/v1/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: feedbackForm.rating, message: feedbackForm.message, userId: user.id, fullName: profileForm.fullName || user.email }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || t('ERR_FB_FAIL'));
      setFeedbackStatus({ type: 'success', text: t('ERR_FB_SUCCESS') });
      setTimeout(() => { setIsFeedbackOpen(false); setFeedbackForm({ rating: 0, message: '' }); setFeedbackStatus({ type: 'idle', text: '' }); }, 2500);
    } catch (err) { setFeedbackStatus({ type: 'error', text: err.message }); }
  };

  const fetchGradebook = useCallback(async (subject = 'all') => {
    setGradebookLoading(true); 
    setGradebookError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setGradebookError(t('ERR_SESSION_EXPIRED_SHORT'));
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
        setGradebookError(t('ERR_SESSION_EXPIRED_SHORT'));
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      
      if (data.success) {
        setGradebook(data.data);
      } else {
        setGradebookError(data.error || t('ERR_LOADING'));
      }
    } catch (err) { 
      setGradebookError(t('ERR_CONNECTION'));
    } finally { 
      setGradebookLoading(false); 
    }
  }, [router, t]);

  const fetchAbsences = useCallback(async () => {
    setAbsencesLoading(true);
    setAbsencesError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setAbsencesError(t('ERR_SESSION_EXPIRED_SHORT'));
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      const res = await fetch('/api/v1/absences');
      const data = await res.json();
      
      if (data.success) {
        setAbsences(data.data);
      } else {
        setAbsencesError(data.error || t('ERR_LOADING_ABSENCES'));
      }
    } catch (err) {
      console.error('Fetch absences error:', err);
    } finally {
      setAbsencesLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (activeTab === 'gradebook') fetchGradebook('all'); 
  }, [activeTab, fetchGradebook]); 

  useEffect(() => {
    if (activeTab === 'gradebook' && gradebookSubTab === 'absences') {
      fetchAbsences();
    }
  }, [activeTab, gradebookSubTab, fetchAbsences]);

  const handleRecordAbsence = async (reason) => {
    setShowAbsenceDropdown(false);
    
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

  const gbSubjects = useMemo(() => {
    const s = [...new Set(gradebook.map(g => g.subject))].sort((a, b) => a.localeCompare(b, i18n.language));
    return s;
  }, [gradebook, i18n.language]);

  const gbClasses = useMemo(() => {
    const cleanedClassGroups = gradebook.map(g => g.class_group) 
                                      .filter(Boolean)        
                                      .map(c => c.trim());   
    const uniqueClassGroups = [...new Set(cleanedClassGroups)];
    return uniqueClassGroups.sort((a, b) => a.localeCompare(b, i18n.language));
  }, [gradebook, i18n.language]);

  const gbUniqueStudents = useMemo(() => {
    const studentsMap = new Map();
    gradebook.forEach(s => {
      const studentIdentifier = s.student_id_number && s.student_id_number !== '' 
                                ? s.student_id_number 
                                : `${s.student_name}-${s.class_group}`;
      
      if (!studentsMap.has(studentIdentifier)) {
        studentsMap.set(studentIdentifier, {
          id: studentIdentifier, 
          student_name: s.student_name,
          class_group: s.class_group,
          student_id_number: s.student_id_number,
          email_contact: s.email_contact,
          notes: s.notes,
        });
      }
    });
    return Array.from(studentsMap.values()).sort((a, b) => a.student_name.localeCompare(b.student_name, i18n.language));
  }, [gradebook, i18n.language]);

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
    }).sort((a, b) => a.student_name.localeCompare(b.student_name, i18n.language)); 
  }, [gradebook, gbFilterSubject, gbFilterClass, gbSearchQuery, i18n.language]); 

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
    if (!gbForm.subject.trim()) errors.subject = t('ERR_SUBJECT_REQ');
    
    if (gbEditingId) { 
        if (!gbForm.student_name.trim()) errors.student_name = t('ERR_STUDENT_REQ');
        if (!gbForm.class_group.trim()) errors.class_group = t('ERR_CLASS_REQ');
    } else if (gbAddMode === 'new') { 
        if (!gbForm.student_name.trim()) errors.student_name = t('ERR_STUDENT_REQ');
        if (!gbForm.class_group.trim()) errors.class_group = t('ERR_CLASS_REQ');
    } else if (gbAddMode === 'existing') { 
        if (!gbSelectedExistingStudent) errors.student_name = t('ERR_SELECT_STUDENT');
    }

    const max = gbForm.scale === '1-5' ? 5 : 10;
    const min = gbForm.scale === '5-10' ? 5 : 1; 
    ['period_1', 'period_2', 'period_3'].forEach((p) => {
      const val = gbForm[p];
      if (val !== '' && val !== null) {
        const num = parseFloat(val);
        if (isNaN(num) || num < min || num > max) {
          errors[p] = t('ERR_GRADE_RANGE', {min, max});
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
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { ...gbForm }; 
      const method = gbEditingId ? 'PUT' : 'POST';
      if (gbEditingId) payload.id = gbEditingId;
      const res = await fetch('/api/v1/gradebook', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      
      if (data.success) {
        if (gbEditingId) {
          await notify(user.id, t('TOAST_UPDATE_GRADE'), t('TOAST_UPDATE_GRADE_MSG', {name: gbForm.student_name}), 'success');
        } else {
          await notify(user.id, t('TOAST_NEW_STUDENT'), t('TOAST_NEW_STUDENT_MSG', {name: gbForm.student_name}), 'success');
        }

        setGbShowForm(false); setGbEditingId(null);
        setGbForm({ 
            subject: '', student_name: '', class_group: '', student_id_number: '', email_contact: '', 
            period_1: '', period_2: '', period_3: '', notes: '', scale: '5-10'  
        });
        setGbFormErrors({});
        fetchGradebook(gbFilterSubject);
      } else { 
        setGbFormErrors({ general: data.error || t('ERR_SAVING') }); 
      }
    } catch { setGbFormErrors({ general: t('ERR_CONNECTION') }); }
    finally { setGbSaving(false); }
  };

  const handleGbEdit = (student) => {
    setGbAddMode('new'); 
    setGbSelectedExistingStudent(null); 
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
    if (!confirm(t('ERR_CONFIRM_DELETE_STUDENT'))) return;
    try {
      const res = await fetch(`/api/v1/gradebook?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchGradebook(gbFilterSubject);
      else alert(t('ERR_DELETING') + data.error);
    } catch { alert(t('ERR_CONNECTION_SHORT')); }
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
    setGbAddMode('new'); 
    setGbSelectedExistingStudent(null); 
  };

  const handleGbExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 58, 138);
    doc.text(t('PDF_GB_TITLE'), pageWidth / 2, y, { align: 'center' }); y += 8;
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text(`${t('PDF_DATE')} ${new Date().toLocaleDateString(i18n.language === 'sq' ? 'sq-AL' : 'en-US')}`, pageWidth / 2, y, { align: 'center' }); y += 10;

    doc.setDrawColor(200, 210, 230); doc.line(15, y, pageWidth - 15, y); y += 8;
    Object.entries(gbGrouped).forEach(([subject, students]) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 58, 138);
      doc.text(subject.toUpperCase(), 15, y); y += 8;

      doc.setFillColor(239, 246, 255); doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
      doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "bold");
      doc.text(t('PDF_STUDENT'), 17, y);
      doc.text(t('PDF_P1'), pageWidth - 75, y, { align: 'center' });
      doc.text(t('PDF_P2'), pageWidth - 55, y, { align: 'center' });
      doc.text(t('PDF_P3'), pageWidth - 35, y, { align: 'center' });
      doc.text(t('PDF_AVG'), pageWidth - 15, y, { align: 'right' });
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
    doc.save(`Gradebook_${new Date().toLocaleDateString('sq-AL').replace(/\//g, '-')}.pdf`);
  };

  const handleExamGenerate = async (e) => {
    e.preventDefault();
    if (examMode === 'material') { handleExamFromMaterial(); return; }
    setExamLoading(true); setExamQuestions([]); setIsSaved(false);
    try {
      const res = await fetch('/api/v1/exams/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(examFormData) });
      const result = await res.json();
      if (result.success) setExamQuestions(result.data); else alert(t('ERR_GENERATING') + result.error);
    } catch { alert(t('ERR_NO_SERVER')); }
    finally { setExamLoading(false); }
  };

  const handleExamFromMaterial = async () => {
    if (!examMatFile) { alert('Ngarko një foto ose PDF të materialit fillimisht.'); return; }
    setExamLoading(true); setExamQuestions([]); setIsSaved(false);
    try {
      const fd = new FormData();
      fd.append('file', examMatFile);
      fd.append('level', examFormData.level);
      fd.append('numQuestions', String(examFormData.numQuestions));
      fd.append('type', examFormData.type);
      fd.append('difficulty', examFormData.difficulty);
      fd.append('professorName', examFormData.professorName);
      fd.append('extraInfo', examFormData.extraInfo);
      const res = await fetch('/api/v1/exams/generate-from-material', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) setExamQuestions(result.data); else alert('Gabim: ' + result.error);
    } catch (err) { alert('Gabim: ' + err.message); }
    finally { setExamLoading(false); }
  };

  const openExamCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setExamMatCamera(true);
      setTimeout(() => { if (examCameraRef.current) examCameraRef.current.srcObject = stream; }, 100);
    } catch (err) { alert('Kamera nuk mund të hapet: ' + err.message); }
  };

  const stopExamCamera = () => {
    if (examCameraRef.current?.srcObject) { examCameraRef.current.srcObject.getTracks().forEach(t => t.stop()); examCameraRef.current.srcObject = null; }
    setExamMatCamera(false);
  };

  const captureExamPhoto = () => {
    const video = examCameraRef.current; const canvas = examCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'material.jpg', { type: 'image/jpeg' });
      setExamMatFile(file); setExamMatPreview(canvas.toDataURL('image/jpeg')); stopExamCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleExamMatFileSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setExamMatFile(file);
    if (file.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => setExamMatPreview(ev.target.result); r.readAsDataURL(file); }
    else setExamMatPreview(null);
  };

  const handleHwFromMaterial = async () => {
    if (!hwMatFile) { alert('Ngarko një foto ose PDF të materialit fillimisht.'); return; }
    if (isSubmitting.current) return; isSubmitting.current = true;
    setLoading(true); setGeneratedHomework(null); setHomeworkApiError(null);
    try {
      const fd = new FormData();
      fd.append('file', hwMatFile);
      fd.append('level', homeworkInput.level);
      fd.append('numTasks', String(homeworkInput.numTasks));
      fd.append('type', homeworkInput.type);
      fd.append('deadline', homeworkInput.deadline);
      fd.append('extraInfo', homeworkInput.extraInfo);
      const res = await fetch('/api/v1/homework/generate-from-material', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) setGeneratedHomework(result.homework); else setHomeworkApiError(result.error);
    } catch (err) { setHomeworkApiError(err.message); }
    finally { setLoading(false); isSubmitting.current = false; }
  };

  const openHwCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHwMatCamera(true);
      setTimeout(() => { if (hwCameraRef.current) hwCameraRef.current.srcObject = stream; }, 100);
    } catch (err) { setHomeworkApiError('Kamera nuk mund të hapet: ' + err.message); }
  };

  const stopHwCamera = () => {
    if (hwCameraRef.current?.srcObject) { hwCameraRef.current.srcObject.getTracks().forEach(t => t.stop()); hwCameraRef.current.srcObject = null; }
    setHwMatCamera(false);
  };

  const captureHwPhoto = () => {
    const video = hwCameraRef.current; const canvas = hwCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'material-hw.jpg', { type: 'image/jpeg' });
      setHwMatFile(file); setHwMatPreview(canvas.toDataURL('image/jpeg')); stopHwCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleHwMatFileSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setHwMatFile(file);
    if (file.type.startsWith('image/')) { const r = new FileReader(); r.onload = ev => setHwMatPreview(ev.target.result); r.readAsDataURL(file); }
    else setHwMatPreview(null);
  };

  const handleSaveToHistory = async () => {
    if (examQuestions.length === 0) return; setIsSaving(true);
    try {
      const res = await fetch('/api/v1/exams/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: examFormData.subject, topic: examFormData.topic, level: examFormData.level, difficulty: examFormData.difficulty, professorName: examFormData.professorName, questions: examQuestions }) });
      const result = await res.json();
      if (result.success) setIsSaved(true); else alert(t('ERR_GENERIC') + (result.error || t('ERR_NOT_SAVED')));
    } catch (err) { alert(t('ERR_CONNECTION_SHORT') + " " + err.message); }
    finally { setIsSaving(false); }
  };

  const downloadExamWord = async () => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import('docx');
    const { saveAs } = await import('file-saver');
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: `${t('PDF_EXAM_PROVIM')} ${examFormData.subject.toUpperCase()}`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), new Paragraph({ text: `${t('PDF_PROFESSOR')} ${examFormData.professorName} | ${t('PDF_TOPIC_LBL')} ${examFormData.topic}`, alignment: AlignmentType.CENTER }), new Paragraph({ text: `${t('PDF_LEVEL')} ${examFormData.level} | ${t('PDF_DIFFICULTY')} ${examFormData.difficulty}`, alignment: AlignmentType.CENTER, spacing: { after: 400 } }), new Paragraph({ children: [new TextRun({ text: t('PDF_NAME_SURNAME'), size: 24 })], spacing: { after: 600 } }), ...examQuestions.flatMap((q, i) => [new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.question}`, bold: true, size: 24 })], spacing: { before: 400 } }), ...(q.options ? q.options.map((opt, j) => new Paragraph({ text: `${String.fromCharCode(65 + j)}) ${opt}`, indent: { left: 720 } })) : [new Paragraph({ text: t('PDF_ANSWER') }), new Paragraph({ text: "____________________________________________________________" })])]) ] }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `${examFormData.subject || 'Exam'}.docx`));
  };

  const downloadExamPDF = async () => {
    await import('jspdf-autotable');
    const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(18); doc.text(`${t('PDF_EXAM_PROVIM')} ${examFormData.subject.toUpperCase()}`, pw / 2, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`${t('PDF_PROFESSOR')} ${examFormData.professorName} | ${t('PDF_TOPIC_LBL')} ${examFormData.topic}`, pw / 2, 30, { align: 'center' });
    doc.text(`${t('PDF_LEVEL')} ${examFormData.level} | ${t('PDF_DIFFICULTY')} ${examFormData.difficulty}`, pw / 2, 36, { align: 'center' });
    doc.line(20, 45, pw - 20, 45);
    doc.text(t('PDF_NAME_SURNAME'), 20, 55);
    let y = 70;
    examQuestions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); const sq = doc.splitTextToSize(`${i + 1}. ${q.question}`, pw - 40); doc.text(sq, 20, y); y += sq.length * 7;
      doc.setFont("helvetica", "normal");
      if (q.options) { q.options.forEach((opt, j) => { doc.text(`${String.fromCharCode(65 + j)}) ${opt}`, 30, y); y += 7; }); }
      else { doc.text(t('PDF_ANSWER'), 30, y); y += 14; }
      y += 5;
    });
    doc.save(`${examFormData.subject || 'Exam'}.pdf`);
  };

  const validateHomeworkInputs = () => {
    const errors = {};
    if (!homeworkInput.subject.trim()) errors.subject = t('ERR_S_EMPTY');
    if (!homeworkInput.topic.trim()) errors.topic = t('ERR_T_EMPTY');
    if (homeworkInput.numTasks < 1 || homeworkInput.numTasks > 10) 
      errors.numTasks = t('ERR_NUM_TASKS');
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
        if (!res.ok) { if (res.status === 401) { setHomeworkApiError(t('ERR_SESSION_EXPIRED')); setTimeout(() => router.push('/login'), 2000); return; } throw new Error(`${t('ERR_GENERIC')} ${res.status}`); }
        const data = await res.json();
        if (data.success) setGeneratedHomework(data.homework); else setHomeworkApiError(data.error || t('ERR_UNKNOWN'));
      } catch (err) { if (err.name === 'AbortError') setHomeworkApiError(t('ERR_TIMEOUT')); else setHomeworkApiError(t('ERR_GENERIC') + err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleDownloadHomeworkPDF = () => {
    if (!generatedHomework) return;
    const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth(); const margin = 20;
    const uw = pw - margin * 2; let y = 20;
    const anp = (s = 20) => { if (y + s > 280) { doc.addPage(); y = 20; } };
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 58, 138); doc.text(homeworkInput.subject.toUpperCase(), pw / 2, y, { align: 'center' }); y += 8;
    doc.setFontSize(11); doc.setTextColor(100); doc.setFont("helvetica", "normal"); doc.text(`${t('PDF_TOPIC_LBL')} ${homeworkInput.topic}  |  ${t('PDF_LEVEL')} ${homeworkInput.level || 'N/A'}`, pw / 2, y, { align: 'center' });
    y += 6;
    if (homeworkInput.deadline) { doc.setFont("helvetica", "italic"); doc.setTextColor(180, 80, 50);
    doc.text(`${t('PDF_DEADLINE_LBL')} ${homeworkInput.deadline}`, pw / 2, y, { align: 'center' }); y += 6; }
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.5); doc.line(margin, y, pw - margin, y); y += 10;
    generatedHomework.forEach((task, idx) => {
      anp(30); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(30, 58, 138); const tl = doc.splitTextToSize(`${idx + 1}. ${task.title}`, uw); doc.text(tl, margin, y); y += tl.length * 6 + 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60); const dl = doc.splitTextToSize(task.description, uw); anp(dl.length * 5 + 5); doc.text(dl, margin, y); y += dl.length * 5 + 6;
      if (task.requirements?.length > 0) { anp(10); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40); doc.text(t('PDF_REQUIREMENTS'), margin, y); y += 6; doc.setFont("helvetica", "normal"); doc.setTextColor(70); task.requirements.forEach(r => { anp(7); const rl = doc.splitTextToSize(`• ${r}`, uw - 5); doc.text(rl, margin + 3, y); y += rl.length * 5 + 2; }); y += 3; }
      if (task.rubric?.length > 0) { anp(10); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40); doc.text(t('PDF_RUBRIC'), margin, y);
      y += 6; task.rubric.forEach(r => { anp(7); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80); doc.text(`• ${r.criteria}`, margin + 3, y); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 58, 138); doc.text(`${r.points} ${t('HW_POINTS')}`, pw - margin, y, { align: 'right' }); y += 6; }); }
      y += 5; anp(5); doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.3); doc.line(margin, y, pw - margin, y);
      y += 8;
    });
    doc.save(`Homework_${homeworkInput.subject}_${homeworkInput.topic}.pdf`);
  };

  const handleDownloadHomeworkWord = async () => {
    if (!generatedHomework) return;
    try {
      const tl = homeworkInput.type === 'open' ? t('HW_TYPE_OPEN') : homeworkInput.type === 'practical' ? t('HW_TYPE_PRACTICAL') : t('HW_TYPE_MIXED');
      let body = `<h1 style='color:#1e3a8a;font-family:Arial;text-align:center;'>${homeworkInput.subject.toUpperCase()}</h1><p style='text-align:center;color:#64748b;font-family:Arial;'>${t('PDF_TOPIC_LBL')} ${homeworkInput.topic} | ${t('PDF_TYPE_LBL')} ${tl}</p>`;
      if (homeworkInput.deadline) body += `<p style='text-align:center;color:#b45309;'><b>${t('PDF_DEADLINE_LBL')} ${homeworkInput.deadline}</b></p>`;
      body += `<hr/>`;
      generatedHomework.forEach((task, idx) => {
        body += `<h2 style='color:#1e3a8a;font-family:Arial;'>${idx + 1}. ${task.title}</h2><p style='font-family:Georgia;line-height:1.7;'>${task.description}</p>`;
        if (task.requirements?.length > 0) { body += `<p style='font-weight:bold;'>${t('PDF_REQUIREMENTS')}</p><ul>`; task.requirements.forEach(r => { body += `<li>${r}</li>`; }); body += `</ul>`; }
        if (task.rubric?.length > 0) { body += `<p style='font-weight:bold;'>${t('PDF_RUBRIC')}</p><table style='width:100%;border-collapse:collapse;'><tr style='background:#eff6ff;'><th style='border:1px solid #bfdbfe;padding:6px;'>Criteria</th><th style='border:1px solid #bfdbfe;padding:6px;text-align:center;'>Points</th></tr>`; task.rubric.forEach(r => { body += `<tr><td style='border:1px solid #e2e8f0;padding:6px;'>${r.criteria}</td><td style='border:1px solid #e2e8f0;padding:6px;text-align:center;'>${r.points}</td></tr>`; }); body += `</table>`; }
        body += `<hr/>`;
      });
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>${body}</body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `Homework_${homeworkInput.subject}.doc`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setHomeworkApiError(t('ERR_DOWNLOAD') + err.message); }
  };

  const validateGradingInputs = () => {
    const errors = {};
    if (!inputData.questionText.trim()) errors.questionText = t('ERR_Q_EMPTY');
    if (!inputData.studentAnswer.trim()) errors.studentAnswer = t('ERR_A_EMPTY');
    if (inputData.questionText.length > MAX_QUESTION_LENGTH) errors.questionText = t('ERR_MAX_CHARS', {max: MAX_QUESTION_LENGTH});
    if (inputData.studentAnswer.length > MAX_ANSWER_LENGTH) errors.studentAnswer = t('ERR_MAX_CHARS', {max: MAX_ANSWER_LENGTH});
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateMaterialInputs = () => {
    const errors = {};
    if (!materialInput.subject.trim()) errors.subject = t('ERR_S_EMPTY');
    if (!materialInput.topic.trim()) errors.topic = t('ERR_T_EMPTY');
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
        if (!res.ok) { throw new Error(`${t('ERR_GENERIC')} ${res.status}`); }
        const data = await res.json();
        if (data.success) setGeneratedMaterial(data.content); else setApiError(data.error || t('ERR_UNKNOWN'));
      } catch (err) { if (err.name === 'AbortError') setApiError(t('ERR_TIMEOUT')); else setApiError(t('ERR_GENERIC') + err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleDownloadMaterialPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(30, 58, 138); doc.text(materialInput.subject.toUpperCase(), 20, 20); doc.setFontSize(14); doc.setTextColor(100); doc.text(`${t('PDF_TOPIC_LBL')} ${materialInput.topic}`, 20, 30); doc.setLineWidth(0.5); doc.line(20, 35, 190, 35);
    doc.setFont("helvetica", "italic"); doc.setFontSize(11); doc.setTextColor(60); doc.text(doc.splitTextToSize(generatedMaterial, 170), 20, 45); doc.save(`Material_${materialInput.topic}.pdf`);
  };

  const handleDownloadMaterialWord = () => {
    try {
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><h1 style='color:#1e3a8a;font-family:Arial;'>${materialInput.subject.toUpperCase()}</h1><h3 style='color:#64748b;font-family:Arial;'>${t('PDF_TOPIC_LBL')} ${materialInput.topic}</h3><hr><p style='font-family:Georgia;line-height:1.6;white-space:pre-wrap;'>${generatedMaterial}</p></body></html>`;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `Material_${materialInput.topic}.doc`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setApiError(t('ERR_DOWNLOAD') + err.message); }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation(); if (!confirm(t('ERR_CONFIRM_DELETE_EVAL'))) return;
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) { alert(t('ERR_GENERIC') + error.message); return; }
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
    } catch { setError(t('ERR_LOAD_HISTORY')); } finally { setLoading(false); }
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
        if (!res.ok) { throw new Error(t('ERR_SERVER_STATUS', {status: res.status})); }
        const data = await res.json();
        
        if (data.success) {
          setResult(data.data);
          const { data: convData, error: convError } = await supabase.from('conversations').insert([{ user_id: user.id, title: `${t('EVAL_PREFIX')}: ${inputData.questionText.substring(0, 30)}...` }]).select().single();
          if (convError) throw convError;
          await supabase.from('messages').insert([{ conversation_id: convData.id, role: 'user', content: `Question: ${inputData.questionText} | Answer: ${inputData.studentAnswer}` }, { conversation_id: convData.id, role: 'assistant', content: JSON.stringify(data.data) }]);
          setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations + 1, thisWeek: prev.thisWeek + 1 }));
          fetchHistory(user.id);
        } else { throw new Error(data.error || t('ERR_EVAL_FAILED')); }
      } catch (err) { if (err.name === 'AbortError') setError(t('ERR_TIMEOUT'));
      else if (!navigator.onLine) setError(t('ERR_NO_INTERNET')); else setError(err.message); }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setIsCameraOpen(true);
      setTimeout(() => { if (cameraRef.current) cameraRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setError('Kamera nuk mund të hapet: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current?.srcObject) {
      cameraRef.current.srcObject.getTracks().forEach(t => t.stop());
      cameraRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = cameraRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'exam-photo.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setFilePreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleImageGrade = async () => {
    if (!selectedFile) { setError('Zgjidh një foto ose PDF të provimit.'); return; }
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true); setError(null); setResult(null); setApiError(null);
    await checkSessionAndRun(async () => {
      try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('subject', inputData.subject || 'Pa lëndë');
        fd.append('rubric', inputData.rubric || '');
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 60000);
        const res = await fetch('/api/v1/grading/grade-image', { method: 'POST', body: fd, signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) { throw new Error(t('ERR_SERVER_STATUS', { status: res.status })); }
        const data = await res.json();
        if (data.success) {
          setResult(data.data);
          const { data: convData, error: convError } = await supabase.from('conversations').insert([{ user_id: user.id, title: `${t('EVAL_PREFIX')}: ${selectedFile.name}` }]).select().single();
          if (!convError) {
            await supabase.from('messages').insert([
              { conversation_id: convData.id, role: 'user', content: `[Foto/PDF] ${selectedFile.name}` },
              { conversation_id: convData.id, role: 'assistant', content: JSON.stringify(data.data) }
            ]);
          }
          setStats(prev => ({ ...prev, totalEvaluations: prev.totalEvaluations + 1, thisWeek: prev.thisWeek + 1 }));
          fetchHistory(user.id);
        } else { throw new Error(data.error || t('ERR_EVAL_FAILED')); }
      } catch (err) {
        if (err.name === 'AbortError') setError(t('ERR_TIMEOUT'));
        else setError(err.message);
      }
    });
    setLoading(false); isSubmitting.current = false;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault(); 
    setLoading(true);
    
    try {
      let finalAvatarUrl = profileForm.avatarPreview;

      // 1. Ngarkimi në Storage (ndodh vetëm nëse ka skedar të ri)
      if (profileForm.avatarFile) { 
        const fileExt = profileForm.avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`; 
        
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(fileName, profileForm.avatarFile, { upsert: true });
          
        if (uploadError) throw uploadError; 
        
        const { data } = supabase.storage.from('profiles').getPublicUrl(fileName); 
        finalAvatarUrl = data.publicUrl;
      }

      // 2. Ruajtja dhe fshirja
      const { error: updateError } = await supabase.auth.updateUser({ 
        data: { 
          full_name: profileForm.fullName, 
          avatar_url: finalAvatarUrl || "" 
        } 
      });
      
      if (updateError) throw updateError;
      
      const mesazhi = finalAvatarUrl ? t('TOAST_PROFILE_UPDATED') : t('TOAST_PHOTO_DELETED');
      await notify(user.id, t('TOAST_UPDATE'), mesazhi, 'success');

      setIsProfileOpen(false); 
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
      setProfileForm(prev => ({...prev, avatarFile: null}));

    } catch (err) { 
      notify(user?.id, t('TOAST_ERROR'), err.message, 'error');
    } finally { 
      setLoading(false); 
    }
  };

const renderedProfileModal = useMemo(() => (
    <AnimatePresence>
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div ref={profileRef} initial={{ scale: 0.97, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 10 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative">
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"><X size={20}/></button>
              
              {/* ZONA E FOTOS ME MENU INTERAKTIVE */}
              <div className="relative w-24 h-24 mx-auto mb-4 group">
                <div className="w-full h-full bg-white/20 rounded-3xl flex items-center justify-center border-2 border-white/30 overflow-hidden shadow-lg relative">
                  {profileForm.avatarPreview ? (
                    <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-white/80"/>
                  )}
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsAvatarMenuOpen(!isAvatarMenuOpen);
                    }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-10"
                    title={t('GB_AVATAR_TITLE')}
                  >
                    <Camera size={24} className="text-white" />
                  </button>
                </div>

                <AnimatePresence>
                  {isAvatarMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden p-1.5"
                    >
                      <div className="relative">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                        >
                          <Pencil size={14} className="text-blue-500" />
                        </button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          onChange={(e) => { 
                            const file = e.target.files[0];
                            if(file) {
                              setProfileForm({...profileForm, avatarPreview: URL.createObjectURL(file), avatarFile: file});
                              setIsAvatarMenuOpen(false);
                            }
                          }} 
                        />
                      </div>

                      {profileForm.avatarPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setProfileForm({...profileForm, avatarPreview: null, avatarFile: null});
                            setIsAvatarMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <h3 className="text-2xl font-black tracking-tight truncate px-4">{profileForm.fullName || user?.email.split('@')[0]}</h3>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1">{user?.email}</p>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 md:p-8 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <UserCircle size={14}/> {t('FULL_NAME')}
                </label>
                <input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Shield size={14}/> {t('CURRENT_PASSWORD')}
                </label>
                <input type="password" value={profileForm.currentPassword} onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Shield size={14}/> {t('NEW_PASSWORD')}
                </label>
                <input type="password" value={profileForm.newPassword} onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* ── BUTONI I GJUHËS ── */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Languages size={14}/> {t('LANGUAGE')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => i18n.changeLanguage('sq')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${i18n.language?.includes('sq') ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    Shqip
                  </button>
                  <button
                    type="button"
                    onClick={() => i18n.changeLanguage('en')}
                    className={`flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${i18n.language?.includes('en') ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* ── DARK MODE TOGGLE ── */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {darkMode ? <Moon size={14}/> : <Sun size={14}/>} Tema
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDarkMode(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${!darkMode ? 'bg-amber-400 text-white shadow-md shadow-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    <Sun size={14}/> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setDarkMode(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${darkMode ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    <Moon size={14}/> Dark
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsProfileOpen(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">{t('CANCEL')}</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex justify-center items-center gap-2">
                  {loading ? t('SAVING') : t('SAVE')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ), [isProfileOpen, profileForm, loading, user, isAvatarMenuOpen, t, i18n.language, darkMode]);

  const renderedFeedbackModal = useMemo(() => (
    <AnimatePresence>
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div ref={feedbackRef} initial={{ scale: 0.97, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 10 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-8 text-white text-center relative">
              <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30"><MessageSquare size={32} className="text-blue-400" /></div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">{t('FB_TITLE')}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">{t('FB_SUBTITLE')}</p>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="p-6 md:p-8">
              <div className="flex justify-center gap-2 mb-6">{[1,2,3,4,5].map(star => (<button key={star} type="button" onClick={() => setFeedbackForm({...feedbackForm, rating: star})} className={`p-2 transition-all hover:scale-110 active:scale-95 ${feedbackForm.rating >= star ? 'text-yellow-400 drop-shadow-md' : 'text-slate-200'}`}><Star size={32} fill={feedbackForm.rating >= star ? "currentColor" : "none"} /></button>))}</div>
              <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">{t('FB_MESSAGE')}</label><textarea rows="4" value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})} placeholder={t('FB_MESSAGE_PH')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <AnimatePresence>{feedbackStatus.type !== 'idle' && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4"><p className={`text-[10px] font-black uppercase tracking-widest italic text-center p-2 rounded-xl ${feedbackStatus.type === 'error' ? 'text-red-500 bg-red-50' : feedbackStatus.type === 'success' ? 'text-green-500 bg-green-50' : 'text-blue-500 bg-blue-50 animate-pulse'}`}>{feedbackStatus.type === 'loading' ? t('FB_SENDING') : feedbackStatus.text}</p></motion.div>)}</AnimatePresence>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setIsFeedbackOpen(false)} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-slate-100 text-slate-500">{t('FB_CANCEL')}</button>
                <button type="submit" disabled={feedbackStatus.type === 'loading'} className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16}/> {t('FB_SEND')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  ), [isFeedbackOpen, feedbackForm, feedbackStatus, t]);

  if (authLoading || !user) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold uppercase italic tracking-widest text-blue-600">{t('HEADER_AUTHENTICATING')}</div>;

  const metricCards = [
    { key: 'total', label: t('METRIC_TOTAL'), value: stats.totalEvaluations, suffix: '', decimals: 0, icon: Activity, iconBg: 'bg-blue-500', iconColor: 'text-white', valuColor: 'text-slate-800', accent: 'border-l-blue-500', badge: stats.thisWeek > 0 ? t('METRIC_WEEK_PLUS', { count: stats.thisWeek }) : t('METRIC_NO_WEEK'), badgeBg: stats.thisWeek > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400', trend: stats.thisWeek > 0 },
    { key: 'avg', label: t('METRIC_AVG'), value: stats.classAverage, suffix: '/100', decimals: 1, icon: TrendingUp, iconBg: 'bg-emerald-500', iconColor: 'text-white', valuColor: 'text-emerald-600', accent: 'border-l-emerald-500', badge: stats.classAverage >= 70 ? t('METRIC_ABOVE') : stats.classAverage > 0 ? t('METRIC_BELOW') : t('METRIC_NO_DATA'), badgeBg: stats.classAverage >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500', trend: stats.classAverage >= 70, progressValue: stats.classAverage },
    { key: 'acc', label: t('METRIC_AI_ACC'), value: stats.aiAccuracy, suffix: '%', decimals: 1, icon: Zap, iconBg: 'bg-violet-500', iconColor: 'text-white', valuColor: 'text-violet-600', accent: 'border-l-violet-500', badge: t('METRIC_AI_MODEL'), badgeBg: 'bg-violet-50 text-violet-600', trend: true, progressValue: stats.aiAccuracy },
    { key: 'week', label: t('METRIC_WEEK'), value: stats.thisWeek, suffix: '', decimals: 0, icon: Award, iconBg: 'bg-amber-500', iconColor: 'text-white', valuColor: 'text-amber-600', accent: 'border-l-amber-500', badge: t('METRIC_7_DAY'), badgeBg: 'bg-amber-50 text-amber-600', trend: stats.thisWeek > 0 },
  ];

  const hwTypeConfig = { 
    open: { label: t('HW_TYPE_OPEN_LBL'), bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' }, 
    practical: { label: t('HW_TYPE_PRACTICAL_LBL'), bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' }, 
    mixed: { label: t('HW_TYPE_MIXED_LBL'), bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' } 
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-xl transition-transform duration-300 md:relative md:translate-x-0 md:shadow-sm shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><GraduationCap size={24} /></div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase italic">{t('SIDEBAR_BRAND')}</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X size={20}/></button>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><LayoutDashboard size={20} /> {t('SIDEBAR_DASHBOARD')}</button>
          <button onClick={() => { setActiveTab('gradebook'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'gradebook' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><BookMarked size={20} /> {t('SIDEBAR_GRADEBOOK')}</button>
          <button onClick={() => { setActiveTab('grading'); resetGradingFields(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grading' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><FileText size={20} /> {t('SIDEBAR_GRADING')}</button>
          <button onClick={() => { setActiveTab('ai_exams'); setExamQuestions([]); setIsSaved(false); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai_exams' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><Sparkles size={20} /> {t('SIDEBAR_EXAMS')}</button>
          <button onClick={() => { setActiveTab('learning_materials'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'learning_materials' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><BookOpen size={20} /> {t('SIDEBAR_MATERIALS')}</button>
          <button onClick={() => { setActiveTab('homework'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'homework' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><ClipboardList size={20} /> {t('SIDEBAR_HOMEWORK')}</button>
          <button onClick={() => { setActiveTab('timer_soon'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'timer_soon' ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}><div className="flex items-center gap-3"><BarChart3 size={20} /> {t('SIDEBAR_TIMER')}</div><span className="text-[8px] bg-slate-100 px-1 rounded text-slate-400 font-bold tracking-tighter"></span></button>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
          <button onClick={() => { setIsFeedbackOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all font-bold uppercase text-xs italic tracking-widest"><MessageSquare size={20} /> {t('SIDEBAR_FEEDBACK')}</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold uppercase text-xs italic tracking-widest"><LogOut size={20} /> {t('SIDEBAR_LOGOUT')}</button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <header className="relative z-50 h-20 bg-white/50 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 bg-white rounded-xl shadow-sm border border-slate-100"><Menu size={20}/></button>
            <div className="flex flex-col">
              <h2 className="text-base md:text-xl font-black text-slate-800 tracking-tight italic leading-none truncate max-w-[150px] md:max-w-none">{t('HEADER_GREETING', { name: profileForm.fullName.split(' ')[0] })}</h2>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase italic tracking-widest mt-1 opacity-70">{t('HEADER_SUBTITLE')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            

            {/* ── BUTONI I NJOFTIMEVE ── */}
              <div className="relative" ref={notifRef}>
              <button 
                onClick={toggleNotifications}
                className={`p-2.5 rounded-xl transition-all relative ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
              >
                <Bell size={20}/>
                
                {/* ── NDRYSHIMI: Badge me Numër ── */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 md:w-[400px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
                      <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter italic flex items-center gap-2"><Bell size={16} className="text-blue-500"/> {t('NOTIF_TITLE')}</h3>
                      <button onClick={closeNotificationsAndMarkRead} className="text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600 transition-colors"><X size={14} /></button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-3 bg-slate-50/30 dark:bg-slate-900/30 space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                          <Bell size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">{t('NOTIF_EMPTY')}</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`flex items-start justify-between p-4 rounded-2xl transition-all border ${notif.is_read ? 'bg-white dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 shadow-sm' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-md'}`}
                          >
                            <div className="pr-3">
                              <p className={`text-sm font-bold tracking-tight leading-snug ${notif.is_read ? 'text-slate-600 dark:text-slate-200' : 'text-blue-800 dark:text-blue-300'}`}>{notif.title}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">{notif.message}</p>
                              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-3">
                                {new Date(notif.created_at).toLocaleDateString(i18n.language === 'sq' ? 'sq-AL' : 'en-US', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                              className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-xl transition-colors shrink-0"
                              title={t('NOTIF_DELETE')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 md:gap-3 pl-1 pr-2 md:pl-2 md:pr-4 py-1 md:py-1.5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm transition-all active:scale-95">
              <div className="w-8 h-8 rounded-xl bg-blue-600 overflow-hidden flex items-center justify-center text-white shadow-md shadow-blue-100">{profileForm.avatarPreview ? <img src={profileForm.avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={16} />}</div>
              <div className="text-left hidden lg:block"><p className="text-[9px] font-black text-slate-400 uppercase italic leading-none mb-1">{t('HEADER_PROFILE')}</p><p className="text-xs font-bold text-slate-700 leading-none truncate max-w-[80px]">{profileForm.fullName}</p></div>
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
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 italic uppercase tracking-tighter"><Sparkles className="text-blue-500" size={20} /> {t('GRADING_TASK_DETAILS')}</h2>

                    {/* ── Mode tabs ── */}
                    <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
                      {[
                        { key: 'text', label: t('GRADING_TAB_TEXT'), icon: <Send size={11} /> },
                        { key: 'image', label: t('GRADING_TAB_PHOTO'), icon: <Camera size={11} /> },
                        { key: 'pdf', label: t('GRADING_TAB_PDF'), icon: <FileImage size={11} /> },
                      ].map(tab => (
                        <button key={tab.key} onClick={() => { setGradingMode(tab.key); setSelectedFile(null); setFilePreview(null); setIsCameraOpen(false); setResult(null); setError(null); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${gradingMode === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                          {tab.icon}{tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-5">
                      {/* ── TEXT MODE ── */}
                      {gradingMode === 'text' && (<>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">{t('GRADING_EXAM_Q')}</label>
                          <textarea value={inputData.questionText} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm md:text-base ${fieldErrors.questionText ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} rows="3" placeholder={t('GRADING_Q_PH')} maxLength={MAX_QUESTION_LENGTH} onChange={(e) => { setInputData({...inputData, questionText: e.target.value}); if (fieldErrors.questionText) setFieldErrors(p => ({...p, questionText: null})); }} />
                          <div className="flex justify-between mt-1">{fieldErrors.questionText ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.questionText}</p> : <span />}<span className={`text-[10px] font-bold italic ${inputData.questionText.length > MAX_QUESTION_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>{inputData.questionText.length}/{MAX_QUESTION_LENGTH}</span></div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">{t('GRADING_STUDENT_ANS')}</label>
                          <textarea value={inputData.studentAnswer} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 md:h-40 font-medium text-sm md:text-base ${fieldErrors.studentAnswer ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} placeholder={t('GRADING_A_PH')} maxLength={MAX_ANSWER_LENGTH} onChange={(e) => { setInputData({...inputData, studentAnswer: e.target.value}); if (fieldErrors.studentAnswer) setFieldErrors(p => ({...p, studentAnswer: null})); }} />
                          <div className="flex justify-between mt-1">{fieldErrors.studentAnswer ? <p className="text-[10px] text-red-500 font-bold italic">{fieldErrors.studentAnswer}</p> : <span />}<span className={`text-[10px] font-bold italic ${inputData.studentAnswer.length > MAX_ANSWER_LENGTH * 0.9 ? 'text-red-400' : 'text-slate-300'}`}>{inputData.studentAnswer.length}/{MAX_ANSWER_LENGTH}</span></div>
                        </div>
                        <button onClick={handleGrade} disabled={loading || isSubmitting.current} className={`relative w-full font-black uppercase tracking-widest py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>
                          <AnimatePresence mode="wait">{loading ? <motion.div key="l" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2"><BrainCircuit className="animate-spin" size={20} /> <span>{t('GRADING_PROCESSING')}</span></motion.div> : <motion.div key="s" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2"><Send size={18} /> <span>{t('GRADING_ANALYZE_BTN')}</span></motion.div>}</AnimatePresence>
                        </button>
                      </>)}

                      {/* ── IMAGE / PDF MODE ── */}
                      {(gradingMode === 'image' || gradingMode === 'pdf') && (<>

                        {/* Camera live view */}
                        {isCameraOpen && (
                          <div className="relative">
                            <video ref={cameraRef} autoPlay playsInline className="w-full rounded-2xl border-2 border-blue-200" />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="flex gap-2 mt-3">
                              <button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Camera size={14} /> {t('BTN_CAPTURE')}</button>
                              <button onClick={stopCamera} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">{t('CANCEL')}</button>
                            </div>
                          </div>
                        )}

                        {/* Upload area */}
                        {!isCameraOpen && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="group border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all"
                          >
                            {filePreview ? (
                              <img src={filePreview} alt="Parashikim" className="max-h-52 mx-auto rounded-xl object-contain" />
                            ) : selectedFile ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <FileImage size={32} className="text-blue-400" />
                                <p className="text-sm font-bold text-blue-600 break-all">{selectedFile.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{t('PDF_READY_ANALYZE')}</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 py-4">
                                <Upload size={32} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                                    {gradingMode === 'pdf' ? t('UPLOAD_CLICK_PDF') : t('UPLOAD_CLICK_PHOTO')}
                                  </p>
                                  <p className="text-[9px] text-slate-300 mt-1 font-bold">{gradingMode === 'pdf' ? t('UPLOAD_SUPPORTS_PDF') : t('UPLOAD_SUPPORTS_IMG')}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <input ref={fileInputRef} type="file" accept={gradingMode === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp'} className="hidden" onChange={handleFileSelect} />

                        {/* Camera button (only for image mode) */}
                        {gradingMode === 'image' && !isCameraOpen && !selectedFile && (
                          <button onClick={openCamera} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-500 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 transition-all">
                            <Camera size={15} /> {t('BTN_OPEN_CAMERA')}
                          </button>
                        )}

                        {/* Remove selected file */}
                        {selectedFile && !isCameraOpen && (
                          <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="w-full text-[10px] font-black uppercase text-red-400 hover:text-red-500 transition-colors py-1">
                            ✕ {t('BTN_REMOVE_FILE')}
                          </button>
                        )}

                        {/* Optional rubric */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">{t('GRADING_RUBRIC_OPT')}</label>
                          <input type="text" value={inputData.rubric} onChange={(e) => setInputData({...inputData, rubric: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder={t('GRADING_RUBRIC_PH')} />
                        </div>

                        {/* Analyze button */}
                        <button onClick={handleImageGrade} disabled={loading || isSubmitting.current || !selectedFile} className={`relative w-full font-black uppercase tracking-widest py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current || !selectedFile ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>
                          <AnimatePresence mode="wait">{loading ? <motion.div key="l" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2"><BrainCircuit className="animate-spin" size={20} /> <span>{t('GRADING_PROCESSING')}</span></motion.div> : <motion.div key="s" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2">{gradingMode === 'pdf' ? <FileImage size={18} /> : <Camera size={18} />}<span>{gradingMode === 'pdf' ? t('GRADING_ANALYZE_PDF') : t('GRADING_ANALYZE_PHOTO')}</span></motion.div>}</AnimatePresence>
                        </button>
                      </>)}
                    </div>
                  </section>
                  <section className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl min-h-[400px] md:min-h-[500px] relative overflow-hidden flex flex-col justify-center border-4 border-slate-800">
                    <AnimatePresence mode="wait">
                      {loading ? (<motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-8 text-center"><div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-20 h-20 md:w-28 md:h-28 border-4 border-blue-500/10 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-blue-400 animate-pulse" size={30} /></div></div><div className="space-y-2"><motion.p key={statusIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg md:text-2xl font-bold text-blue-50 italic uppercase tracking-tighter">{loadingMessages[statusIndex]}</motion.p></div></motion.div>)
                      : result ? (<motion.div key="res" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8"><div className="flex items-center justify-between"><div className="max-w-[60%]"><h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">{t('GRADING_EVAL_REPORT')}</h3><p className="text-slate-400 text-[10px] md:text-sm italic">{t('GRADING_AI_DISCLAIMER')}</p></div><div className="bg-slate-800 p-3 md:p-4 rounded-2xl text-center border border-slate-700 shadow-inner"><span className="text-3xl md:text-5xl font-black text-green-400">{result.score}</span><span className="block text-[8px] md:text-[10px] font-black text-slate-500 uppercase italic">{t('GRADING_POINTS')}</span></div></div><div className="h-px bg-slate-700"></div><div><h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-xs md:text-sm uppercase italic tracking-tighter"><BrainCircuit size={16} /> {t('GRADING_AI_ANALYSIS')}</h4><p className="text-slate-300 text-xs md:text-sm italic bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 leading-relaxed max-h-40 overflow-y-auto">{result.feedback}</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20"><h5 className="text-green-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><CheckCircle2 size={12}/> {t('GRADING_STRENGTHS')}</h5><ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.strengths?.map((s, i) => <li key={i}>• {s}</li>) || <li>{t('GRADING_NONE_IDENTIFIED')}</li>}</ul></div><div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20"><h5 className="text-red-400 text-[10px] font-black mb-3 uppercase tracking-widest italic flex items-center gap-2"><AlertTriangle size={12}/> {t('GRADING_SUGGESTIONS')}</h5><ul className="text-[10px] md:text-xs space-y-2 text-slate-400 font-medium">{result.weaknesses?.map((w, i) => <li key={i}>• {w}</li>) || <li>{t('GRADING_CORRECT')}</li>}</ul></div></div></motion.div>)
                      : <div className="text-center opacity-30"><Database size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] italic tracking-widest">{t('GRADING_SYS_READY')}</p></div>}
                    </AnimatePresence>
                  </section>
                </div>
                <div className="mt-8 md:mt-12">
                  <div className="flex items-center gap-4 mb-8"><h3 className="text-lg md:text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><History size={20} className="text-blue-600" /> {t('GRADING_HISTORY')}</h3><div className="h-px flex-1 bg-slate-200"></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {conversations.length > 0 ? conversations.map(conv => (
                      <motion.div key={conv.id} onClick={() => loadConversation(conv)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all relative cursor-pointer">
                        <div className="flex justify-between items-start mb-4"><span className="text-[8px] md:text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase italic">{new Date(conv.created_at).toLocaleDateString(i18n.language === 'sq' ? 'sq-AL' : 'en-US')}</span><button onClick={(e) => deleteConversation(e, conv.id)} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button></div>
                        <p className="text-xs md:text-sm font-bold text-slate-700 mb-4 uppercase italic tracking-tighter line-clamp-2">{conv.title}</p>
                        <div className="flex items-center justify-between text-[8px] md:text-[10px] text-slate-400 font-black uppercase italic"><span>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><div className="flex items-center gap-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">{t('GRADING_VIEW')} <ChevronRight size={12} /></div></div>
                      </motion.div>
                    )) : <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 italic text-slate-400 font-bold uppercase text-xs tracking-widest">{t('GRADING_NO_EVALS')}</div>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── AI EXAMS ─────────────────────────────────────────────────────── */}
            {activeTab === 'ai_exams' && (
              <motion.div key="ai_exams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-[1400px] mx-auto space-y-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-5"><div><div className="flex items-center gap-2 mb-1"><span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">{t('EXAMS_AI_STUDIO')}</span><h1 className="text-xl md:text-3xl font-black text-slate-700 tracking-tighter uppercase italic">{t('EXAMS_TITLE')}</h1></div><p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">{t('EXAMS_SUBTITLE')}</p></div></div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      <button type="button" disabled={true} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed opacity-60"><Clock size={16} /> {t('EXAMS_HISTORY')}</button>
                      {examQuestions.length > 0 && (<button onClick={handleSaveToHistory} disabled={isSaving || isSaved} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>{isSaved ? <CheckCircle2 size={18} /> : (isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />)}{isSaved ? t('EXAMS_SAVED') : t('EXAMS_SAVE')}</button>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    <div className="lg:col-span-4">
                      <form onSubmit={handleExamGenerate} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-5 lg:sticky lg:top-8">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Target size={20} /></div><h2 className="text-lg font-black text-slate-600 uppercase tracking-tighter italic">{t('EXAMS_CONFIG')}</h2></div>

                        {/* ── Mode toggle ── */}
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                          <button type="button" onClick={() => { setExamMode('manual'); setExamMatFile(null); setExamMatPreview(null); setExamMatCamera(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${examMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={11} /> Manual</button>
                          <button type="button" onClick={() => { setExamMode('material'); setExamMatFile(null); setExamMatPreview(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${examMode === 'material' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Upload size={11} /> {t('FROM_MATERIAL')}</button>
                        </div>

                        {/* ── MANUAL MODE ── */}
                        {examMode === 'manual' && (
                          <div className="space-y-5">
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_PROFESSOR')}</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} /><input type="text" placeholder={t('EXAMS_FULL_NAME')} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.professorName} onChange={(e) => setExamFormData({...examFormData, professorName: e.target.value})} required /></div></div>
                            <div className="space-y-4"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_SUBJECT_DETAILS')}</label><input type="text" placeholder={t('EXAMS_SUBJECT_NAME')} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.subject} onChange={(e) => setExamFormData({...examFormData, subject: e.target.value})} required /><input type="text" placeholder={t('EXAMS_TOPIC')} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.topic} onChange={(e) => setExamFormData({...examFormData, topic: e.target.value})} required /></div>
                            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_LEVEL')}</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.level} onChange={(e) => setExamFormData({...examFormData, level: e.target.value})}><option value="Fillore">{t('EXAMS_LVL_ELEMENTARY')}</option><option value="Mesme">{t('EXAMS_LVL_HIGH')}</option><option value="Fakultet">{t('EXAMS_LVL_UNIV')}</option></select></div><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_DIFFICULTY')}</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.difficulty} onChange={(e) => setExamFormData({...examFormData, difficulty: e.target.value})}><option value="Easy">{t('EXAMS_EASY')}</option><option value="Medium">{t('EXAMS_MEDIUM')}</option><option value="Hard">{t('EXAMS_HARD')}</option></select></div></div>
                            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_NUM_Q')}</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none" value={examFormData.numQuestions} onChange={(e) => setExamFormData({...examFormData, numQuestions: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_TYPE')}</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.type} onChange={(e) => setExamFormData({...examFormData, type: e.target.value})}><option value="multiple-choice">{t('EXAMS_MULTIPLE')}</option><option value="open-ended">{t('EXAMS_WRITTEN')}</option><option value="mixed">{t('EXAMS_MIXED')}</option></select></div></div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_EXTRA')}</label><textarea placeholder={t('EXAMS_EXTRA_PH')} className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-medium text-sm text-slate-600 min-h-[80px] resize-none" value={examFormData.extraInfo} onChange={(e) => setExamFormData({...examFormData, extraInfo: e.target.value})} /></div>
                          </div>
                        )}

                        {/* ── MATERIAL MODE ── */}
                        {examMode === 'material' && (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-2 rounded-xl">{t('EXAM_MATERIAL_HINT')}</p>

                            {/* Camera view */}
                            {examMatCamera && (
                              <div>
                                <video ref={examCameraRef} autoPlay playsInline className="w-full rounded-2xl border-2 border-blue-200" />
                                <canvas ref={examCanvasRef} className="hidden" />
                                <div className="flex gap-2 mt-2">
                                  <button type="button" onClick={captureExamPhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"><Camera size={13} /> {t('BTN_CAPTURE')}</button>
                                  <button type="button" onClick={stopExamCamera} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-black text-xs uppercase transition-all">{t('CANCEL')}</button>
                                </div>
                              </div>
                            )}

                            {/* Upload area */}
                            {!examMatCamera && (
                              <div onClick={() => examFileInputRef.current?.click()} className="group border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-5 text-center cursor-pointer transition-all">
                                {examMatPreview ? <img src={examMatPreview} alt="" className="max-h-44 mx-auto rounded-xl object-contain" />
                                : examMatFile ? <div className="py-3 flex flex-col items-center gap-2"><FileImage size={28} className="text-blue-400" /><p className="text-xs font-bold text-blue-600">{examMatFile.name}</p></div>
                                : <div className="py-4 flex flex-col items-center gap-2"><Upload size={28} className="text-slate-300 group-hover:text-blue-400 transition-colors" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">{t('UPLOAD_PHOTO_OR_PDF')}</p></div>}
                              </div>
                            )}
                            <input ref={examFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleExamMatFileSelect} />

                            {!examMatCamera && !examMatFile && (
                              <button type="button" onClick={openExamCamera} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-500 rounded-xl font-black text-xs uppercase text-slate-400 transition-all"><Camera size={13} /> {t('BTN_OPEN_CAMERA')}</button>
                            )}
                            {examMatFile && !examMatCamera && (
                              <button type="button" onClick={() => { setExamMatFile(null); setExamMatPreview(null); }} className="w-full text-[10px] font-black uppercase text-red-400 hover:text-red-500 py-1">✕ {t('BTN_REMOVE_MATERIAL')}</button>
                            )}

                            {/* Config fields still needed */}
                            <div className="space-y-2 pt-1"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_PROFESSOR')}</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input type="text" placeholder={t('EXAMS_FULL_NAME')} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm text-slate-600 transition-all" value={examFormData.professorName} onChange={(e) => setExamFormData({...examFormData, professorName: e.target.value})} /></div></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_LEVEL')}</label><select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.level} onChange={(e) => setExamFormData({...examFormData, level: e.target.value})}><option value="Fillore">{t('EXAMS_LVL_ELEMENTARY')}</option><option value="Mesme">{t('EXAMS_LVL_HIGH')}</option><option value="Fakultet">{t('EXAMS_LVL_UNIV')}</option></select></div>
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_DIFFICULTY')}</label><select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.difficulty} onChange={(e) => setExamFormData({...examFormData, difficulty: e.target.value})}><option value="Easy">{t('EXAMS_EASY')}</option><option value="Medium">{t('EXAMS_MEDIUM')}</option><option value="Hard">{t('EXAMS_HARD')}</option></select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_NUM_Q')}</label><input type="number" min="1" max="20" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none" value={examFormData.numQuestions} onChange={(e) => setExamFormData({...examFormData, numQuestions: e.target.value})} /></div>
                              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_TYPE')}</label><select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-600 outline-none cursor-pointer" value={examFormData.type} onChange={(e) => setExamFormData({...examFormData, type: e.target.value})}><option value="multiple-choice">{t('EXAMS_MULTIPLE')}</option><option value="open-ended">{t('EXAMS_WRITTEN')}</option><option value="mixed">{t('EXAMS_MIXED')}</option></select></div>
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{t('EXAMS_EXTRA')}</label><textarea placeholder="p.sh. Fokusohu te kapitulli 3..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-sm text-slate-600 min-h-[70px] resize-none" value={examFormData.extraInfo} onChange={(e) => setExamFormData({...examFormData, extraInfo: e.target.value})} /></div>
                          </div>
                        )}

                        <button type="submit" disabled={examLoading || (examMode === 'material' && !examMatFile)} className="w-full bg-slate-700 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-blue-600 transition-all disabled:opacity-40 flex items-center justify-center gap-3 group">{examLoading ? <Loader2 className="animate-spin" size={20} /> : examMode === 'material' ? <Upload size={18} className="text-blue-400 group-hover:scale-110 transition-transform" /> : <Sparkles size={20} className="text-blue-400 group-hover:scale-125 transition-transform" />}{examLoading ? t('EXAMS_GENERATING') : examMode === 'material' ? t('EXAM_FROM_MATERIAL_BTN') : t('EXAMS_GENERATE_BTN')}</button>
                      </form>
                    </div>
                    <div className="lg:col-span-8 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                        <div className="flex items-center gap-3"><div className="w-2 h-8 bg-blue-500/30 rounded-full"></div><h3 className="text-lg md:text-xl font-black text-slate-500 uppercase tracking-tighter italic">{t('EXAMS_PREVIEW')}</h3></div>
                        {examQuestions.length > 0 && (<div className="flex gap-2 w-full sm:w-auto"><button onClick={downloadExamWord} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><FileText size={16} className="text-blue-500/50" /> Word</button><button onClick={downloadExamPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"><FileDown size={16} className="text-red-500/50" /> PDF</button></div>)}
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-[40px] border border-slate-200/60 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden min-h-[420px] max-h-[70vh] lg:max-h-none lg:min-h-[520px]">
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                          {examQuestions.map((q, idx) => (<div key={idx} className="bg-slate-50 dark:bg-slate-700/40 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-slate-600"><div className="flex items-start gap-4 md:gap-5 mb-8"><span className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-600 text-slate-400 dark:text-slate-300 rounded-2xl flex items-center justify-center font-black italic text-base md:text-lg shadow-sm border border-slate-100 dark:border-slate-500">{idx + 1}</span><h4 className="text-base md:text-xl font-bold text-slate-600 dark:text-slate-200 leading-relaxed pt-1 md:pt-2">{q.question}</h4></div>{q.options && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-16">{q.options.map((opt, i) => (<div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-700 rounded-[24px] border border-slate-100 dark:border-slate-600 hover:border-blue-300 transition-all group cursor-default"><span className="w-8 h-8 bg-slate-50 dark:bg-slate-600 group-hover:bg-slate-400 group-hover:text-white rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-500 text-[10px] text-slate-400 dark:text-slate-300 font-black transition-all">{String.fromCharCode(65 + i)}</span><p className="text-xs font-bold text-slate-500 dark:text-slate-300">{opt}</p></div>))}</div>)}<div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-600 flex justify-end"><div className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-600 flex items-center gap-3"><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{t('EXAMS_ANSWER')}</span><span className="font-bold text-xs">{q.answer}</span></div></div></div>))}
                          {!examLoading && examQuestions.length === 0 && (
                            <div className="h-full flex items-center justify-center py-10">
                              <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-[32px] flex items-center justify-center mx-auto"><BrainCircuit size={36} className="text-slate-200 dark:text-slate-500" /></div>
                                <h3 className="text-xl font-black text-slate-300 dark:text-slate-500 uppercase tracking-tighter italic">{t('EXAMS_READY')}</h3>
                                <p className="text-slate-300 dark:text-slate-500 font-bold text-xs">{t('EXAMS_FILL_CONFIG')}</p>
                              </div>
                            </div>
                          )}
                          {examLoading && (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 py-10">
                              <div className="relative w-20 h-20"><div className="absolute inset-0 border-8 border-slate-50 dark:border-slate-700 rounded-full"></div><div className="absolute inset-0 border-8 border-slate-400 rounded-full border-t-transparent animate-spin"></div></div>
                              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">{t('EXAMS_PROCESSING')}</h3>
                            </div>
                          )}
                        </div>
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
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 italic uppercase tracking-tighter"><BookOpen className="text-blue-500" size={20} /> {t('MAT_GENERATE')}</h2>
                    <div className="space-y-5">
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> {t('MAT_SUBJECT')}</label><input type="text" placeholder={t('MAT_SUBJECT_PH')} value={materialInput.subject} maxLength={MAX_SUBJECT_LENGTH} onChange={(e) => { setMaterialInput({...materialInput, subject: e.target.value}); if (materialFieldErrors.subject) setMaterialFieldErrors(p => ({...p, subject: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{materialFieldErrors.subject && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.subject}</p>}</div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> {t('MAT_LEVEL')}</label><input type="text" placeholder={t('MAT_LEVEL_PH')} value={materialInput.level} onChange={(e) => setMaterialInput({...materialInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                      <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> {t('MAT_TOPIC')}</label><input type="text" placeholder={t('MAT_TOPIC_PH')} value={materialInput.topic} maxLength={MAX_TOPIC_LENGTH} onChange={(e) => { setMaterialInput({...materialInput, topic: e.target.value}); if (materialFieldErrors.topic) setMaterialFieldErrors(p => ({...p, topic: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${materialFieldErrors.topic ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{materialFieldErrors.topic && <p className="text-[10px] text-red-500 font-bold italic mt-1">{materialFieldErrors.topic}</p>}</div>
                      <button onClick={handleGenerateMaterials} disabled={loading || isSubmitting.current} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>{loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={18} />}<span>{loading ? t('MAT_GENERATING') : t('MAT_GENERATE_BTN')}</span></button>
                    </div>
                  </section>
                  <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden min-h-[420px] max-h-[65vh] lg:max-h-none lg:min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50"><h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2"><BookOpen size={18} /> {t('MAT_PREVIEW')}</h3>{generatedMaterial && (<div className="flex gap-2"><button onClick={handleDownloadMaterialWord} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Download size={14} /> Word</button><button onClick={handleDownloadMaterialPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100"><FileText size={14} /> PDF</button></div>)}</div>
                    <div className="p-8 flex-1 overflow-y-auto bg-white dark:bg-slate-800"><AnimatePresence mode="wait">{loading ? <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40"><BrainCircuit size={48} className="text-blue-600 animate-bounce" /><p className="font-black uppercase italic text-xs tracking-widest animate-pulse">{t('MAT_AI_WRITING')}</p></div> : generatedMaterial ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose max-w-none"><div className="whitespace-pre-wrap text-slate-700 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-6">{generatedMaterial}</div></motion.div> : <div className="h-full flex items-center justify-center p-6 md:p-10"><div className="w-full bg-white dark:bg-slate-800/50 rounded-[48px] border-4 border-dashed border-slate-100 dark:border-slate-700 p-10 md:p-20 text-center space-y-6"><div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-slate-700 rounded-[32px] flex items-center justify-center mx-auto mb-4"><BookOpen size={40} className="text-slate-200 dark:text-slate-500" /></div><div><h3 className="text-xl md:text-2xl font-black text-slate-300 dark:text-slate-500 uppercase tracking-tighter italic">{t('MAT_READY')}</h3><p className="text-slate-300 dark:text-slate-500 font-bold text-xs md:text-sm mt-2">{t('MAT_GENERATE_BTN')}</p></div></div></div>}</AnimatePresence></div>
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
                    <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 italic uppercase tracking-tighter"><ClipboardList className="text-blue-500" size={20} /> {t('HW_GENERATE')}</h2>

                    {/* ── Mode toggle ── */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
                      <button type="button" onClick={() => { setHwMode('manual'); setHwMatFile(null); setHwMatPreview(null); setHwMatCamera(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${hwMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={11} /> Manual</button>
                      <button type="button" onClick={() => { setHwMode('material'); setHwMatFile(null); setHwMatPreview(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${hwMode === 'material' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Upload size={11} /> {t('FROM_MATERIAL')}</button>
                    </div>

                    <div className="space-y-5">
                      {/* ── MANUAL MODE ── */}
                      {hwMode === 'manual' && (<>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><BookOpen size={14}/> {t('MAT_SUBJECT')}</label><input type="text" placeholder={t('MAT_SUBJECT_PH')} value={homeworkInput.subject} maxLength={MAX_SUBJECT_LENGTH} onChange={(e) => { setHomeworkInput({...homeworkInput, subject: e.target.value}); if (homeworkFieldErrors.subject) setHomeworkFieldErrors(p => ({...p, subject: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{homeworkFieldErrors.subject && <p className="text-[10px] text-red-500 font-bold italic mt-1">{homeworkFieldErrors.subject}</p>}</div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><FileText size={14}/> {t('MAT_TOPIC')}</label><input type="text" placeholder={t('MAT_TOPIC_PH')} value={homeworkInput.topic} maxLength={MAX_TOPIC_LENGTH} onChange={(e) => { setHomeworkInput({...homeworkInput, topic: e.target.value}); if (homeworkFieldErrors.topic) setHomeworkFieldErrors(p => ({...p, topic: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.topic ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />{homeworkFieldErrors.topic && <p className="text-[10px] text-red-500 font-bold italic mt-1">{homeworkFieldErrors.topic}</p>}</div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> {t('MAT_LEVEL')}</label><input type="text" placeholder={t('HW_LEVEL_PH')} value={homeworkInput.level} onChange={(e) => setHomeworkInput({...homeworkInput, level: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><ListOrdered size={14}/> {t('HW_NUMBER')}</label><input type="number" min="1" max="10" value={homeworkInput.numTasks} onChange={(e) => { setHomeworkInput({...homeworkInput, numTasks: parseInt(e.target.value) || 1}); if (homeworkFieldErrors.numTasks) setHomeworkFieldErrors(p => ({...p, numTasks: null})); }} className={`w-full p-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm ${homeworkFieldErrors.numTasks ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} /></div>
                          <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Target size={14}/> {t('HW_TYPE')}</label><select value={homeworkInput.type} onChange={(e) => setHomeworkInput({...homeworkInput, type: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm cursor-pointer"><option value="open">{t('HW_TYPE_OPEN')}</option><option value="practical">{t('HW_TYPE_PRACTICAL')}</option><option value="mixed">{t('HW_TYPE_MIXED')}</option></select></div>
                        </div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Calendar size={14}/> {t('HW_DEADLINE')} <span className="text-slate-300 normal-case font-bold">{t('HW_OPTIONAL')}</span></label><input type="date" value={homeworkInput.deadline} onChange={(e) => setHomeworkInput({...homeworkInput, deadline: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Sparkles size={14}/> {t('HW_INSTRUCTIONS')} <span className="text-slate-300 normal-case font-bold">{t('HW_OPTIONAL_F')}</span></label><textarea placeholder={t('HW_INSTRUCTIONS_PH')} value={homeworkInput.extraInfo} onChange={(e) => setHomeworkInput({...homeworkInput, extraInfo: e.target.value})} rows="3" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm resize-none" /></div>
                        <button onClick={handleGenerateHomework} disabled={loading || isSubmitting.current} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>{loading ? <RefreshCw className="animate-spin" size={20} /> : <ClipboardList size={18} />}<span>{loading ? t('HW_GENERATING') : t('HW_GENERATE_BTN')}</span></button>
                      </>)}

                      {/* ── MATERIAL MODE ── */}
                      {hwMode === 'material' && (<>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-2 rounded-xl">{t('HW_MATERIAL_HINT')}</p>

                        {/* Camera view */}
                        {hwMatCamera && (
                          <div>
                            <video ref={hwCameraRef} autoPlay playsInline className="w-full rounded-2xl border-2 border-blue-200" />
                            <canvas ref={hwCanvasRef} className="hidden" />
                            <div className="flex gap-2 mt-2">
                              <button type="button" onClick={captureHwPhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"><Camera size={13} /> {t('BTN_CAPTURE')}</button>
                              <button type="button" onClick={stopHwCamera} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-black text-xs uppercase transition-all">{t('CANCEL')}</button>
                            </div>
                          </div>
                        )}

                        {/* Upload area */}
                        {!hwMatCamera && (
                          <div onClick={() => hwFileInputRef.current?.click()} className="group border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-5 text-center cursor-pointer transition-all">
                            {hwMatPreview ? <img src={hwMatPreview} alt="" className="max-h-44 mx-auto rounded-xl object-contain" />
                            : hwMatFile ? <div className="py-3 flex flex-col items-center gap-2"><FileImage size={28} className="text-blue-400" /><p className="text-xs font-bold text-blue-600">{hwMatFile.name}</p></div>
                            : <div className="py-4 flex flex-col items-center gap-2"><Upload size={28} className="text-slate-300 group-hover:text-blue-400 transition-colors" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">{t('UPLOAD_PHOTO_OR_PDF')}</p></div>}
                          </div>
                        )}
                        <input ref={hwFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleHwMatFileSelect} />

                        {!hwMatCamera && !hwMatFile && (
                          <button type="button" onClick={openHwCamera} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-500 rounded-xl font-black text-xs uppercase text-slate-400 transition-all"><Camera size={13} /> {t('BTN_OPEN_CAMERA')}</button>
                        )}
                        {hwMatFile && !hwMatCamera && (
                          <button type="button" onClick={() => { setHwMatFile(null); setHwMatPreview(null); }} className="w-full text-[10px] font-black uppercase text-red-400 hover:text-red-500 py-1">✕ {t('BTN_REMOVE_MATERIAL')}</button>
                        )}

                        {/* Config */}
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Layers size={14}/> {t('MAT_LEVEL')}</label><input type="text" placeholder={t('HW_LEVEL_PH')} value={homeworkInput.level} onChange={(e) => setHomeworkInput({...homeworkInput, level: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><ListOrdered size={14}/> {t('HW_NUMBER')}</label><input type="number" min="1" max="10" value={homeworkInput.numTasks} onChange={(e) => setHomeworkInput({...homeworkInput, numTasks: parseInt(e.target.value) || 1})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                          <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Target size={14}/> {t('HW_TYPE')}</label><select value={homeworkInput.type} onChange={(e) => setHomeworkInput({...homeworkInput, type: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm cursor-pointer"><option value="open">{t('HW_TYPE_OPEN')}</option><option value="practical">{t('HW_TYPE_PRACTICAL')}</option><option value="mixed">{t('HW_TYPE_MIXED')}</option></select></div>
                        </div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Calendar size={14}/> {t('HW_DEADLINE')} <span className="text-slate-300 normal-case font-bold">{t('HW_OPTIONAL')}</span></label><input type="date" value={homeworkInput.deadline} onChange={(e) => setHomeworkInput({...homeworkInput, deadline: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm" /></div>
                        <div><label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 italic"><Sparkles size={14}/> {t('HW_INSTRUCTIONS')} <span className="text-slate-300 normal-case font-bold">{t('HW_OPTIONAL_F')}</span></label><textarea placeholder="p.sh. Fokusohu te tema e dytë..." value={homeworkInput.extraInfo} onChange={(e) => setHomeworkInput({...homeworkInput, extraInfo: e.target.value})} rows="2" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm resize-none" /></div>

                        <button onClick={handleHwFromMaterial} disabled={loading || isSubmitting.current || !hwMatFile} className={`w-full font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${loading || isSubmitting.current || !hwMatFile ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'}`}>{loading ? <RefreshCw className="animate-spin" size={20} /> : <Upload size={18} />}<span>{loading ? t('HW_GENERATING') : t('HW_FROM_MATERIAL_BTN')}</span></button>
                      </>)}
                    </div>
                  </section>
                  <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden min-h-[420px] max-h-[65vh] lg:max-h-none lg:min-h-[600px]">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50"><h3 className="font-black uppercase italic text-sm tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2"><ClipboardList size={18} /> {t('HW_PREVIEW')}</h3>{generatedHomework && (<div className="flex gap-2"><button onClick={handleDownloadHomeworkWord} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Download size={14} /> Word</button><button onClick={handleDownloadHomeworkPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100"><FileText size={14} /> PDF</button></div>)}</div>
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                      <AnimatePresence mode="wait">
                        {loading && (<motion.div key="hw-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center space-y-6 opacity-50"><div className="relative"><motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><ClipboardList className="text-blue-400" size={22} /></div></div><p className="font-black uppercase italic text-xs tracking-widest animate-pulse text-slate-400">{t('HW_AI_CREATING')}</p></motion.div>)}
                        {!loading && generatedHomework && (
                          <motion.div key="hw-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-3 items-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{homeworkInput.subject}</span><span className="text-slate-300">|</span><span className="text-[10px] font-black text-slate-400 italic">{homeworkInput.topic}</span>{homeworkInput.deadline && (<><span className="text-slate-300">|</span><span className="text-[10px] font-black text-orange-500 flex items-center gap-1"><Calendar size={12} /> {t('HW_DEADLINE_LABEL')} {new Date(homeworkInput.deadline).toLocaleDateString(i18n.language === 'sq' ? 'sq-AL' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span></>)}</div>
                            {generatedHomework.map((task, idx) => {
                              const tConf = hwTypeConfig[task.type] || hwTypeConfig.open;
                              return (
                                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                  <div className="p-5 border-b border-slate-50 flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</span><h4 className="font-black text-slate-700 text-sm md:text-base italic tracking-tight">{task.title}</h4></div><span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${tConf.bg} ${tConf.text}`}><span className={`w-1.5 h-1.5 rounded-full ${tConf.dot}`}></span>{tConf.label}</span></div>
                                  <div className="p-5 space-y-4"><p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>{task.requirements?.length > 0 && (<div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500"/> {t('HW_REQUIREMENTS')}</p><ul className="space-y-2">{task.requirements.map((req, i) => (<li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>{req}</li>))}</ul></div>)}{task.rubric?.length > 0 && (<div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50"><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Target size={12}/> {t('HW_CRITERIA')}</p><div className="space-y-2">{task.rubric.map((r, i) => (<div key={i} className="flex items-center justify-between"><span className="text-xs text-slate-600 font-medium">{r.criteria}</span><span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">{r.points} {t('HW_POINTS')}</span></div>))}<div className="flex items-center justify-between pt-2 border-t border-blue-100 mt-2"><span className="text-[10px] font-black text-slate-500 uppercase">{t('HW_TOTAL')}</span><span className="text-[10px] font-black text-blue-700 bg-blue-200 px-2 py-0.5 rounded-lg">{task.rubric.reduce((s, r) => s + (r.points || 0), 0)} {t('HW_POINTS')}</span></div></div></div>)}</div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                        {!loading && !generatedHomework && (<motion.div key="hw-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center p-6 md:p-10"><div className="w-full bg-white dark:bg-slate-800/50 rounded-[48px] border-4 border-dashed border-slate-100 dark:border-slate-700 p-10 md:p-20 text-center space-y-6"><div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-slate-700 rounded-[32px] flex items-center justify-center mx-auto mb-4"><ClipboardList size={40} className="text-slate-200 dark:text-slate-500" /></div><div><h3 className="text-xl md:text-2xl font-black text-slate-300 dark:text-slate-500 uppercase tracking-tighter italic">{t('HW_FILL_FORM')}</h3><p className="text-slate-300 dark:text-slate-500 font-bold text-xs md:text-sm mt-2">{t('HW_GENERATE_BTN')}</p></div></div></motion.div>)}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><BookMarked className="text-blue-600" size={24} /> {t('GB_TITLE')}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('GB_SUBTITLE')}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    {gradebook.length > 0 && (
                      <button onClick={handleGbExportPDF} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100">
                        <FileDown size={14} /> PDF
                      </button>
                    )}
                    
                    <button onClick={() => { 
                        setGbShowForm(true); 
                        setGbEditingId(null); 
                        setGbAddMode('new');  
                        setGbSelectedExistingStudent(null); 
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
                    }} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200 active:scale-95">
                      <Plus size={16} /> {t('GB_ADD_STUDENT')}
                    </button>
                  </div>
                </div>

                {/* VIEW PËR NOTAT (Default) */}
                {gradebookSubTab === 'grades' && (
                  <>
                    {gradebookError && (<div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-sm italic flex items-center gap-2"><AlertTriangle size={16} className="shrink-0" /><span>{gradebookError}</span><button onClick={() => setGradebookError(null)} className="ml-auto"><X size={14}/></button></div>)}

<AnimatePresence>
  {gbShowForm && (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-3xl border border-blue-100 shadow-lg p-6 md:p-8">
      <h3 className="text-sm font-black text-slate-700 uppercase italic tracking-tighter mb-6 flex items-center gap-2">
        {gbEditingId ? <Pencil size={16} className="text-blue-500" /> : <Plus size={16} className="text-blue-500" />}
        {gbEditingId ? t('GB_EDITING') : (gbAddMode === 'new' ? t('GB_ADD_NEW') : t('GB_ADD_SUBJECT_EXISTING'))}
      </h3>
      
      {!gbEditingId && ( 
        <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 italic">{t('GB_ADD_MODE')}</label>
            <div className="flex gap-2">
                <button 
                    type="button" 
                    onClick={() => {
                        setGbAddMode('new');
                        setGbSelectedExistingStudent(null); 
                        setGbForm(prev => ({ 
                            ...prev, 
                            student_name: '', class_group: '', student_id_number: '', email_contact: '', notes: '' 
                        }));
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${gbAddMode === 'new' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    {t('GB_NEW_STUDENT')}
                </button>
                <button 
                    type="button" 
                    onClick={() => {
                        setGbAddMode('existing');
                        setGbForm(prev => ({ 
                            ...prev, 
                            student_name: '', class_group: '', student_id_number: '', email_contact: '', notes: '' 
                        }));
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
                    {t('GB_EXISTING_STUDENT')}
                </button>
            </div>
        </div>
      )}

      {gbAddMode === 'existing' && !gbEditingId && (
        <div className="mb-6">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-2 block italic"><User size={14}/> {t('GB_SELECT_EXISTING')} *</label>
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
              <option value="">{t('GB_SELECT_PH')}</option>
              {gbUniqueStudents.map(s => (
                <option 
                  key={s.student_id_number || `${s.student_name}-${s.class_group}`} 
                  value={s.student_id_number || `${s.student_name}-${s.class_group}`}
                >
                  {s.student_name} ({s.class_group || t('GB_NO_CLASS')}) {s.student_id_number ? `[ID: ${s.student_id_number}]` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
      )}

      <h4 className="text-xs font-bold text-slate-600 mb-4 flex items-center gap-2"><User size={14} className="text-blue-500"/> {t('GB_STUDENT_DETAILS')}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><User size={14}/> {t('GB_STUDENT_FIELD')} *</label>
          <input type="text" placeholder={t('GB_NAME_PH')} value={gbForm.student_name} onChange={(e) => { setGbForm({...gbForm, student_name: e.target.value}); if (gbFormErrors.student_name) setGbFormErrors(p => ({...p, student_name: null})); }} 
            className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.student_name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} 
            readOnly={gbAddMode === 'existing' && !gbEditingId} 
          />
          {gbFormErrors.student_name && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.student_name}</p>}
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Users size={14}/> {t('GB_CLASS_GROUP')} *</label>
          <input type="text" placeholder={t('GB_CLASS_PH')} value={gbForm.class_group} onChange={(e) => { setGbForm({...gbForm, class_group: e.target.value}); if (gbFormErrors.class_group) setGbFormErrors(p => ({...p, class_group: null})); }} 
            className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.class_group ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} 
            readOnly={gbAddMode === 'existing' && !gbEditingId} 
          />
          {gbFormErrors.class_group && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.class_group}</p>}
        </div>
        
        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Hash size={14}/> {t('GB_STUDENT_ID')}</label>
          <input type="text" placeholder={t('GB_STUDENT_ID_PH')} value={gbForm.student_id_number} onChange={(e) => setGbForm({...gbForm, student_id_number: e.target.value})} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all" 
            readOnly={gbAddMode === 'existing' && !gbEditingId} 
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Mail size={14}/> {t('GB_EMAIL')}</label>
          <input type="email" placeholder={t('GB_EMAIL_PH')} value={gbForm.email_contact} onChange={(e) => setGbForm({...gbForm, email_contact: e.target.value})} 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all" 
            readOnly={gbAddMode === 'existing' && !gbEditingId} 
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic"><Book size={14}/> {t('GB_SUBJECT')} *</label>
          <input type="text" placeholder={t('GB_SUBJECT_PH')} value={gbForm.subject} onChange={(e) => { setGbForm({...gbForm, subject: e.target.value}); if (gbFormErrors.subject) setGbFormErrors(p => ({...p, subject: null})); }} className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all ${gbFormErrors.subject ? 'border-red-400 bg-red-50' : 'border-slate-200'}`} />
          {gbFormErrors.subject && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.subject}</p>}
        </div>
      </div>

      <h4 className="text-xs font-bold text-slate-600 mb-4 mt-8 flex items-center gap-2">
        <Activity size={14} className="text-emerald-500"/> {t('GB_PERIOD_GRADES')}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">{t('GB_GRADE_SYSTEM')}</label>
          <select 
            value={gbForm.scale} 
            onChange={(e) => setGbForm({...gbForm, scale: e.target.value})}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1-5">{t('GB_SYS_1_5')}</option>
            <option value="5-10">{t('GB_SYS_5_10')}</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">{t('GB_PERIOD_1')}</label>
          <input 
            type="number" 
            step="0.1"
            placeholder={t('GB_GRADE_PH_1')}
            value={gbForm.period_1} 
            onChange={(e) => setGbForm({...gbForm, period_1: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_1 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_1 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_1}</p>}
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">{t('GB_PERIOD_2')}</label>
          <input 
            type="number" 
            step="0.1"
            placeholder={t('GB_GRADE_PH_2')}
            value={gbForm.period_2} 
            onChange={(e) => setGbForm({...gbForm, period_2: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_2 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_2 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_2}</p>}
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block italic">{t('GB_PERIOD_3')}</label>
          <input 
            type="number" 
            step="0.1"
            placeholder={t('GB_GRADE_PH_3')}
            value={gbForm.period_3} 
            onChange={(e) => setGbForm({...gbForm, period_3: e.target.value})}
            className={`w-full p-3 bg-white border rounded-xl font-bold text-sm outline-none transition-all ${gbFormErrors.period_3 ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'}`}
          />
          {gbFormErrors.period_3 && <p className="text-[9px] text-red-500 font-bold mt-1">{gbFormErrors.period_3}</p>}
        </div>
      </div>


      <h4 className="text-xs font-bold text-slate-600 mb-4 flex items-center gap-2"><BookMarked size={14} className="text-purple-500"/> {t('GB_NOTES_COMMENTS')}</h4>
                          <div className="mb-6">
                            <div>
                              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block italic">{t('GB_NOTES_OPT')}</label>
                              <textarea rows="3" placeholder={t('GB_NOTES_PH')} value={gbForm.notes} onChange={(e) => setGbForm({...gbForm, notes: e.target.value})} 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all resize-y" 
                                readOnly={gbAddMode === 'existing' && !gbEditingId} 
                              />
                            </div>
                          </div>

                          {gbFormErrors.general && <p className="text-[10px] text-red-500 font-bold italic mt-3">{gbFormErrors.general}</p>}
                          <div className="flex gap-3 mt-6">
                            <button onClick={handleGbCancel} className="px-6 py-3 rounded-2xl font-bold uppercase text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">{t('CANCEL')}</button>
                            <button onClick={handleGbSave} disabled={gbSaving} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all disabled:opacity-50 active:scale-95">
                              {gbSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              {gbSaving ? t('SAVING') : (gbEditingId ? t('GB_SAVE_CHANGES') : t('GB_ADD_STUDENT'))}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="relative col-span-full"> 
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" placeholder={t('GB_SEARCH_PH')} value={gbSearchQuery} onChange={(e) => setGbSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 transition-all" />
                      </div>
                      
                      {gbSubjects.length > 0 && (
                        <div className="relative">
                          <select value={gbFilterSubject} onChange={(e) => setGbFilterSubject(e.target.value)} className="appearance-none w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 cursor-pointer transition-all">
                            <option value="all">{t('GB_ALL_SUBJECTS')}</option>
                            {gbSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                      )}

                      {gbClasses.length > 0 && (
                        <div className="relative">
                          <select value={gbFilterClass} onChange={(e) => setGbFilterClass(e.target.value)} className="appearance-none w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-600 cursor-pointer transition-all">
                            <option value="all">{t('GB_ALL_CLASSES')}</option>
                            {gbClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                      )}
                    </div>

                    {gradebookLoading && (
                      <div className="py-20 text-center"><Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" /><p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest animate-pulse">{t('GB_LOADING')}</p></div>
                    )}

                    {!gradebookLoading && gradebook.length === 0 && (
                      <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <BookMarked size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-black uppercase italic text-xs tracking-widest text-slate-300">{t('GB_NO_STUDENTS')}</p>
                        <p className="text-[10px] text-slate-300 font-bold mt-2">{t('GB_CLICK_ADD')}</p>
                      </div>
                    )}

                    {!gradebookLoading && Object.entries(gbGrouped).map(([subject, students]) => (
                      <motion.div key={subject} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                            <h3 className="font-black text-slate-700 uppercase tracking-tighter italic text-sm md:text-base">{subject}</h3>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg uppercase">{students.length} {t('GB_STUDENTS_LBL')}</span>
                          </div>
                          {(() => {
                            const avgs = students.filter(s => s.average !== null).map(s => s.average);
                            if (avgs.length === 0) return null;
                            const classAvg = (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1);
                            return <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{t('GB_CLASS_AVG')} <span className="text-blue-600">{classAvg}</span></span>;
                          })()}
                        </div>

                        <div className="w-full">
                          
                          {/* ── VERSIONI DESKTOP ── */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-50">
                                  <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[150px]">{t('GB_COL_STUDENT')}</th>
                                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('GB_PERIOD_1')}</th>
                                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('GB_PERIOD_2')}</th>
                                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('GB_PERIOD_3')}</th>
                                  <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('GB_COL_AVG')}</th>
                                  <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[100px]">{t('GB_COL_ACTIONS')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((student, idx) => (
                                  <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-blue-500">{student.student_name.charAt(0).toUpperCase()}</span></div>
                                        <div>
                                          <span className="font-bold text-sm text-slate-700">{student.student_name}</span>
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
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* ── VERSIONI MOBILE ── */}
                          <div className="block md:hidden">
                            {students.map((student, idx) => (
                              <motion.div key={`mobile-${student.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className="border-b border-slate-100 p-5 last:border-0 bg-white">
                                
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="text-xs font-black text-blue-500">{student.student_name.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div>
                                    <span className="font-black text-[15px] text-slate-800 block leading-tight">{student.student_name}</span>
                                    {(student.class_group || student.student_id_number) && (
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                                        {student.class_group} {student.student_id_number && `(${student.student_id_number})`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                                  <div className="text-center flex flex-col items-center justify-center">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">{t('GB_PERIOD_1')}</span>
                                    <GradeBadge value={student.period_1} scale={student.scale} />
                                  </div>
                                  <div className="text-center flex flex-col items-center justify-center">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">{t('GB_PERIOD_2')}</span>
                                    <GradeBadge value={student.period_2} scale={student.scale} />
                                  </div>
                                  <div className="text-center flex flex-col items-center justify-center">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">{t('GB_PERIOD_3')}</span>
                                    <GradeBadge value={student.period_3} scale={student.scale} />
                                  </div>
                                  <div className="text-center flex flex-col items-center justify-center border-l border-slate-200">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">{t('GB_COL_AVG')}</span>
                                    {student.average !== null ? (
                                      <span className="inline-flex items-center justify-center w-full h-8 rounded-xl text-xs font-black bg-slate-900 text-white shadow-md">{student.average}</span>
                                    ) : <span className="inline-flex items-center justify-center h-8 text-[10px] font-black text-slate-300 italic">—</span>}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <button
                                    onClick={() => {
                                      setActiveTab('gradebook');
                                      setGradebookSubTab('absences');
                                      setAbsencesFilter(student.student_name);
                                    }}
                                    className="flex-1 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                  >
                                    <Calendar size={14} /> {t('GB_ABSENCES')}
                                  </button>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleGbEdit(student)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-95 transition-all"><Pencil size={14} /></button>
                                    <button onClick={() => handleGbDelete(student.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl active:scale-95 transition-all"><Trash2 size={14} /></button>
                                  </div>
                                </div>

                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {!gradebookLoading && gradebook.length > 0 && Object.keys(gbGrouped).length === 0 && (
                      <div className="py-16 text-center bg-white rounded-3xl border border-slate-100">
                        <Search size={32} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-black uppercase italic text-xs tracking-widest text-slate-300">{t('GB_NO_RESULTS')}</p>
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
                        <h3 className="font-black text-slate-700 uppercase tracking-tighter italic text-sm md:text-base">{t('GB_ABSENCES_FOR', {name: absencesFilter})}</h3>
                      </div>
                      <div className="flex items-center gap-3 relative">
                        <div className="relative" ref={absenceDropdownRef}>
                          <button 
                            onClick={() => setShowAbsenceDropdown(!showAbsenceDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-red-200 active:scale-95"
                          >
                            <Plus size={14} /> {t('GB_ABSENT_BTN')} <ChevronDown size={14} />
                          </button>
                          
                          <AnimatePresence>
                            {showAbsenceDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: 10 }} 
                                className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                              >
                                <button onClick={() => handleRecordAbsence(t('GB_WITH_REASON'))} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-50 transition-colors">{t('GB_WITH_REASON')}</button>
                                <button onClick={() => handleRecordAbsence(t('GB_NO_REASON'))} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">{t('GB_NO_REASON')}</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button 
                          onClick={() => setGradebookSubTab('grades')} 
                          className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <ChevronRight size={14} className="rotate-180" /> {t('GB_RETURN')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8 flex-1 bg-white rounded-b-3xl">
                      {absencesLoading && absences.length === 0 ? (
                        <div className="text-center py-10">
                          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest animate-pulse">{t('GB_LOADING_ABSENCES')}</p>
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
                                  <p className="text-sm font-bold text-slate-500">{t('GB_NO_ABSENCES', {name: <span className="text-blue-600">{absencesFilter}</span>})}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{t('GB_CLICK_ABSENT')}</p>
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
                                    <span className="block font-black text-sm text-slate-700">{new Date(ab.date).toLocaleDateString(i18n.language === 'sq' ? 'sq-AL' : 'en-US')}</span>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('GB_ABSENCE')}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${ab.reason === t('GB_WITH_REASON') ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
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

            {/* ── TIMER & STOPWATCH ───────────────────────────────────────────────── */}
            {activeTab === 'timer_soon' && (
              <motion.div key="timer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex items-center justify-center p-2 md:p-6 h-full">
                <div className="bg-white p-6 md:p-14 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl w-full max-w-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-500"></div>
                  
                  <div className="text-center mb-6 md:mb-10">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 text-blue-600 shadow-inner">
                      <Timer size={28} />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{t('TIMER_TITLE')}</h2>
                  </div>

                  <div className="flex bg-slate-50 p-1 md:p-1.5 rounded-xl md:rounded-2xl mb-6 md:mb-10">
                    <button 
                      onClick={() => { setTimerMode('timer'); setIsTimerActive(false); }}
                      className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all ${timerMode === 'timer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t('TIMER_COUNTDOWN')}
                    </button>
                    <button 
                      onClick={() => { setTimerMode('stopwatch'); setIsTimerActive(false); }}
                      className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all ${timerMode === 'stopwatch' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {t('TIMER_STOPWATCH')}
                    </button>
                  </div>

                  <div className="text-center mb-6 md:mb-10">
                    <div className={`text-6xl md:text-9xl font-black tracking-tighter ${time <= 60 && timerMode === 'timer' && time > 0 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
                      {formatTime(time)}
                    </div>
                  </div>

                  {timerMode === 'timer' && (
                    <div className="flex justify-center mb-6 md:mb-10">
                      <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-slate-100">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{t('TIMER_MINUTES')}</span>
                        <input 
                          type="number" 
                          min="1"
                          value={inputMinutes === '' ? '' : inputMinutes}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            setInputMinutes(val);
                            if (!isTimerActive) setTime((val || 0) * 60);
                          }}
                          disabled={isTimerActive}
                          className="w-12 md:w-20 bg-transparent text-center font-black text-lg md:text-xl text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
                    <button 
                      onClick={toggleTimer}
                      className={`flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${isTimerActive ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'}`}
                    >
                      {isTimerActive ? <Pause size={18} /> : <Play size={18} />}
                      {isTimerActive ? t('TIMER_PAUSE') : t('TIMER_START')}
                    </button>

                    <button 
                      onClick={resetTimer}
                      className="flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 border border-slate-100"
                    >
                      <RotateCcw size={18} /> {t('TIMER_RESET')}
                    </button>
                  </div>
                  
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* ── MODALI I ZILES ── */}
      <AnimatePresence>
        {isTimeUp && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center gap-8 w-[240px] h-[240px] relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-40 animate-pulse"></div>
                
                <motion.div 
                  animate={{ 
                    rotate: [-15, 15, -15, 15, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="relative z-10 w-24 h-24 bg-slate-900 rounded-[35px] flex items-center justify-center text-red-500 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                >
                  <Bell size={45} strokeWidth={2.5} />
                </motion.div>
              </div>

              <div className="text-center z-10">
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {t('TIMER_UP')}
                </h2>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.3em] mt-1 drop-shadow-sm">
                  {t('TIMER_ALARM')}
                </p>
              </div>

              <button 
                onClick={dismissTimeUp}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-[0_15px_30px_rgba(239,68,68,0.4)] transition-all active:scale-95 active:shadow-none"
              >
                {t('TIMER_STOP')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {renderedProfileModal}
      {renderedFeedbackModal}
    </div>
  );
}