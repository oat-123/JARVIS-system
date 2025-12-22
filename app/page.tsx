"use client";
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  // Default: Login view
  // Define login handler
  const onLoginAsync = async (username: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    return await handleLogin(username, password, rememberMe);
  };

  // Wrap content in AnimatePresence for transitions
  return (
    <AnimatePresence mode="wait">
      {isLoggedIn && currentUser ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Dashboard user={{
            username: currentUser.username,
            displayName: currentUser.username,
            role: currentUser.role,
            group: currentUser.db,
            sheetname: currentUser.db,
            displayRole: roleDisplayMap[currentUser.role] || currentUser.role,
          }} username={currentUser.username} onLogout={handleLogout} />
        </motion.div>
      ) : view === 'register' ? (
        <motion.div
          key="register"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <RegisterPage onBack={() => setView('login')} />
        </motion.div>
      ) : view === 'start' ? (
        <motion.div
          key="start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }} // Zoom out effect on start
          transition={{ duration: 0.5 }}
        >
          <StartScreen onStart={() => setView('login')} />
        </motion.div>
      ) : (
        <motion.div
          key="login"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage onLogin={onLoginAsync} onRegisterClick={() => setView('register')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}