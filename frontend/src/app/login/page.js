"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, User, Eye, EyeOff, CheckCircle } from 'lucide-react';

function LoginContent() {
  const [view, setView] = useState('login'); 
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
    if (searchParams.get('type') === 'recovery' || window.location.hash.includes('access_token')) {
      setView('update_password');
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView('update_password');
    });
    return () => subscription.unsubscribe();
  }, [searchParams]);

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
        setMessage("Llogaria u krijua! Mund të hyni tani."); setView('login');
      } else if (view === 'update_password') {
        const { error: authError } = await supabase.auth.updateUser({ password: password });
        if (authError) throw authError;
        setMessage("Fjalëkalimi u ndryshua! Po ju dërgojmë te dashboard...");
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Shkruani email-in tuaj."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login?type=recovery` });
    setLoading(false);
    if (error) setError(error.message); else setMessage("Linku u dërgua në email!");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-10 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3.5 rounded-2xl text-white mb-4 shadow-xl shadow-blue-100"><GraduationCap size={32} /></div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{view === 'login' ? "Mirësevini" : view === 'register' ? "Regjistrohuni" : "Fjalëkalimi i ri"}</h2>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2"><AlertCircle size={16}/>{error}</motion.div>}
            {message && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold border border-green-100 flex items-center gap-2"><CheckCircle size={16}/>{message}</motion.div>}
          </AnimatePresence>
          {view === 'register' && (
            <div className="relative"><User className="absolute left-4 top-4 text-slate-400" size={18} /><input type="text" placeholder="Emri i plotë" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" onChange={(e) => setFullName(e.target.value)} /></div>
          )}
          {view !== 'update_password' && (
            <div className="relative"><Mail className="absolute left-4 top-4 text-slate-400" size={18} /><input type="email" placeholder="Email adresa" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" onChange={(e) => setEmail(e.target.value)} /></div>
          )}
          <div className="relative"><Lock className="absolute left-4 top-4 text-slate-400" size={18} /><input type={showPassword ? "text" : "password"} placeholder="Fjalëkalimi" required className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" onChange={(e) => setPassword(e.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-blue-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {view === 'login' && (<div className="flex justify-end"><button type="button" onClick={handleForgotPassword} className="text-[11px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">Harrova fjalëkalimin</button></div>)}
          <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95 text-[13px] uppercase tracking-widest">{loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (view === 'login' ? "Hyr" : view === 'register' ? "Regjistrohu" : "Ruaj")}</button>
        </form>
        {view !== 'update_password' && (
          <div className="mt-8 text-center border-t border-slate-50 pt-6"><button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-[12px] font-bold text-slate-400 hover:text-blue-600">{view === 'login' ? "Krijo llogari" : "Hyr këtu"}</button></div>
        )}
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