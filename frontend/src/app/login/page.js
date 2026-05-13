"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, User, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../../components/LanguageToggle';

function LoginContent() {
  const { t } = useTranslation();
  const [view, setView] = useState('login'); // login | register | forgot_password | update_password
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('type') === 'recovery' || (typeof window !== 'undefined' && window.location.hash.includes('access_token'))) {
      setView('update_password');
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView('update_password');
    });
    return () => subscription.unsubscribe();
  }, [searchParams]);

  const switchView = (newView) => {
    setError(null);
    setMessage(null);
    setView(newView);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      if (view === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push('/dashboard');
      } else if (view === 'register') {
        const { error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (authError) throw authError;
        setMessage(t('ACCOUNT_CREATED'));
        setView('login');
      } else if (view === 'forgot_password') {
        if (!email) {
          setError(t('ENTER_EMAIL_ERROR'));
          setLoading(false);
          return;
        }
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`
        });
        if (authError) throw authError;
        setMessage(t('RESET_LINK_SENT'));
      } else if (view === 'update_password') {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage(t('PASSWORD_CHANGED'));
        setPassword('');
        setTimeout(() => setView('login'), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (view === 'login') return t('WELCOME_BACK');
    if (view === 'register') return t('REGISTER_TITLE');
    if (view === 'forgot_password') return t('FORGOT_PASSWORD_TITLE');
    if (view === 'update_password') return t('NEW_PASSWORD');
    return '';
  };

  const getButtonText = () => {
    if (view === 'login') return t('LOGIN_BTN');
    if (view === 'register') return t('REGISTER');
    if (view === 'forgot_password') return t('SEND_RESET_LINK');
    if (view === 'update_password') return t('UPDATE_PASSWORD_BTN');
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[95%] sm:w-full max-w-md bg-white rounded-[32px] shadow-2xl p-6 md:p-10 border border-slate-200 relative"
      >
        <div className="absolute top-6 right-6">
          <LanguageToggle />
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl text-white mb-4 shadow-xl shadow-blue-200">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center italic uppercase">
            {getTitle()}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{t('SUBTITLE')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle size={16}/>{error}</motion.div>}
            {message && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold border border-green-100 flex items-center gap-2"><CheckCircle size={16}/>{message}</motion.div>}
          </AnimatePresence>

          {view === 'register' && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input type="text" placeholder={t('FULL_NAME')} required value={fullName} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-slate-900 font-bold text-sm transition-all shadow-sm" onChange={(e) => setFullName(e.target.value)} />
            </div>
          )}

          {view !== 'update_password' && (
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input type="email" placeholder={t('EMAIL_ADDRESS')} required value={email} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-slate-900 font-bold text-sm transition-all shadow-sm" onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}

          {view !== 'forgot_password' && (
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input type={showPassword ? "text" : "password"} placeholder={t('PASSWORD')} required value={password} className="w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-slate-900 font-bold text-sm transition-all shadow-sm" onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {view === 'login' && (
            <div className="flex justify-end px-1">
              <button
                type="button"
                onClick={() => switchView('forgot_password')}
                className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-tighter transition-colors"
              >
                {t('FORGOT_PASSWORD')}
              </button>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4 md:py-5 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-[0.98] transition-all text-xs md:text-sm uppercase tracking-widest mt-4"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : getButtonText()}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          {(view === 'login' || view === 'register') && (
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              {view === 'login' ? t('NO_ACCOUNT_Q') : t('HAVE_ACCOUNT_Q')}
              <button
                onClick={() => switchView(view === 'login' ? 'register' : 'login')}
                className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                {view === 'login' ? t('NO_ACCOUNT_ACTION') : t('HAVE_ACCOUNT_ACTION')}
              </button>
            </div>
          )}

          {(view === 'forgot_password' || view === 'update_password') && (
            <button
              type="button"
              onClick={() => switchView('login')}
              className="inline-flex items-center gap-2 text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors"
            >
              <ArrowLeft size={14} />
              {t('BACK_TO_LOGIN')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}