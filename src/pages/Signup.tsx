
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPlan } from "@/services/checkout";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, currentUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "free";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);

  // Se o usuário já estiver logado, redirecionar para a página de chat
  useEffect(() => {
    if (currentUser) {
      navigate("/chat");
    }
  }, [currentUser, navigate]);

  // Buscar detalhes do plano do Supabase
  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('id', selectedPlan)
          .single();
          
        if (error) throw error;
        setPlanInfo(data);
      } catch (error) {
        console.error("Error fetching plan details:", error);
        // Fallback to a default plan info
        setPlanInfo({
          id: selectedPlan,
          name: selectedPlan === "free" ? "Teste Grátis" : selectedPlan,
          price: "0",
          duration: selectedPlan === "free" ? "3 dias" : "mensal"
        });
      }
    };
    
    fetchPlanDetails();
  }, [selectedPlan]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome.",
      });
      return;
    }
    
    if (email !== emailConfirm) {
      toast({
        variant: "destructive",
        title: "Emails não conferem",
        description: "Os emails informados não são iguais.",
      });
      return;
    }
    
    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "As senhas informadas não são iguais.",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    
    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: "Termos de uso",
        description: "Você precisa aceitar os termos de uso para continuar.",
      });
      return;
    }
    
    if (!isAdult) {
      toast({
        variant: "destructive",
        title: "Confirmação de idade",
        description: "Você precisa confirmar que é maior de 18 anos para continuar.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await signup(email, password, {
        name,
        country,
        terms_accepted: termsAccepted,
        is_adult: isAdult
      });
      
      if (success) {
        // Após o cadastro bem-sucedido, fazemos login automaticamente
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          console.error("Erro ao fazer login automático:", error);
          toast({
            title: "Conta criada com sucesso!",
            description: "Por favor, faça login para continuar.",
          });
          navigate("/login");
          return;
        }
        
        // Se o plano selecionado não é o gratuito, redireciona para checkout do Stripe
        if (selectedPlan !== "free") {
          toast({
            title: "Conta criada com sucesso!",
            description: "Você será redirecionado para o checkout do plano selecionado.",
          });
          
          const success = await subscribeToPlan(selectedPlan);
          if (!success) {
            // Se falhar o checkout, ainda redireciona para o chat com plano gratuito
            navigate("/chat");
          }
          // O redirecionamento para o Stripe é feito pela função subscribeToPlan
        } else {
          // Para plano gratuito, redireciona direto para o chat
          toast({
            title: "Conta criada com sucesso!",
            description: "Você será direcionado para o chat.",
          });
          navigate("/chat");
        }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center">
            {planInfo ? (
              <>Plano selecionado: <strong>{planInfo.name}</strong> - R${planInfo.price}/{planInfo.duration}</>
            ) : (
              <>Carregando detalhes do plano...</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Nome</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="emailConfirm" className="text-sm font-medium">Confirme seu Email</label>
              <Input
                id="emailConfirm"
                type="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
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
            
            <div className="space-y-2">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">Confirme sua Senha</label>
              <Input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium">País</label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isAdult" 
                  checked={isAdult} 
                  onCheckedChange={(checked) => setIsAdult(checked === true)}
                />
                <label htmlFor="isAdult" className="text-sm font-medium">
                  Confirmo que sou maior de 18 anos
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="termsAccepted" 
                  checked={termsAccepted} 
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <label htmlFor="termsAccepted" className="text-sm font-medium">
                  Aceito os <a href="/terms" className="text-purple-600 hover:underline">termos de uso</a>
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Já tem uma conta?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto text-purple-600" 
              onClick={() => navigate("/login")}
            >
              Faça login
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
