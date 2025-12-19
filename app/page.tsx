"use client";
import { useState, useEffect } from 'react';
import { LoginPage } from '../components/login-page';
import { Dashboard } from '../components/dashboard';
import { RegisterPage } from '../components/register-page';

interface User {
  username: string;
  role: string;
  db: string;
}

const roleDisplayMap: { [key: string]: string } = {
  admin: "ผู้ดูแลระบบ",
  oat: "ผู้ดูแลระบบ",
  "พัน 1": "ฝอ.1 พัน.1",
  "พัน 2": "ฝอ.1 พัน.2",
  "พัน 3": "ฝอ.1 พัน.3",
  "พัน 4": "ฝอ.1 พัน.4",
  "รวม": "ฝอ.1 นนร.",
};

export default function Home() {
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/user');
        const data = await res.json();
        if (data.success && data.user) {
          setIsLoggedIn(true);
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      }
      setIsInitializing(false);
    };

    checkSession();
  }, []);

  const handleLogin = async (username: string, password: string, rememberMe?: boolean) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    // Clear any remaining client-side state if necessary
    sessionStorage.clear();
    localStorage.clear();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Initializing Session...</div>
        </div>
      </div>
    );
  }

  // Dashboard view
  if (isLoggedIn && currentUser) {
    const rawRole = currentUser.role;
    const displayRole = roleDisplayMap[rawRole] || rawRole;

    const userObj = {
      username: currentUser.username,
      displayName: currentUser.username,
      role: rawRole,
      group: currentUser.db,
      sheetname: currentUser.db,
      displayRole,
    };

    return <Dashboard user={userObj} username={currentUser.username} onLogout={handleLogout} />;
  }

  // Register view
  if (view === 'register') {
    return <RegisterPage onBack={() => setView('login')} />;
  }

  // Default: Login view
  const onLoginAsync = async (username: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    return await handleLogin(username, password, rememberMe);
  };

  return <LoginPage onLogin={onLoginAsync} onRegisterClick={() => setView('register')} />;
}