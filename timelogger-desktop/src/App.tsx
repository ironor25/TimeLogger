import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { TrackerPage } from './pages/TrackerPage';
import { Header } from './components/Header';
import { storage } from './services/storage';
import { credentials } from './local/credentials';
import { authService } from './services/auth';
import { connectivity } from './services/connectivity';
import { RefreshCw } from 'lucide-react';
import appLogo from './assets/icon.png';

export function App() {
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [initialIsOnline, setInitialIsOnline] = useState<boolean>(true);
  const [isOfflineNoCreds, setIsOfflineNoCreds] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        const hasCreds = await credentials.has();
        const saved = await credentials.get();

        if (hasCreds && saved && saved.email) {
          const isNetOnline = connectivity.isOnlineFast();

          if (isNetOnline) {
            // CASE A: Internet available -> Authenticate automatically
            const authRes = await authService.loginWithSavedCredentials();
            if (!isMounted) return;

            if (authRes.success) {
              setIsAuthenticated(true);
              setInitialIsOnline(authRes.isOnline);
            } else if (authRes.isInvalidCredentials) {
              setIsAuthenticated(false);
              setAuthError('Your saved login session is no longer valid. Please log in again.');
            } else {
              // Server glitch or unreachable -> Open in OFFLINE mode
              authService.restoreSavedState(saved);
              setIsAuthenticated(true);
              setInitialIsOnline(false);
            }
          } else {
            // CASE B: Internet not available -> Open tracker directly in OFFLINE mode
            authService.restoreSavedState(saved);
            if (!isMounted) return;
            setIsAuthenticated(true);
            setInitialIsOnline(false);
          }
        } else {
          // No saved credentials
          const isOnline = connectivity.isOnlineFast();
          if (!isMounted) return;
          setIsAuthenticated(false);
          setIsOfflineNoCreds(!isOnline);
        }
      } catch (err) {
        console.error('[App] Startup error:', err);
        const emp = storage.getEmployee();
        if (emp && isMounted) {
          setIsAuthenticated(true);
          setInitialIsOnline(false);
        }
      } finally {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    }

    initApp();

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setAuthError('Session expired. Please sign in again.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    let cleanupClose: (() => void) | undefined;
    if (window.electronAPI?.onCloseRequested) {
      cleanupClose = window.electronAPI.onCloseRequested(() => {
        if (!isAuthenticated) {
          if (window.electronAPI?.quitApp) {
            window.electronAPI.quitApp();
          } else if (window.electronAPI?.close) {
            window.electronAPI.close();
          }
        }
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
      if (cleanupClose) cleanupClose();
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = (isOnline: boolean) => {
    setAuthError('');
    setIsOfflineNoCreds(false);
    setInitialIsOnline(isOnline);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setAuthError('');
  };

  const handleUnauthenticatedClose = () => {
    if (window.electronAPI?.quitApp) {
      window.electronAPI.quitApp();
    } else if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ffffff] text-[#161616] font-sans">
        <img src={appLogo} alt="TimeLogger" className="w-10 h-10 mb-3 animate-pulse" />
        <div className="flex items-center gap-2 text-xs text-[#525252]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0f62fe]" />
          <span>Starting TimeLogger Desktop...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f4f4f4] text-[#161616] antialiased overflow-hidden font-sans border border-[#e0e0e0] rounded-none">
      {!isAuthenticated ? (
        <>
          <Header
            isOnline={!isOfflineNoCreds}
            onClose={handleUnauthenticatedClose}
          />
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            initialError={authError}
            isOfflineStartup={isOfflineNoCreds}
          />
        </>
      ) : (
        <TrackerPage
          key={storage.getEmployee()?.id || 'tracker-user'}
          initialIsOnline={initialIsOnline}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
