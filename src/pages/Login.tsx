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
      
      // Lista de administradores conhecidos
      const knownAdminEmails = ['armempires@gmail.com', 'admin@example.com'];
      const isKnownAdmin = (email === 'armempires@gmail.com' && password === 'mudar123') || 
                           (email === 'admin' && password === 'admin');
      
      if (isKnownAdmin) {
        console.log("Detectadas credenciais administrativas");
        
        // Logout prévio para evitar conflitos
        await supabase.auth.signOut();
        
        // Determinar qual email usar para login real
        const loginEmail = email === 'admin' ? 'admin@example.com' : email;
        const loginPassword = email === 'admin' ? 'adminpassword' : password;
        
        // Efetuar login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });
        
        if (error) {
          console.error("Erro no login administrativo:", error);
          throw new Error("Falha na autenticação de administrador. Verifique suas credenciais.");
        }
        
        console.log("Login administrativo bem-sucedido:", data.user?.email);
        
        // Configurar plano administrativo se necessário
        if (data.user) {
          try {
            const { data: subsData, error: subsError } = await supabase
              .from('user_subscriptions')
              .select('*')
              .eq('user_id', data.user.id)
              .eq('plan_id', 'admin')
              .maybeSingle();
              
            if (subsError) {
              console.error("Erro ao verificar plano de administrador:", subsError);
            }
            
            if (!subsData) {
              console.log("Configurando plano de administrador");
              const { error: insertError } = await supabase
                .from('user_subscriptions')
                .upsert({
                  user_id: data.user.id,
                  plan_id: 'admin',
                  start_date: new Date().toISOString(),
                  end_date: null,
                  is_active: true
                });
                
              if (insertError) {
                console.error("Erro ao configurar plano de administrador:", insertError);
              }
            }
          } catch (err) {
            console.error("Erro ao verificar/configurar plano de administrador:", err);
          }
        }
        
        toast({
          title: "Login de Administrador",
          description: "Login administrativo realizado com sucesso!",
        });
        
        // Redirecionar para a página de administração
        navigate("/admin");
        return;
      }
      
      // Login normal para outros usuários
      console.log("Tentando login regular para:", email);
      const success = await login(email, password);
      
      if (success) {
        console.log("Login regular bem-sucedido");
        
        try {
          // Verificar se o usuário é admin para determinar redirecionamento
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data, error } = await supabase
              .from('user_subscriptions')
              .select('plan_id')
              .eq('user_id', session.user.id)
              .eq('plan_id', 'admin')
              .maybeSingle();
            
            if (!error && data) {
              console.log("Detectado usuário admin, redirecionando para /admin");
              navigate("/admin");
              return;
            }
          }
        } catch (err) {
          console.error("Erro ao verificar status de administrador:", err);
        }
        
        // Redirecionar usuário regular para o chat
        navigate("/chat");
      } else {
        throw new Error("Falha na autenticação. Verifique suas credenciais.");
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
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
