'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useBlogStore } from '../../store/useBlogStore';
import { apiClient } from '../../services/apiClient';
import {
  Lock,
  Mail,
  ArrowRight,
  Layers,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const login = useBlogStore((s) => s.login);
  const loginWithGoogle = useBlogStore((s) => s.loginWithGoogle);
  const isAuthenticated = useBlogStore((s) => s.isAuthenticated);
  const currentUser = useBlogStore((s) => s.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const isRedirectingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const performRedirect = (targetPath?: string) => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    setLoading(true);

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    let dest = targetPath || urlParams?.get('redirect') || '/dashboard';
    if (!dest || !dest.startsWith('/') || dest.startsWith('//') || dest === '/login' || dest.startsWith('/login')) {
      dest = '/dashboard';
    }

    // Ensure jupsoft_auth_token cookie is explicitly synced in document.cookie before redirect
    const token = apiClient.getToken();
    if (token && typeof document !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      document.cookie = `jupsoft_auth_token=${token}; path=/; max-age=315360000; SameSite=Lax${isHttps ? '; Secure' : ''}`;
    }

    // Direct, guaranteed browser navigation: never hangs on Next.js client router transitions
    if (typeof window !== 'undefined') {
      window.location.href = dest;
    } else {
      router.replace(dest);
    }
  };

  const handleGoogleCredentialResponse = useCallback(async (response: { credential?: string }) => {
    if (!response || !response.credential) {
      setErrorMsg('No Google credential received.');
      return;
    }

    // Synchronous immediate lock against rapid clicks
    if (isSubmittingRef.current || loading || googleLoading) {
      return;
    }
    isSubmittingRef.current = true;
    setGoogleLoading(true);
    setErrorMsg(null);

    const timeoutTimer = setTimeout(() => {
      isSubmittingRef.current = false;
      isRedirectingRef.current = false;
      setGoogleLoading(false);
      setErrorMsg('Google authentication timed out. Please try again.');
    }, 8000);

    try {
      const res = await loginWithGoogle(response.credential);
      clearTimeout(timeoutTimer);
      if (res.success) {
        // Step 2: Store last used Google email for subsequent zero-popup silent logins
        try {
          const user = useBlogStore.getState().currentUser;
          if (user?.email) {
            localStorage.setItem('jupsoft_last_google_email', user.email.toLowerCase().trim());
          }
        } catch {}
        performRedirect();
      } else {
        isSubmittingRef.current = false;
        setGoogleLoading(false);
        setErrorMsg(res.message || 'Google sign-in denied. Only registered accounts can access the CMS.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      isSubmittingRef.current = false;
      setGoogleLoading(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during Google sign-in.';
      setErrorMsg(msg);
    }
  }, [loading, googleLoading, loginWithGoogle]);

  const initGoogleAuth = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.accounts?.id) return;
    if (!googleClientId) return;

    try {
      const lastGoogleEmail = localStorage.getItem('jupsoft_last_google_email') || '';

      const gisConfig: Record<string, unknown> = {
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: true, // Step 1: Enables automatic silent sign-in
        cancel_on_tap_outside: true,
      };

      // Step 2: Pass login_hint so Google directly selects the user's account without popup
      if (lastGoogleEmail) {
        gisConfig.login_hint = lastGoogleEmail;
      }

      window.google.accounts.id.initialize(gisConfig);

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          width: 320,
          logo_alignment: 'left',
        });
        setGisRendered(true);
      }

      // Step 3: Trigger silent background verification on page load for returning users
      const urlParams = new URLSearchParams(window.location.search);
      const isSessionExpired = urlParams.get('session') === 'expired';
      const isLoggedOut = urlParams.get('logout') === 'true';

      if (!isSessionExpired && !isLoggedOut && !isRedirectingRef.current && !loading && !googleLoading) {
        window.google.accounts.id.prompt((notification) => {
          if (notification?.isNotDisplayed?.()) {
            console.debug('[Google Auth] Silent prompt not displayed');
          } else if (notification?.isSkippedMoment?.()) {
            console.debug('[Google Auth] Silent prompt skipped');
          }
        });
      }
    } catch (err) {
      console.warn('Google Identity Services initialization warning:', err);
    }
  }, [googleClientId, handleGoogleCredentialResponse, loading, googleLoading]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let attempts = 0;

    const checkAndInit = () => {
      attempts++;
      if (typeof window !== 'undefined' && window.google?.accounts?.id && googleClientId && googleBtnRef.current) {
        initGoogleAuth();
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      interval = setInterval(() => {
        if (checkAndInit() || attempts > 30) {
          if (interval) clearInterval(interval);
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [initGoogleAuth, googleClientId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const isSessionExpired = urlParams.get('session') === 'expired';

    // 1. Explicit session expiration or forced logout: immediately purge and stop
    if (isSessionExpired) {
      useBlogStore.getState().logout();
      apiClient.hardPurge();
      isRedirectingRef.current = false;
      isSubmittingRef.current = false;
      setLoading(false);
      queueMicrotask(() => setErrorMsg('Your session has expired or account is inactive. Please sign in again.'));
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
      return;
    }

    // 2. Validate live active token: If token is missing, user CANNOT be authenticated!
    const token = apiClient.getToken();
    if (!token || token.startsWith('offline_token_')) {
      // Clean stale in-memory or persisted Zustand flags so the login form is instantly interactive
      if (isAuthenticated || currentUser) {
        useBlogStore.getState().logout();
        apiClient.hardPurge();
      }
      isRedirectingRef.current = false;
      isSubmittingRef.current = false;
      setLoading(false);
      return;
    }

    // 3. Token exists:
    // Verify token with backend BEFORE blindly redirecting (prevents infinite redirect loops across browsers)
    if (token && !isRedirectingRef.current) {
      let cancelled = false;
      setLoading(true);

      const verifyTimer = setTimeout(() => {
        if (!cancelled && !isRedirectingRef.current) {
          setLoading(false);
          isRedirectingRef.current = false;
        }
      }, 5000);

      apiClient.getProfile().then((profile) => {
        clearTimeout(verifyTimer);
        if (cancelled) return;
        if (profile && profile.id) {
          performRedirect();
        } else {
          useBlogStore.getState().logout();
          apiClient.hardPurge();
          isRedirectingRef.current = false;
          setLoading(false);
        }
      }).catch(() => {
        clearTimeout(verifyTimer);
        if (cancelled) return;
        // Server rejected token (401 or revoked): Clean up and unlock login form
        useBlogStore.getState().logout();
        apiClient.hardPurge();
        isRedirectingRef.current = false;
        setLoading(false);
        setErrorMsg('Your previous session has expired. Please sign in with your credentials.');
      });

      return () => {
        cancelled = true;
        clearTimeout(verifyTimer);
      };
    }
  }, [isAuthenticated, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Synchronous immediate double-fire lock: stops 2nd POST in same tick or rapid clicks
    if (isSubmittingRef.current || loading || googleLoading) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMsg(null);

    const timeoutTimer = setTimeout(() => {
      isSubmittingRef.current = false;
      isRedirectingRef.current = false;
      setLoading(false);
      setErrorMsg('Authentication request timed out. Please check your internet connection and try again.');
    }, 8000);

    try {
      const res = await login(email.trim(), password);
      clearTimeout(timeoutTimer);
      if (res.success) {
        performRedirect();
      } else {
        isSubmittingRef.current = false;
        isRedirectingRef.current = false;
        setLoading(false);
        setErrorMsg(res.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      isSubmittingRef.current = false;
      isRedirectingRef.current = false;
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(msg);
    }
  };

  const handleManualGoogleClick = () => {
    if (!googleClientId) {
      setErrorMsg('Google OAuth Client ID not configured.');
      return;
    }
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      initGoogleAuth();
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          console.warn('[Google Auth] Prompt not displayed:', notification);
          setErrorMsg(
            'Google Sign-In prompt could not be displayed automatically (browser privacy settings or prompt cooldown). Please click the Google button directly or sign in with your email and password.'
          );
        }
      });
    } else {
      setErrorMsg('Google Services are loading. Please wait 2-3 seconds and try again.');
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleAuth}
      />
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
                CMS Portal
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized Multi-Site Content Engine
              </p>
            </div>
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
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
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
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
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

              {/* Submit CTA — immediately disabled on click, pointer-events blocked */}
              <button
                type="submit"
                disabled={loading || googleLoading || isSubmittingRef.current}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all shadow-sm ${
                  loading || googleLoading ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
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

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                or continue with
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            </div>

            {/* Google Sign-In Area */}
            <div className="space-y-2">
              {/* Native Google GIS Render Target */}
              <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden min-h-[40px]" />

              {/* Custom Google Button Fallback / Interactive Trigger (shown if GIS is loading or not rendered) */}
              {!gisRendered && (
                <button
                  type="button"
                  onClick={handleManualGoogleClick}
                  disabled={loading || googleLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  <GoogleIcon />
                  <span>
                    {googleLoading ? 'Verifying Google Account...' : 'Sign in with Google'}
                  </span>
                </button>
              )}

              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-tight">
                Google Sign-In is strictly restricted to pre-registered team members.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[11px] text-slate-400">
            <p>© 2026 Jupsoft Systems Pvt. Ltd.</p>
          </div>
        </div>
      </div>
    </>
  );
}

