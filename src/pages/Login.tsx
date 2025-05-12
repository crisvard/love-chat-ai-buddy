
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

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

  // If user is already logged in, redirect to chat page
  useEffect(() => {
    if (currentUser) {
      navigate("/chat");
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
      // Special admin login for backward compatibility
      if (email === 'admin' && password === 'admin') {
        const success = await login('admin@example.com', 'adminpassword');
        if (success) {
          navigate("/admin");
        }
        return;
      }
      
      // Special user login for backward compatibility
      if (email === 'user' && password === 'user') {
        const success = await login('user@example.com', 'userpassword');
        if (success) {
          navigate("/chat");
        }
        return;
      }
      
      const success = await login(email, password);
      
      if (success) {
        // Redirect to appropriate page
        navigate("/chat");
      }
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
