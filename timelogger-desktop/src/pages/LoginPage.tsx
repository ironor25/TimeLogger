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

  const fillEmilyWatson = () => {
    setEmail('emily.watson@acme.local');
    setPassword('Password123!');
    setError('');
  };

  const fillPriyaSharma = () => {
    setEmail('priya.sharma@acme.local');
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto select-none bg-[#ffffff] text-[#161616] font-sans tracking-carbon">
      <div className="w-full max-w-sm mx-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-10 h-10 rounded-none bg-[#0f62fe] items-center justify-center text-white font-bold text-base mb-1">
            PT
          </div>
          <h1 className="text-2xl font-light text-[#161616] tracking-tight">PulseTime Desktop</h1>
          <p className="text-xs text-[#525252]">Sign in to track work time & screenshot activity</p>
        </div>

        {/* Quick Demo Fill Pills */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-[#525252] uppercase tracking-wider text-center">
            Quick 1-Click Login (Demo Accounts)
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={fillJohnDoe}
              className="py-2 px-2.5 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#161616] text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] text-[#161616]">
                <Sparkles className="w-3 h-3 text-[#0f62fe]" />
                <span>John Doe</span>
              </div>
              <div className="text-[9px] text-[#525252] truncate font-mono">employee@demo.local</div>
            </button>

            <button
              type="button"
              onClick={fillRobertChen}
              className="py-2 px-2.5 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#161616] text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] text-[#161616]">
                <Sparkles className="w-3 h-3 text-[#0f62fe]" />
                <span>Robert Chen</span>
              </div>
              <div className="text-[9px] text-[#525252] truncate font-mono">robert.chen@acme.local</div>
            </button>

            <button
              type="button"
              onClick={fillEmilyWatson}
              className="py-2 px-2.5 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#161616] text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] text-[#161616]">
                <Sparkles className="w-3 h-3 text-[#0f62fe]" />
                <span>Emily Watson</span>
              </div>
              <div className="text-[9px] text-[#525252] truncate font-mono">emily.watson@acme.local</div>
            </button>

            <button
              type="button"
              onClick={fillPriyaSharma}
              className="py-2 px-2.5 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#161616] text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-[11px] text-[#161616]">
                <Sparkles className="w-3 h-3 text-[#0f62fe]" />
                <span>Priya Sharma</span>
              </div>
              <div className="text-[9px] text-[#525252] truncate font-mono">priya.sharma@acme.local</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-none bg-[#ffebee] border border-[#da1e28] text-[#da1e28] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#da1e28]" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#161616]">Work Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f4f4f4] border border-[#e0e0e0] focus:border-b-2 focus:border-b-[#0f62fe] rounded-none pl-9 pr-3 py-2 text-xs text-[#161616] placeholder:text-[#8c8c8c] focus:outline-none transition-colors"
                required
              />
              <Mail className="w-4 h-4 text-[#8c8c8c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#161616]">Password</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f4f4f4] border border-[#e0e0e0] focus:border-b-2 focus:border-b-[#0f62fe] rounded-none pl-9 pr-3 py-2 text-xs text-[#161616] placeholder:text-[#8c8c8c] focus:outline-none transition-colors"
                required
              />
              <Lock className="w-4 h-4 text-[#8c8c8c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Server Config Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-xs text-[#525252] hover:text-[#161616] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-[#0f62fe]" />
              <span>{showServerConfig ? 'Hide Server URL' : 'Server: ' + serverUrl}</span>
            </button>

            {showServerConfig && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-2 text-xs font-mono text-[#161616] focus:outline-none focus:border-[#0f62fe]"
                  placeholder="https://timelogger-dy6t.onrender.com/api/v1"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-none bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Authenticating & Registering Device...' : 'Sign In & Connect Device'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[11px] text-[#8c8c8c]">
          PulseTime Secure Desktop Agent • Carbon v1.0.0
        </p>
      </div>
    </div>
  );
};
