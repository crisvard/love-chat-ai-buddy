
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";

interface User {
  email: string;
  name: string;
  role: 'user' | 'admin';
  id: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, userData: {
    name: string,
    country: string,
    terms_accepted: boolean,
    is_adult: boolean
  }) => Promise<boolean>;
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
  
  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) throw profileError;

            // Check if user is admin
            const { data: subscription, error: subError } = await supabase
              .from('user_subscriptions')
              .select('plan_id')
              .eq('user_id', session.user.id)
              .eq('plan_id', 'admin')
              .single();

            const isAdmin = !subError && subscription;
            
            setCurrentUser({
              id: session.user.id,
              email: profile.email,
              name: profile.name,
              role: isAdmin ? 'admin' : 'user'
            });
          } catch (error) {
            console.error("Error fetching user data:", error);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
    );
    
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Define a function to fetch user data
        const fetchUserData = async () => {
          try {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) throw profileError;

            // Check if user is admin
            const { data: subscription, error: subError } = await supabase
              .from('user_subscriptions')
              .select('plan_id')
              .eq('user_id', session.user.id)
              .eq('plan_id', 'admin')
              .single();

            const isAdmin = !subError && subscription;
            
            setCurrentUser({
              id: session.user.id,
              email: profile.email,
              name: profile.name,
              role: isAdmin ? 'admin' : 'user'
            });
          } catch (error) {
            console.error("Error fetching user data:", error);
            setCurrentUser(null);
          }
        };

        // Use setTimeout to avoid potential deadlock with onAuthStateChange
        setTimeout(fetchUserData, 0);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const signup = async (email: string, password: string, userData: {
    name: string,
    country: string,
    terms_accepted: boolean,
    is_adult: boolean
  }): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      // Create a free trial subscription for the new user
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 day trial
      
      // We need to get the user id first
      const { data: userData2 } = await supabase.auth.getUser();
      
      if (userData2?.user) {
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .upsert([{
            user_id: userData2.user.id,
            plan_id: 'free',
            start_date: new Date().toISOString(),
            end_date: trialEndDate.toISOString(),
            is_active: true
          }]);
          
        if (subError) {
          console.error("Error creating trial subscription:", subError);
        }
      }
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Faça login para continuar.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
