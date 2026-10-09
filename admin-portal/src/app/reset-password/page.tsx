'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [checkingToken, setCheckingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setIsTokenValid(false);
      setErrorMsg('No reset token was provided. Please use the link sent to your email.');
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.validateResetToken(token);
        if (res.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          setErrorMsg(res.message || 'This password reset link is invalid or has expired.');
        }
      } catch (err: unknown) {
        setIsTokenValid(false);
        const msg = err instanceof Error ? err.message : 'Failed to validate reset link.';
        setErrorMsg(msg);
      } finally {
        setCheckingToken(false);
      }
    };

    verify();
  }, [token]);

  // Real-time validations
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumberOrSymbol && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setErrorMsg('Please ensure all password requirements are satisfied.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.resetPassword(token, newPassword);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMsg(res.message || 'Failed to reset password.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while resetting your password.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 dark:bg-[#070a12] p-4 sm:p-6 select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="/logoadminapp.png"
              alt="Jupsoft CMS"
              className="h-14 w-auto object-contain drop-shadow-xs transition-transform hover:scale-105"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Set New Password
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Secure Account Update
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0d121f] rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {checkingToken ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Validating security token...
              </p>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4 text-center py-2 animate-in fade-in">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Password Reset Successful
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your password has been updated securely. You can now sign in with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : !isTokenValid ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The password reset link is invalid or has expired. Please request a new reset link.
              </p>
              <Link
                href="/forgot-password"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-sm"
              >
                <span>Request New Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className={hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasUpper && hasLower ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className={hasUpper && hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    Uppercase and lowercase letters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasNumberOrSymbol ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className={hasNumberOrSymbol ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    At least one number or special character
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  <span className={passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {loading ? (
                  <span>Updating password...</span>
                ) : (
                  <>
                    <span>Reset Password & Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400">
          <p>© 2026 Jupsoft Systems Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#070a12]">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
