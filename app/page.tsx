"use client";
import { useState, useEffect } from 'react';
import { LoginPage } from '../components/login-page';
import { Dashboard } from '../components/dashboard';
import { RegisterPage } from '../components/register-page';
import { LoadingScreen } from '../components/loading-screen';
import { StartScreen } from '../components/start-screen';

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
  const [view, setView] = useState<'start' | 'login' | 'register' | 'dashboard'>('start');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check session on component mount
  // Check session on component mount
  useEffect(() => {
    const checkSession = async () => {
      // Create a minimum delay to show the loading screen
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));

      const sessionCheck = (async () => {
        try {
          const res = await fetch('/api/auth/user');
          const data = await res.json();
          if (data.success && data.user) {
            return data.user;
          }
        } catch (error) {
          console.error("Failed to check session:", error);
        }
        return null;
      })();

      // Wait for both the timer and the session check
      const [_, user] = await Promise.all([minLoadTime, sessionCheck]);

      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
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
    setView('login'); // Ensure we go to login screen, not start screen
    // Clear any remaining client-side state if necessary
    sessionStorage.clear();
    localStorage.clear();
  };

  if (isInitializing) {
    return <LoadingScreen />;
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

  // Start view (only initial load if not logged in)
  if (view === 'start') {
    return <StartScreen onStart={() => setView('login')} />;
  }

  // Default: Login view
  const onLoginAsync = async (username: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    return await handleLogin(username, password, rememberMe);
  };

  return <LoginPage onLogin={onLoginAsync} onRegisterClick={() => setView('register')} />;
}