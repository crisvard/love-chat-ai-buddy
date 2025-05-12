
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

// Schema para validação do formulário
const signupSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  country: z.string().min(1, { message: "Selecione um país" }),
});

// Tipo inferido do schema
type SignupValues = z.infer<typeof signupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedPlan = searchParams.get("plan");
  
  const [isLoading, setIsLoading] = useState(false);

  // Configuração do formulário com react-hook-form e zod
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      country: "",
    },
  });

  // Lista de países (simplificada)
  const countries = [
    { value: "br", label: "Brasil" },
    { value: "us", label: "Estados Unidos" },
    { value: "pt", label: "Portugal" },
    { value: "es", label: "Espanha" },
    { value: "ar", label: "Argentina" },
    { value: "cl", label: "Chile" },
    { value: "co", label: "Colômbia" },
    { value: "mx", label: "México" },
    { value: "pe", label: "Peru" },
    { value: "uy", label: "Uruguai" },
  ];

  const onSubmit = async (data: SignupValues) => {
    setIsLoading(true);
    
    try {
      // Aqui viria a lógica de cadastro com Firebase
      console.log("Dados do cadastro:", data, "Plano:", selectedPlan);
      
      // Simulando um delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Redirecionando para personalização do seu agente...",
      });
      
      // Redirecionar para a página de personalização
      setTimeout(() => {
        navigate("/personalize");
      }, 1000);
      
    } catch (error) {
      console.error("Erro no cadastro:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: "Ocorreu um erro ao tentar criar sua conta. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsLoading(true);
    
    try {
      // Aqui viria a lógica de login social com Firebase
      console.log(`Login com ${provider}`, "Plano:", selectedPlan);
      
      // Simulando um delay de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: `Login com ${provider} realizado!`,
        description: "Redirecionando para personalização do seu agente...",
      });
      
      // Redirecionar para a página de personalização
      setTimeout(() => {
        navigate("/personalize");
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">Criar Conta</h1>
          <p className="text-gray-600">
            {selectedPlan ? `Plano selecionado: ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}` : "Teste Grátis por 3 dias"}
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

        {/* Formulário de cadastro */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu país" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Criar conta"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem uma conta?{" "}
            <Button 
              variant="link" 
              className="p-0" 
              onClick={() => navigate("/login")}
              disabled={isLoading}
            >
              Faça login
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
