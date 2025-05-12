
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
  
  // Lista de emails de administradores conhecidos
  const knownAdminEmails = ["armempires@gmail.com", "admin@example.com"];
  
  // Function to check if user is admin
  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      // First check if user email is a known admin email
      const { data: userInfo } = await supabase.auth.getUser();
      
      if (userInfo?.user?.email && knownAdminEmails.includes(userInfo.user.email)) {
        console.log("Admin detectado via email:", userInfo.user.email);
        return true;
      }
      
      // Then check subscription table
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('plan_id', 'admin')
        .maybeSingle();
      
      if (!error && subscription) {
        console.log("Admin detectado via tabela de assinaturas");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao verificar status de admin:", error);
      return false;
    }
  };
  
  // Set up auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        if (session?.user) {
          try {
            console.log("User authenticated:", session.user.email);
            
            // Verificar imediatamente se é um email administrativo conhecido
            const isAdminEmail = knownAdminEmails.includes(session.user.email || '');
            if (isAdminEmail) {
              console.log("Admin detectado por email conhecido:", session.user.email);
              
              // Configurar usuário como admin imediatamente
              setCurrentUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'Admin',
                role: 'admin'
              });
              
              // Verificar/configurar plano administrativo em segundo plano
              setTimeout(async () => {
                try {
                  const { data: subsData, error: subsError } = await supabase
                    .from('user_subscriptions')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('plan_id', 'admin')
                    .maybeSingle();
                    
                  if (!subsData && !subsError) {
                    console.log("Configurando plano administrativo para usuário:", session.user.email);
                    await supabase
                      .from('user_subscriptions')
                      .upsert({
                        user_id: session.user.id,
                        plan_id: 'admin',
                        start_date: new Date().toISOString(),
                        end_date: null,
                        is_active: true
                      });
                  }
                } catch (err) {
                  console.error("Erro ao configurar plano administrativo:", err);
                }
              }, 0);
              
              return;
            }
            
            // Define a function to fetch user data
            const fetchUserData = async () => {
              try {
                // Fetch user profile
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
    
                if (profileError) {
                  console.error("Error fetching profile:", profileError);
                  throw profileError;
                }
    
                console.log("Profile fetched:", profile);
    
                // Check if user is admin
                const isAdminUser = await checkIsAdmin(session.user.id);
                console.log("Is admin check:", isAdminUser ? "Yes" : "No");
                
                setCurrentUser({
                  id: session.user.id,
                  email: profile?.email || session.user.email || '',
                  name: profile?.name || session.user.email?.split('@')[0] || 'User',
                  role: isAdminUser ? 'admin' : 'user'
                });
              } catch (error: any) {
                console.error("Error in fetchUserData:", error);
                
                // Check if user is admin even if profile fetch fails
                const isAdminUser = await checkIsAdmin(session.user.id);
                
                // If there's an error fetching the profile, set a basic user object
                setCurrentUser({
                  id: session.user.id,
                  email: session.user.email || 'unknown',
                  name: session.user.email?.split('@')[0] || 'User',
                  role: isAdminUser ? 'admin' : 'user'
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        console.log("Existing session found for:", session.user.email);
        
        // Verificar imediatamente se é um email administrativo conhecido
        const isAdminEmail = knownAdminEmails.includes(session.user.email || '');
        if (isAdminEmail) {
          console.log("Admin existente detectado por email:", session.user.email);
          
          // Configurar usuário como admin imediatamente
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'Admin',
            role: 'admin'
          });
          
          return;
        }
        
        try {
          // Fetch profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          // Check admin status
          const isAdminUser = await checkIsAdmin(session.user.id);
          
          if (profileError || !profile) {
            console.error("Error fetching profile:", profileError);
            setCurrentUser({
              id: session.user.id,
              email: session.user.email || 'unknown',
              name: session.user.email?.split('@')[0] || 'User',
              role: isAdminUser ? 'admin' : 'user'
            });
          } else {
            setCurrentUser({
              id: session.user.id,
              email: profile.email,
              name: profile.name,
              role: isAdminUser ? 'admin' : 'user'
            });
          }
        } catch (error) {
          console.error("Error setting up existing session:", error);
        }
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
        console.error("Erro no login:", error);
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      
      console.log("Login bem-sucedido:", data);
      
      // Verificar se é um email de administrador conhecido
      if (knownAdminEmails.includes(email)) {
        console.log("Configurando plano admin para usuário admin");
        try {
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: data.user.id,
              plan_id: 'admin',
              start_date: new Date().toISOString(),
              end_date: null,
              is_active: true
            }, { onConflict: 'user_id' });
            
          if (error) {
            console.error("Erro ao configurar plano admin:", error);
          }
        } catch (err) {
          console.error("Erro ao configurar plano admin:", err);
        }
      }
      
      return true;
    } catch (error: any) {
      console.error("Exceção durante login:", error);
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
    console.log("Verificando se usuário é admin:", currentUser?.role);
    
    // Liste explicitamente todos os emails de admin conhecidos
    const adminEmails = ["armempires@gmail.com", "admin@example.com"];
    
    return currentUser?.role === 'admin' || 
           (currentUser?.email && adminEmails.includes(currentUser.email));
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
