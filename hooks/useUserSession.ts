// hooks/useUserSession.ts
import { useState, useEffect } from 'react';

interface UserSession {
  username: string;
  role: string;
  db: string;
}

interface UseUserSessionResult {
  user: UserSession | null;
  isLoading: boolean;
  isError: boolean;
}

export function useUserSession(): UseUserSessionResult {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/user');
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error("Failed to fetch user session:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, isLoading, isError };
}
