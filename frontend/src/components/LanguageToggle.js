"use client";
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'sq';
  const isAlbanian = currentLang.includes('sq');

  const toggleLanguage = () => {
    i18n.changeLanguage(isAlbanian ? 'en' : 'sq');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label="Toggle language"
      className={`flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100 shadow-sm active:scale-95 ${className}`}
    >
      <Languages size={12} />
      {isAlbanian ? 'EN' : 'AL'}
    </button>
  );
}