
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getFromCache, saveToCache, clearCache } from '@/utils/cacheUtils';

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  signup: (email: string, password: string, metadata?: Record<string, any>) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
}

// Cache keys
const CACHE_KEYS = {
  AGENT_DATA: 'selected_agent_data'
};

// Cache TTL values
const CACHE_TTL = {
  AGENT: 60 * 60 * 1000 // 1 hour - agent data rarely changes
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);
    });

    // THEN check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setCurrentUser(session?.user ?? null);
    };

    getSession();

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (email: string, password: string, metadata?: Record<string, any>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        console.error("Erro ao se cadastrar:", error);
        return false;
      }

      setCurrentUser(data.user);
      
      // If we have agent selection data, store it in localStorage for immediate access
      if (metadata?.agentId && metadata?.agentName && metadata?.agentImage && metadata?.nickname) {
        const agentData = {
          id: metadata.agentId,
          name: metadata.agentName,
          image: metadata.agentImage,
          nickname: metadata.nickname
        };
        localStorage.setItem("selectedAgent", JSON.stringify(agentData));
        
        // Also cache it
        saveToCache(CACHE_KEYS.AGENT_DATA, agentData, CACHE_TTL.AGENT);
      }
      
      return true;
    } catch (error) {
      console.error("Erro durante o cadastro:", error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Erro ao logar:", error);
        return false;
      }

      setCurrentUser(data.user);
      
      // Load agent data after successful login and cache it
      if (data.user) {
        await loadAndCacheAgentData(data.user.id);
      }
      
      return true;
    } catch (error) {
      console.error("Erro durante o login:", error);
      return false;
    }
  };
  
  // Separate function to load and cache agent data
  const loadAndCacheAgentData = async (userId: string): Promise<void> => {
    try {
      // First check cache
      const cachedAgent = getFromCache(CACHE_KEYS.AGENT_DATA);
      if (cachedAgent) {
        console.log("Using cached agent data", cachedAgent);
        return;
      }
      
      // First try to get from user_selected_agent table (new table)
      const { data: selectedAgentData, error: agentError } = await supabase
        .from('user_selected_agent')
        .select('nickname, ai_agents!selected_agent_id(*)')
        .eq('user_id', userId as unknown as string)
        .single();
        
      if (!agentError && selectedAgentData && selectedAgentData.ai_agents) {
        const agentData = {
          id: selectedAgentData.ai_agents.id || '',
          name: selectedAgentData.ai_agents.name || '',
          image: selectedAgentData.ai_agents.image || '',
          nickname: selectedAgentData.nickname
        };
        localStorage.setItem("selectedAgent", JSON.stringify(agentData));
        saveToCache(CACHE_KEYS.AGENT_DATA, agentData, CACHE_TTL.AGENT);
        return;
      }
      
      // Fallback to user_agent_selections table (legacy)
      const { data: legacyData, error: legacyError } = await supabase
        .from('user_agent_selections')
        .select('nickname, agents(*)')
        .eq('user_id', userId as unknown as string)
        .single();
        
      if (!legacyError && legacyData && legacyData.agents) {
        const agentData = {
          id: legacyData.agents.id || '',
          name: legacyData.agents.name || '',
          image: legacyData.agents.image || '',
          nickname: legacyData.nickname
        };
        localStorage.setItem("selectedAgent", JSON.stringify(agentData));
        saveToCache(CACHE_KEYS.AGENT_DATA, agentData, CACHE_TTL.AGENT);
        return;
      }
    } catch (error) {
      console.error("Error loading agent data:", error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      // Clear cached agent data on logout
      localStorage.removeItem("selectedAgent");
      // Clear all cache
      clearCache();
      navigate('/');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isAdmin = (): boolean => {
    // Check if currentUser exists and has the 'role' property set to 'admin'
    return currentUser?.app_metadata?.role === 'admin';
  };

  const value = {
    currentUser,
    session,
    signup,
    login,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
