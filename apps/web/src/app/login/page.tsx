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
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-[#0f62fe] text-white rounded-none mb-3">
            <Timer className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-light text-[#161616] tracking-tight">TimeLogger</h1>
          <p className="text-xs text-[#525252] mt-1 tracking-carbon">Enterprise Workforce Time Tracking & Productivity Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-none border border-[#e0e0e0] p-6 sm:p-8">
          <h2 className="text-sm font-medium text-[#161616] mb-1">Sign in to your organization</h2>
          <p className="text-xs text-[#525252] mb-6 tracking-carbon">Enter your work credentials to access the portal</p>

          {error && (
            <div className="mb-5 p-3 rounded-none bg-[#ffebee] border border-[#ffb3ba] text-[#da1e28] text-xs flex items-center gap-2 tracking-carbon">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-[#525252] mb-1 tracking-carbon">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] text-[#161616] transition-colors tracking-carbon"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-normal text-[#525252] tracking-carbon">Password</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none text-xs focus:outline-none focus:border-[#0f62fe] text-[#161616] transition-colors tracking-carbon"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white rounded-none text-xs font-normal transition-colors flex items-center justify-center gap-2 disabled:opacity-50 tracking-carbon"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-[#e0e0e0]">
            <span className="text-[11px] font-normal text-[#525252] uppercase tracking-wider block mb-2.5">
              1-Click Demo Accounts (Password: Password123!)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('owner@demo.local')}
                className="text-left p-2.5 rounded-none border border-[#e0e0e0] hover:border-[#0f62fe] hover:bg-[#edf5ff] transition-colors text-[11px]"
              >
                <div className="font-medium text-[#161616]">Alex Mercer</div>
                <div className="text-[10px] text-[#0f62fe] font-normal tracking-carbon">Owner / CTO</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('admin@demo.local')}
                className="text-left p-2.5 rounded-none border border-[#e0e0e0] hover:border-[#0f62fe] hover:bg-[#edf5ff] transition-colors text-[11px]"
              >
                <div className="font-medium text-[#161616]">Sarah Connor</div>
                <div className="text-[10px] text-[#6929c4] font-normal tracking-carbon">Admin / Ops</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('manager@demo.local')}
                className="text-left p-2.5 rounded-none border border-[#e0e0e0] hover:border-[#0f62fe] hover:bg-[#edf5ff] transition-colors text-[11px]"
              >
                <div className="font-medium text-[#161616]">David Miller</div>
                <div className="text-[10px] text-[#0e6027] font-normal tracking-carbon">Manager / Lead</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoSelect('employee@demo.local')}
                className="text-left p-2.5 rounded-none border border-[#e0e0e0] hover:border-[#0f62fe] hover:bg-[#edf5ff] transition-colors text-[11px]"
              >
                <div className="font-medium text-[#161616]">John Doe</div>
                <div className="text-[10px] text-[#525252] font-normal tracking-carbon">Employee / Dev</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#8c8c8c] text-[11px] mt-6 tracking-carbon">
          TimeLogger • Carbon Enterprise Design • Strict Multi-Tenancy
        </p>
      </div>
    </div>
  );
}
