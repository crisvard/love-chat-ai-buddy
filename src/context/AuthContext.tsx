
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

  // Login function with fixed admin login credentials
  const login = async (email: string, password: string): Promise<boolean> => {
    // Admin login - use exactly "admin" for both email and password
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
    
    // Special user login - redirect to admin panel
    if (email === 'user' && password === 'user') {
      const specialUser = {
        email: 'user@example.com',
        name: 'User',
        role: 'admin' as const // Setting role as admin to access admin panel
      };
      setCurrentUser(specialUser);
      localStorage.setItem('currentUser', JSON.stringify(specialUser));
      return true;
    }
    
    // Regular user login (any email/password combination for demo purposes)
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
