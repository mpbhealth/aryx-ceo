import './lib/consoleFilter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { NotificationProvider } from './providers/NotificationProvider.tsx';
import { ProtectedRoute } from './components/guards/ProtectedRoute.tsx';

import { AuthCallback } from './components/pages/AuthCallback.tsx';
import Login from './components/pages/Login.tsx';
import ResetPassword from './components/pages/ResetPassword.tsx';
import { SsoCallback } from './components/pages/SsoCallback.tsx';
import CosApp from './CosApp.tsx';
import './index.css';
import { Environment } from './lib/environment';
import { isSupabaseConfigured } from './lib/supabase';
import { initTheme } from './lib/theme';

initTheme();
import React from 'react';

// Load diagnostics asynchronously to avoid circular dependency issues
if (typeof window !== 'undefined') {
  import('./lib/whiteScreenDiagnostics').catch(err => 
    console.error('Failed to load diagnostics:', err)
  );
}

// Create a client for React Query with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min
      gcTime: 1000 * 60 * 30, // 30 minutes - cache persists longer
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      refetchOnReconnect: true, // Refetch on reconnect (user came back online)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 404s or auth errors
        const status = (error as { status?: number })?.status;
        if (status === 404 || status === 401 || status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (Environment.isPlatformError(event.error || event.message)) {
        return;
      }

      Environment.error('Application error caught:', event.error);
      setTimeout(() => {
        setHasError(true);
        setError(event.error);
        setErrorInfo(event.error?.stack || 'No stack trace available');
      }, 0);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (Environment.isPlatformError(String(event.reason))) {
        return;
      }

      Environment.error('Unhandled promise rejection:', event.reason);
      setTimeout(() => {
        setHasError(true);
        setError(new Error(event.reason));
        setErrorInfo(event.reason?.stack || String(event.reason));
      }, 0);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Error</h1>
            <p className="text-slate-600 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={() => {
                if (window.clearAllCaches) {
                  window.clearAllCaches();
                } else {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(registration => registration.unregister());
                    });
                  }
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-sm"
            >
              Clear Cache & Reload
            </button>
            <button
              onClick={() => {
                if (window.diagnoseWhiteScreen) {
                  window.diagnoseWhiteScreen();
                }
                alert('Check browser console for diagnostic results');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-sm"
            >
              Run Diagnostics
            </button>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
                setErrorInfo(null);
              }}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-sm"
            >
              Try Again
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Troubleshooting Tips
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Click "Run Diagnostics" to check what might be causing the issue</li>
              <li>• Open browser console (F12) to see detailed error logs</li>
              <li>• Try "Clear Cache & Reload" to fix loading issues</li>
              <li>• Check if your Supabase connection is working</li>
              <li>• Verify you have an active internet connection</li>
            </ul>
          </div>

          <details className="mt-4 text-left">
            <summary className="text-slate-600 cursor-pointer hover:text-slate-900 font-medium">Technical Details</summary>
            <pre className="mt-3 p-3 bg-slate-100 rounded text-xs text-slate-700 overflow-auto max-h-64">
              {errorInfo || error?.stack || 'No stack trace available'}
            </pre>
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-700">
              <strong className="block mb-2">Debug Information:</strong>
              <div className="space-y-1">
                <div>• Environment: {import.meta.env.MODE}</div>
                <div>• Timestamp: {new Date().toISOString()}</div>
                <div>• User Agent: {navigator.userAgent.substring(0, 80)}...</div>
                <div>• URL: {window.location.href}</div>
                <div>• Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}</div>
                <div>• Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}</div>
              </div>
            </div>
          </details>

          <div className="mt-6 text-sm text-slate-500">
            Need help? Contact support or check the console for more details.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Do not register /sw.js. index.html unregisters workers on boot so a cached
// shell cannot point at a hashed bundle that the next deploy already deleted.

// Production environment check - only log errors
if (import.meta.env.PROD && isSupabaseConfigured) {
  import('./lib/supabase').then(({ supabase }) => {
    supabase.auth.getSession().catch(err => {
      console.error('[ARYX CEO] Supabase connection error:', err);
    });
  });
}

// Configuration Check Component
function ConfigurationCheck({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured && import.meta.env.PROD) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Pattern - matching login page */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="max-w-2xl w-full relative">
          {/* Glass morphism card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '60px 60px'
                }} />
              </div>
              <div className="flex items-center space-x-4 relative">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Configuration Required</h1>
                  <p className="text-indigo-50 mt-1 text-sm">Database connection setup needed</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Alert banner */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 p-4 rounded-lg shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-amber-900">Action Required</h3>
                    <p className="mt-1 text-sm text-amber-800">
                      ARYX CEO requires Supabase configuration to function properly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Setup instructions */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full mr-3"></span>
                  Setup Instructions
                </h2>
                <ol className="space-y-4 text-sm text-slate-700">
                  <li className="flex items-start group">
                    <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mr-3 mt-0.5 shadow-md group-hover:scale-110 transition-transform">1</span>
                    <span className="pt-0.5">Log in to your deployment platform (Netlify, Vercel, etc.)</span>
                  </li>
                  <li className="flex items-start group">
                    <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mr-3 mt-0.5 shadow-md group-hover:scale-110 transition-transform">2</span>
                    <span className="pt-0.5">Navigate to your site's environment variables settings</span>
                  </li>
                  <li className="flex items-start group">
                    <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs mr-3 mt-0.5 shadow-md group-hover:scale-110 transition-transform">3</span>
                    <span className="pt-0.5">Add the following environment variables:</span>
                  </li>
                </ol>
              </div>

              {/* Code block */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 shadow-lg border border-indigo-500/20">
                <div className="font-mono text-xs space-y-3">
                  <div className="text-indigo-400 font-semibold"># Required Variables</div>
                  <div>
                    <div className="text-blue-300 font-semibold">VITE_SUPABASE_URL</div>
                    <div className="text-slate-400 ml-4 text-[10px]">→ Your Supabase project URL</div>
                  </div>
                  <div>
                    <div className="text-blue-300 font-semibold mt-2">VITE_SUPABASE_ANON_KEY</div>
                    <div className="text-slate-400 ml-4 text-[10px]">→ Your Supabase anonymous key</div>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/60 rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-blue-900 text-sm mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Where to find these values
                </h3>
                <ol className="text-xs text-blue-900 space-y-2 ml-7 list-decimal">
                  <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-blue-400 hover:text-sky-700 transition-colors">supabase.com/dashboard</a></li>
                  <li>Select your project</li>
                  <li>Click on <span className="font-semibold text-sky-700">Settings</span> → <span className="font-semibold text-sky-700">API</span></li>
                  <li>Copy the <span className="font-semibold text-sky-700">Project URL</span> and <span className="font-semibold text-sky-700">anon/public</span> key</li>
                </ol>
              </div>

              {/* Action button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-4 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>I've Added the Variables - Reload Page</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center pt-2">
                Need help? Contact your system administrator or check the deployment documentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Ensure root element exists before mounting
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element. The DOM may not have loaded properly.');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
          <ConfigurationCheck>
            <QueryClientProvider client={queryClient}>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AuthProvider>
                <NotificationProvider>
                  <Routes>
                    {/* Login Route */}
                    <Route path="/login" element={<Login onLoginSuccess={() => {}} />} />

                    {/* Auth Callback Route */}
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />
                    <Route path="/sso/callback" element={<SsoCallback />} />

                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <CosApp />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </NotificationProvider>
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
          </ConfigurationCheck>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('[ARYX CEO] Fatal error during React mount:', error);
  // Display error directly in the DOM if React fails to mount
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fee2e2; padding: 20px; font-family: system-ui, sans-serif;">
        <div style="max-width: 600px; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-bottom: 16px;">⚠️ Application Failed to Start</h1>
          <p style="color: #64748b; margin-bottom: 16px;">
            ARYX CEO failed to initialize. This could be due to:
          </p>
          <ul style="color: #64748b; margin-left: 20px; margin-bottom: 24px;">
            <li>Missing or invalid environment variables</li>
            <li>Network connectivity issues</li>
            <li>Browser compatibility problems</li>
          </ul>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
            <strong>Error:</strong><br>
            <code style="color: #dc2626; font-size: 12px;">${error instanceof Error ? error.message : String(error)}</code>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button onclick="window.location.href='/diagnostics.html'" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Run Diagnostics
            </button>
            <button onclick="window.location.reload()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Reload Page
            </button>
            <button onclick="console.log('Error details:', ${JSON.stringify(error)}); alert('Check browser console (F12) for details')" style="background: #64748b; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Show Console
            </button>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Press F12 to open Developer Tools and check the Console for detailed error information.
          </p>
        </div>
      </div>
    `;
  }
}
