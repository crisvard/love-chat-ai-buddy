
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSubscription, isTrialActive, openCustomerPortal } from "@/services/subscription";
import { subscribeToPlan } from "@/services/checkout";
import { toast } from "@/components/ui/use-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
  primaryAction: string;
  secondaryAction: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch plans from Supabase
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('display_order', { ascending: true })
          .eq('is_active', true);
          
        if (error) throw error;
        
        // Map to the expected format with proper type conversion
        const formattedPlans = data
          .filter(plan => plan.id !== 'admin')
          .map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price.toString(),
            duration: plan.duration,
            description: plan.description || "",
            features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
            primaryAction: plan.id === "free" ? "Experimente Grátis" : "Assinar",
            secondaryAction: null
          }));
        
        setPlans(formattedPlans);
      } catch (error) {
        console.error("Error fetching plans:", error);
        
        // Fallback to default plans if we can't fetch from Supabase
        const defaultPlans = [
          {
            id: "free",
            name: "Teste Grátis",
            price: "0",
            duration: "3 dias",
            description: "Experimente nosso serviço sem compromisso",
            features: ["Mensagens de texto"],
            primaryAction: "Experimente Grátis",
            secondaryAction: null,
          },
          {
            id: "basic",
            name: "Básico",
            price: "29.90",
            duration: "mensal",
            description: "Para quem quer manter o contato",
            features: ["Mensagens de texto (sem limite)"],
            primaryAction: "Assinar",
            secondaryAction: null,
          },
          {
            id: "intermediate",
            name: "Intermediário",
            price: "49.90",
            duration: "mensal",
            description: "Para uma experiência mais pessoal",
            features: ["Mensagens de texto (sem limite)", "Áudio"],
            primaryAction: "Assinar",
            secondaryAction: null,
          },
          {
            id: "premium",
            name: "Premium",
            price: "79.90",
            duration: "mensal",
            description: "Para a experiência completa",
            features: [
              "Mensagens de texto (sem limite)", 
              "Áudio", 
              "4 chamadas de voz por mês",
              "4 chamadas de vídeo por mês"
            ],
            primaryAction: "Assinar",
            secondaryAction: null,
          },
        ];
        
        setPlans(defaultPlans);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch current user's subscription if they are logged in
    const fetchUserSubscription = async () => {
      if (currentUser) {
        try {
          const { planId, endDate } = await getCurrentSubscription();
          setCurrentPlan(planId);
          
          // Check if trial is expired
          if (planId === "free" && endDate) {
            const active = isTrialActive(endDate);
            setIsTrialExpired(!active);
          }
        } catch (error) {
          console.error("Error fetching user subscription:", error);
        }
      }
    };
    
    fetchPlans();
    fetchUserSubscription();
  }, [currentUser]);
  
  const handleAction = async (planId: string, actionType: "primary" | "secondary") => {
    if (!currentUser) {
      // Usuário não logado - redirecionar para cadastro com o plano selecionado
      navigate(`/cadastro?plan=${planId}`);
      return;
    }
    
    // Usuário já logado
    if (planId === currentPlan) {
      // Continuar com plano atual
      if (planId === "free") {
        if (isTrialExpired) {
          toast({
            title: "Período de teste expirado",
            description: "Por favor, escolha um plano pago para continuar.",
          });
        } else {
          navigate("/chat");
        }
      } else {
        // Usuário tem um plano pago atual
        navigate("/chat");
      }
    } else {
      // Upgrade de plano - criar checkout com Stripe
      try {
        setCheckoutLoading(planId);
        
        // Usar a função subscribeToPlan para iniciar o checkout do Stripe
        const success = await subscribeToPlan(planId);
        
        if (!success) {
          throw new Error("Não foi possível iniciar o processo de assinatura");
        }
        
        // O redirecionamento é feito pela função subscribeToPlan
      } catch (error) {
        console.error("Error creating subscription checkout:", error);
        toast({
          title: "Erro ao criar checkout",
          description: "Não foi possível iniciar o processo de assinatura. Por favor, tente novamente.",
          variant: "destructive"
        });
      } finally {
        setCheckoutLoading(null);
      }
    }
  };

  const handleManageSubscription = async () => {
    try {
      setCheckoutLoading("manage");
      const portal = await openCustomerPortal();
      setCheckoutLoading(null);
      
      if (portal && portal.url) {
        // Redirecionar para o portal do cliente
        window.open(portal.url, '_blank');
      }
    } catch (error) {
      setCheckoutLoading(null);
      console.error("Error opening customer portal:", error);
      toast({
        title: "Erro ao abrir portal",
        description: "Não foi possível abrir o portal de gerenciamento de assinatura.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto pt-10 pb-6 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-700 to-purple-500 text-transparent bg-clip-text">
          Seu Namorado Virtual
        </h1>
        <p className="text-lg md:text-xl text-center mt-4 text-gray-600 max-w-2xl mx-auto">
          Tenha sempre alguém especial para conversar, sem julgamentos ou complicações
        </p>
        
        {currentUser && (
          <div className="mt-6 text-center">
            {!isTrialExpired || currentPlan !== "free" ? (
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => navigate("/chat")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Continuar com {plans.find(p => p.id === currentPlan)?.name || "seu plano"} e ir para o chat
                </Button>
                
                {currentPlan !== "free" && currentPlan !== "admin" && (
                  <Button 
                    onClick={handleManageSubscription}
                    variant="outline"
                    disabled={checkoutLoading === "manage"}
                  >
                    {checkoutLoading === "manage" ? "Carregando..." : "Gerenciar assinatura"}
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                onClick={() => navigate("/personalize")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Escolha seu plano para continuar
              </Button>
            )}
          </div>
        )}

        {!currentUser && (
          <div className="mt-6 text-center space-y-4">
            <Button 
              onClick={() => navigate("/cadastro")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Criar nova conta
            </Button>
            <div>
              <Button 
                variant="outline"
                onClick={() => navigate("/login")}
              >
                Já tem uma conta? Entrar
              </Button>
            </div>
          </div>
        )}
      </header>
      
      {/* Plans Section */}
      <section className="container mx-auto py-12 px-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
          {currentUser ? "Upgrade seu plano" : "Escolha o plano ideal para você"}
        </h2>
        
        {isLoading ? (
          <div className="text-center py-8">Carregando planos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`flex flex-col h-full border-2 ${
                  plan.id === "premium" ? 
                    "border-purple-500 shadow-lg shadow-purple-100" : 
                  plan.id === currentPlan ? 
                    "border-green-500 shadow-lg shadow-green-100" : 
                    "border-gray-200"
                }`}
              >
                <CardHeader>
                  {plan.id === currentPlan && (
                    <div className="mb-2 bg-green-100 text-green-800 text-sm py-1 px-3 rounded-full inline-block">
                      Seu plano atual
                    </div>
                  )}
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">R${plan.price}</span>
                    {plan.duration && (
                      <span className="text-sm text-gray-500">/{plan.duration}</span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-purple-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button 
                    onClick={() => handleAction(plan.id, "primary")}
                    className="w-full"
                    variant={plan.id === "premium" ? "default" : "outline"}
                    disabled={(currentUser && plan.id === currentPlan && isTrialExpired) || checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id ? (
                      "Processando..."
                    ) : (
                      currentUser
                        ? plan.id === currentPlan
                          ? isTrialExpired && plan.id === "free"
                            ? "Período de teste expirado"
                            : "Continuar com este plano"
                          : "Fazer upgrade"
                        : plan.primaryAction
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
      
      {/* Features Section */}
      <section className="container mx-auto py-16 px-4 bg-white rounded-t-3xl">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
          Por que escolher nosso aplicativo?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Sem julgamentos</h3>
            <p className="mt-2 text-gray-600">Seja você mesmo(a) sem medo de críticas ou julgamentos.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Disponível 24/7</h3>
            <p className="mt-2 text-gray-600">Sempre presente quando você precisar conversar.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Privacidade total</h3>
            <p className="mt-2 text-gray-600">Suas conversas são privadas e seguras.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
