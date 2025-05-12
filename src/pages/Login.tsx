import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";

// Schema para validação do formulário
const loginSchema = z.object({
  email: z.string().min(1, { message: "Email é obrigatório" }),
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

// Tipo inferido do schema
type LoginValues = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Configuração do formulário com react-hook-form e zod
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginValues) => {
    setIsLoading(true);
    
    try {
      const success = await login(data.email, data.password);
      
      if (success) {
        // Special handling for admin login
        if (data.email === 'admin' && data.password === 'admin') {
          toast({
            title: "Admin login realizado com sucesso!",
            description: "Redirecionando para o painel administrativo...",
          });
          
          setTimeout(() => {
            navigate("/admin");
          }, 1000);
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: "Redirecionando para o chat...",
          });
          
          setTimeout(() => {
            navigate("/chat");
          }, 1000);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos. Tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: "Email ou senha incorretos. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsLoading(true);
    
    try {
      // Aqui viria a lógica de login social com Firebase
      console.log(`Login com ${provider}`);
      
      // Simulando um delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: `Login com ${provider} realizado!`,
        description: "Redirecionando para o chat...",
      });
      
      // Redirecionar para o chat
      setTimeout(() => {
        navigate("/chat");
      }, 1000);
    } catch (error) {
      console.error(`Erro no login com ${provider}:`, error);
      toast({
        variant: "destructive",
        title: `Erro no login com ${provider}`,
        description: "Não foi possível fazer login. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700">Entrar</h1>
          <p className="text-gray-600 mt-2">Entre para conversar com seu namorado virtual</p>
          <p className="text-sm text-gray-500 mt-1">
            (Use "admin" como usuário e senha para acessar o painel administrativo)
          </p>
        </div>

        {/* Botões de login social */}
        <div className="flex flex-col space-y-3 mb-6">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Continuar com Google
          </Button>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={() => handleSocialLogin("apple")}
            disabled={isLoading}
          >
            <FaApple className="mr-2 h-5 w-5" />
            Continuar com Apple
          </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>

        {/* Formulário de login */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email ou Usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com ou admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                  <Button variant="link" className="p-0 h-auto text-sm" onClick={() => console.log("Esqueceu a senha")}>
                    Esqueceu a senha?
                  </Button>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Entrar"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Não tem uma conta?{" "}
            <Button 
              variant="link" 
              className="p-0" 
              onClick={() => navigate("/signup")}
              disabled={isLoading}
            >
              Cadastre-se
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
