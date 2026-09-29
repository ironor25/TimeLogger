import React, { useState } from 'react';
import { Lock, Mail, Server, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(storage.getServerUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      storage.setServerUrl(serverUrl);
      await agentApi.login({ email, password });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials or server connection.');
    } finally {
      setLoading(false);
    }
  };

  const fillJohnDoe = () => {
    setEmail('employee@demo.local');
    setPassword('Password123!');
    setError('');
  };

  const fillRobertChen = () => {
    setEmail('robert.chen@acme.local');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto select-none">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 mb-1">
            PT
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">PulseTime Desktop</h1>
          <p className="text-xs text-slate-400">Sign in to track work time and manage shift tasks</p>
        </div>

        {/* Quick Demo Fill Pills */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
            Quick 1-Click Login
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillJohnDoe}
              className="py-2 px-2.5 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/60 text-blue-200 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-xs text-blue-300 group-hover:text-blue-200">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>John Doe</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">employee@demo.local</div>
            </button>

            <button
              type="button"
              onClick={fillRobertChen}
              className="py-2 px-2.5 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-200 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-xs text-indigo-300 group-hover:text-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Robert Chen</span>
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">robert.chen@acme.local</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Work Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Server Config Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Server className="w-3 h-3 text-blue-400" />
              <span>{showServerConfig ? 'Hide Server URL' : 'Server: ' + serverUrl}</span>
            </button>

            {showServerConfig && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                  placeholder="https://timelogger-dy6t.onrender.com/api/v1"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating & Registering Device...' : 'Sign In & Connect Device'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-500">
          PulseTime Secure Desktop Agent • v1.0.0
        </p>
      </div>
    </div>
  );
};
