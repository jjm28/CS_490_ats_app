import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  isAuthed: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);

  // persist to localStorage so refresh keeps state
  useEffect(() => {
    const v = localStorage.getItem('isAuthed') === 'true';
    setIsAuthed(v);
  }, []);
  useEffect(() => {
    localStorage.setItem('isAuthed', String(isAuthed));
  }, [isAuthed]);

  const login = () => setIsAuthed(true);
  const logout = () => setIsAuthed(false);

  return (
    <AuthContext.Provider value={{ isAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
