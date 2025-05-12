
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
    console.log("Setting up auth state listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        if (session?.user) {
          try {
            console.log("User authenticated:", session.user.email);
            
            // Define a function to fetch user data
            const fetchUserData = async () => {
              try {
                // Fetch user profile
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
    
                if (profileError) {
                  console.error("Error fetching profile:", profileError);
                  throw profileError;
                }
    
                console.log("Profile fetched:", profile);
    
                // Check if user is admin
                const { data: subscription, error: subError } = await supabase
                  .from('user_subscriptions')
                  .select('plan_id')
                  .eq('user_id', session.user.id)
                  .eq('plan_id', 'admin')
                  .single();
    
                const isAdmin = !subError && subscription;
                console.log("Is admin check:", isAdmin ? "Yes" : "No", subError ? `(Error: ${subError.message})` : "");
                
                setCurrentUser({
                  id: session.user.id,
                  email: profile.email,
                  name: profile.name,
                  role: isAdmin ? 'admin' : 'user'
                });
              } catch (error: any) {
                console.error("Error in fetchUserData:", error);
                // If there's an error fetching the profile, set a basic user object
                setCurrentUser({
                  id: session.user.id,
                  email: session.user.email || 'unknown',
                  name: session.user.email?.split('@')[0] || 'User',
                  role: 'user' // Default to user role
                });
              }
            };

            // Use setTimeout to avoid potential deadlock with onAuthStateChange
            setTimeout(fetchUserData, 0);
          } catch (error) {
            console.error("Error in auth state change handler:", error);
            setCurrentUser(null);
          }
        } else {
          console.log("No session, setting currentUser to null");
          setCurrentUser(null);
        }
      }
    );
    
    // Check for existing session
    console.log("Checking for existing session");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("Existing session found for:", session.user.email);
      } else {
        console.log("No existing session found");
      }
    });
    
    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`Attempting login for: ${email}`);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Login error:", error);
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      console.log("Login successful:", data);
      return true;
    } catch (error: any) {
      console.error("Exception during login:", error);
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
    console.log("Signup attempt:", email);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        toast({
          title: "Erro ao criar conta",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      console.log("Signup successful");
      
      // Create a free trial subscription for the new user
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 day trial
      
      // We need to get the user id first
      const { data: userData2 } = await supabase.auth.getUser();
      
      if (userData2?.user) {
        console.log("Creating trial subscription for new user:", userData2.user.id);
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
      console.error("Exception during signup:", error);
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
      console.log("Logging out");
      await supabase.auth.signOut();
      setCurrentUser(null);
      console.log("Logout successful");
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
