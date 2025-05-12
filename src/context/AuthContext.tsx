
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
      console.log("Verificando se usuário é admin (ID):", userId);
      
      // First check if user email is a known admin email
      const { data: userInfo } = await supabase.auth.getUser();
      
      if (userInfo?.user?.email) {
        console.log("Email do usuário:", userInfo.user.email);
        if (knownAdminEmails.includes(userInfo.user.email)) {
          console.log("Admin detectado via email conhecido:", userInfo.user.email);
          return true;
        }
      }
      
      // Then check subscription table
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('plan_id', 'admin')
        .maybeSingle();
      
      if (error) {
        console.error("Erro ao verificar assinatura admin:", error);
      }
      
      if (subscription) {
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
    
    const setupAuth = async () => {
      // Check for existing session first
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user) {
        const user = sessionData.session.user;
        console.log("Sessão existente encontrada para:", user.email);
        
        // Verificar imediatamente se é um email administrativo conhecido
        if (user.email && knownAdminEmails.includes(user.email)) {
          console.log("Admin existente detectado por email:", user.email);
          
          setCurrentUser({
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0] || 'Admin',
            role: 'admin'
          });
          
          // Configurar plano administrativo em segundo plano
          try {
            const { data: subsData, error } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .eq('plan_id', 'admin')
              .maybeSingle();
              
            if (!subsData && !error) {
              console.log("Configurando plano administrativo para usuário:", user.email);
              await supabase
                .from('user_subscriptions')
                .upsert({
                  user_id: user.id,
                  plan_id: 'admin',
                  start_date: new Date().toISOString(),
                  end_date: null,
                  is_active: true
                });
            }
          } catch (err) {
            console.error("Erro ao configurar plano administrativo:", err);
          }
        } else {
          // Para usuários normais, buscar perfil completo
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
            
            const isAdminUser = await checkIsAdmin(user.id);
            
            if (profile) {
              setCurrentUser({
                id: user.id,
                email: profile.email,
                name: profile.name,
                role: isAdminUser ? 'admin' : 'user'
              });
            } else {
              setCurrentUser({
                id: user.id,
                email: user.email || 'unknown',
                name: user.email?.split('@')[0] || 'User',
                role: isAdminUser ? 'admin' : 'user'
              });
            }
          } catch (error) {
            console.error("Erro ao buscar perfil do usuário:", error);
          }
        }
      }
    };
    
    setupAuth();
    
    // Set up subscription for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        
        if (session?.user) {
          try {
            const user = session.user;
            console.log("User authenticated:", user.email);
            
            // Verificar imediatamente se é um email administrativo conhecido
            if (user.email && knownAdminEmails.includes(user.email)) {
              console.log("Admin detectado por email conhecido:", user.email);
              
              // Configurar usuário como admin imediatamente
              setCurrentUser({
                id: user.id,
                email: user.email,
                name: user.email.split('@')[0] || 'Admin',
                role: 'admin'
              });
              
              // Verificar/configurar plano administrativo
              const { data: subsData, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('plan_id', 'admin')
                .maybeSingle();
                
              if (!subsData && !error) {
                console.log("Configurando plano administrativo para usuário:", user.email);
                await supabase
                  .from('user_subscriptions')
                  .upsert({
                    user_id: user.id,
                    plan_id: 'admin',
                    start_date: new Date().toISOString(),
                    end_date: null,
                    is_active: true
                  });
              }
            } else {
              // Para usuários normais
              try {
                // Fetch user profile
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', user.id)
                  .maybeSingle();
    
                // Check if user is admin
                const isAdminUser = await checkIsAdmin(user.id);
                
                if (profile) {
                  setCurrentUser({
                    id: user.id,
                    email: profile.email,
                    name: profile.name,
                    role: isAdminUser ? 'admin' : 'user'
                  });
                } else {
                  setCurrentUser({
                    id: user.id,
                    email: user.email || 'unknown',
                    name: user.email?.split('@')[0] || 'User',
                    role: isAdminUser ? 'admin' : 'user'
                  });
                }
              } catch (error) {
                console.error("Error in auth state change handler:", error);
              }
            }
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
      if (data.user && knownAdminEmails.includes(email)) {
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
            });
            
          if (error) {
            console.error("Erro ao configurar plano admin:", error);
          }
        } catch (err) {
          console.error("Erro ao configurar plano admin:", err);
        }
        
        // Definir usuário como admin imediatamente para evitar redirecionamentos incorretos
        setCurrentUser({
          id: data.user.id,
          email: data.user.email || email,
          name: email.split('@')[0] || 'Admin',
          role: 'admin'
        });
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
    if (!currentUser) return false;
    
    return currentUser.role === 'admin' || 
           (currentUser.email && knownAdminEmails.includes(currentUser.email));
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
