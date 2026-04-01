'use client';
import { useState } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Reset Your Password</h1>
      <input type="password" placeholder="New Password" className="border p-2 m-2" />
      <button className="bg-blue-500 text-white p-2 rounded">Update Password</button>
    </div>
  );
}