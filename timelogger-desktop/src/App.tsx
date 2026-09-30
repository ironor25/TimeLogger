import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { TrackerPage } from './pages/TrackerPage';
import { Header } from './components/Header';
import { storage } from './services/storage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const { accessToken } = storage.getTokens();
    const emp = storage.getEmployee();
    return !!(accessToken && emp);
  });

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const handleLogout = () => {
    storage.clearAuth();
    setIsAuthenticated(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#161616] text-[#f4f4f4] antialiased overflow-hidden font-sans border border-[#393939] rounded-none">
      {!isAuthenticated ? (
        <>
          <Header />
          <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        </>
      ) : (
        <TrackerPage key={storage.getEmployee()?.id || 'tracker-user'} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
