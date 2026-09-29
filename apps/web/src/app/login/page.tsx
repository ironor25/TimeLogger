'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Timer, ArrowRight, Shield, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@demo.local');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3">
            <Timer className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PulseTime SaaS</h1>
          <p className="text-xs text-slate-500 mt-1">Workforce Time Tracking & Productivity Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Sign in to your organization</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your work credentials to access the portal</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-2.5">
              1-Click Demo Accounts (Password: Password123!)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('owner@demo.local')}
                className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-colors text-[11px]"
              >
                <div className="font-medium text-slate-800">Alex Mercer</div>
                <div className="text-[10px] text-blue-600 font-semibold">Owner / CTO</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('admin@demo.local')}
                className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-colors text-[11px]"
              >
                <div className="font-medium text-slate-800">Sarah Connor</div>
                <div className="text-[10px] text-purple-600 font-semibold">Admin / Ops</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('manager@demo.local')}
                className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-colors text-[11px]"
              >
                <div className="font-medium text-slate-800">David Miller</div>
                <div className="text-[10px] text-emerald-600 font-semibold">Manager / Lead</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('employee@demo.local')}
                className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-colors text-[11px]"
              >
                <div className="font-medium text-slate-800">John Doe</div>
                <div className="text-[10px] text-slate-500 font-semibold">Employee / Dev</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-[11px] mt-6">
          PulseTime SaaS • Authoritative Server Architecture • Strict Multi-Tenancy
        </p>
      </div>
    </div>
  );
}
