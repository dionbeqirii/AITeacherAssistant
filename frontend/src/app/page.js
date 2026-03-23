"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl"></div>
        <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Duke u ngarkuar...</p>
      </div>
    </div>
  );
}