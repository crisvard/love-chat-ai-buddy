
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  message?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const state = location.state as LocationState;

  // If user is already logged in, redirect to appropriate page
  useEffect(() => {
    if (currentUser) {
      console.log("User already logged in:", currentUser);
      if (currentUser.role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/chat");
      }
    }
  }, [currentUser, navigate]);

  // Show success message if redirected from signup
  useEffect(() => {
    if (state?.message) {
      toast({
        title: "Sucesso",
        description: state.message,
      });
      // Clear the location state
      window.history.replaceState({}, document.title);
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Attempting login for: ${email}`);
      
      // Special admin login
      if (email === 'armempires@gmail.com' && password === 'mudar123') {
        console.log("Using special admin credentials");
        try {
          // Try first with direct credentials
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
          
          // If direct login fails, use the admin credentials
          if (error) {
            console.log("Direct login failed, trying with admin@example.com");
            const success = await login('admin@example.com', 'adminpassword');
            if (success) {
              console.log("Admin login successful via fallback");
              
              // Guarantee admin subscription
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                try {
                  const { error } = await supabase
                    .from('user_subscriptions')
                    .upsert({
                      user_id: user.id,
                      plan_id: 'admin',
                      start_date: new Date().toISOString(),
                      end_date: null,
                      is_active: true
                    }, { onConflict: 'user_id' });
                    
                  if (error) {
                    console.error("Error setting admin plan:", error);
                  }
                } catch (err) {
                  console.error("Error setting admin plan:", err);
                }
              }
              
              navigate("/admin");
              return;
            } else {
              throw new Error("Falha na autenticação de administrador");
            }
          } else {
            // Direct login succeeded, now ensure admin role
            console.log("Direct admin login successful");
            if (data.user) {
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
                  console.error("Error setting admin plan:", error);
                }
              } catch (err) {
                console.error("Error setting admin plan:", err);
              }
            }
            
            navigate("/admin");
            return;
          }
        } catch (error) {
          console.error("Admin login error:", error);
          throw error;
        }
      }
      
      // Special admin login for backward compatibility
      if (email === 'admin' && password === 'admin') {
        console.log("Trying special admin login");
        const success = await login('admin@example.com', 'adminpassword');
        if (success) {
          console.log("Admin login successful, redirecting to /admin");
          navigate("/admin");
          return;
        } else {
          console.log("Admin login failed despite correct credentials");
          throw new Error("Falha na autenticação de administrador");
        }
      }
      
      // Special user login for backward compatibility
      if (email === 'user' && password === 'user') {
        console.log("Trying special user login");
        const success = await login('user@example.com', 'userpassword');
        if (success) {
          console.log("User login successful, redirecting to /chat");
          navigate("/chat");
          return;
        } else {
          console.log("User login failed despite correct credentials");
          throw new Error("Falha na autenticação de usuário");
        }
      }
      
      // Regular login
      console.log(`Attempting regular login for: ${email}`);
      const success = await login(email, password);
      
      if (success) {
        console.log("Login successful");
        
        // Check if user is admin to determine redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', session.user.id)
            .eq('plan_id', 'admin')
            .single();
          
          if (!error && data) {
            console.log("Admin user detected, redirecting to /admin");
            navigate("/admin");
          } else {
            console.log("Regular user, redirecting to /chat");
            navigate("/chat");
          }
        } else {
          // Default to chat if can't determine
          navigate("/chat");
        }
      } else {
        console.log("Login failed with unknown reason");
        throw new Error("Falha na autenticação. Verifique suas credenciais.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Falha na autenticação. Verifique suas credenciais.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
          <CardDescription className="text-center">Entre com suas credenciais para acessar sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Senha</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Não tem uma conta?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto text-purple-600" 
              onClick={() => navigate("/signup")}
            >
              Criar conta
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
