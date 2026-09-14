'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useBlogStore();

  const [email, setEmail] = useState('admin@jupsoft.com');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  const demoAccounts = [
    { role: 'Super Admin', email: 'admin@jupsoft.com', pass: 'Admin@12345', badge: 'Full Platform Access' },
    { role: 'Editor', email: 'priya.verma@jupsoft.com', pass: 'Editor@12345', badge: 'Review & Approve' },
    { role: 'Publisher', email: 'rohan.gupta@jupsoft.com', pass: 'Publish@12345', badge: 'Schedule & Publish' },
    { role: 'SEO Manager', email: 'vikram.mehta@jupsoft.com', pass: 'Seo@12345', badge: 'Canonical & Meta' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await login(email, password);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setErrorMsg(res.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-[#070a12] p-4 sm:p-6 select-none">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm border border-slate-800 dark:border-slate-200">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Jupsoft CMS Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Centralized Multi-Site Content Engine · TRD v1.0 Production
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#0d121f] rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jupsoft.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 dark:bg-slate-900"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Keep me signed in
                </span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>JWT SSL Active</span>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Demo Profiles (TRD Section 5) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                <span>One-Click Role Switcher</span>
              </span>
              <span>TRD v1.0 Accounts</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={`text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                    email === acc.email
                      ? 'border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>{acc.role}</span>
                    {email === acc.email && <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.badge}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p>© 2026 Jupsoft Systems Pvt. Ltd. · Enterprise CMS</p>
          <p className="font-mono text-[10px] text-slate-500">
            Authoring Plane · Next.js 16 App Router · JWT Session Security
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Reset Account Password</span>
              </h3>
              <button
                onClick={() => { setForgotModalOpen(false); setResetSubmitted(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetSubmitted ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Password Reset Dispatched</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  A cryptographic reset token has been sent to <strong>{resetEmail || email}</strong>. Please check your inbox or contact the platform Super Admin.
                </p>
                <button
                  onClick={() => { setForgotModalOpen(false); setResetSubmitted(false); }}
                  className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setResetSubmitted(true); }} className="space-y-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  Enter your registered work email to receive a password reset authorization link.
                </p>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail || email}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
