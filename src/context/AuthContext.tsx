
import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Mock login function - in a real app, this would connect to Firebase or another auth provider
  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock admin login
    if (email === 'admin' && password === 'admin') {
      const adminUser = {
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin' as const
      };
      setCurrentUser(adminUser);
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      return true;
    }
    
    // Mock regular user login (any email/password combination for demo purposes)
    if (email && password) {
      const user = {
        email: email,
        name: email.split('@')[0],
        role: 'user' as const
      };
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const value = {
    currentUser,
    login,
    logout,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
