
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPlan } from "@/services/checkout";
import { useAuth } from "@/context/AuthContext";

const Cadastro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("free"); // Default to free plan

  // Parse the plan ID from the URL query parameter
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const planParam = queryParams.get("plan");
    if (planParam) {
      console.log("Plano selecionado da URL:", planParam);
      setSelectedPlan(planParam);
    }
  }, [location]);

  useEffect(() => {
    // If user is already logged in, redirect to chat
    if (currentUser) {
      navigate("/chat");
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validações básicas
    if (!email || !password || !confirmPassword || !name) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    if (!acceptTerms || !isAdult) {
      toast({
        variant: "destructive",
        title: "Termos não aceitos",
        description: "Você precisa aceitar os termos e confirmar que é maior de idade.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Cadastrar o usuário no Supabase
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            terms_accepted: acceptTerms,
            is_adult: isAdult,
          },
        },
      });

      if (signupError) throw signupError;

      // Se o cadastro foi bem-sucedido
      toast({
        title: "Conta criada com sucesso!",
        description: "Sua conta foi criada e você foi autenticado.",
      });

      // Se um plano diferente de "free" foi selecionado, redirecionar para o checkout do Stripe
      if (selectedPlan && selectedPlan !== "free") {
        console.log("Iniciando checkout para plano após cadastro:", selectedPlan);
        const success = await subscribeToPlan(selectedPlan);
        
        if (!success) {
          // Se houver um erro no checkout, ainda assim redirecionamos para o chat
          // mas com uma mensagem de erro
          toast({
            variant: "destructive",
            title: "Erro no checkout",
            description: "Não foi possível iniciar o checkout. Você pode tentar novamente mais tarde.",
          });
          navigate("/chat");
        }
        // O redirecionamento para o Stripe é feito pela função subscribeToPlan
      } else {
        // Se for plano gratuito ou nenhum plano selecionado, redirecionar para o chat
        navigate("/chat");
      }
    } catch (error) {
      console.error("Erro durante signup:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Crie sua conta</CardTitle>
          <CardDescription>
            {selectedPlan && selectedPlan !== "free" 
              ? `Você selecionou o plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}` 
              : "Complete o cadastro para começar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Seu nome" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme sua senha</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="********" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Aceito os termos e condições
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="adult" 
                  checked={isAdult}
                  onCheckedChange={(checked) => setIsAdult(checked === true)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="adult"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirmo que sou maior de 18 anos
                </label>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Processando..." : "Criar conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={() => navigate("/login")}>
            Já tem uma conta? Entrar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Cadastro;
