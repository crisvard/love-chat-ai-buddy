
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star, ArrowUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getCurrentSubscription, createSubscriptionCheckout } from "@/services/subscription";
import { Json } from "@/integrations/supabase/types";

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
}

interface PlanIndicatorProps {
  currentPlanId: string;
  trialEndsAt?: Date | null;
}

const PlanIndicator: React.FC<PlanIndicatorProps> = ({ currentPlanId, trialEndsAt }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [availableUpgrades, setAvailableUpgrades] = useState<Plan[]>([]);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{planId: string, endDate: Date | null}>({
    planId: currentPlanId,
    endDate: trialEndsAt
  });
  const [loading, setLoading] = useState<string | null>(null);

  // Load plans from Supabase
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Get plans from Supabase
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true as unknown as boolean)
          .order('display_order', { ascending: true });
          
        if (error) throw error;
        
        if (data && Array.isArray(data)) {
          // Convert to expected format
          const plans = data.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price.toString(),
            features: Array.isArray(plan.features) 
              ? (plan.features as unknown as string[]).map(f => String(f)) 
              : []
          }));
          
          // Filter to only show plans that are more expensive than current plan
          const planOrder = ["free", "basic", "intermediate", "premium", "admin"];
          const currentPlanIndex = planOrder.indexOf(currentPlanId);
          
          const upgrades = plans.filter((plan: Plan) => 
            planOrder.indexOf(plan.id) > currentPlanIndex && plan.id !== 'admin'
          );
          
          setAvailableUpgrades(upgrades);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        
        // Fallback to localStorage
        const defaultPlans = [
          {
            id: "free",
            name: "Teste Grátis",
            price: "0",
            features: ["Mensagens de texto"]
          },
          {
            id: "basic",
            name: "Básico",
            price: "29.90",
            features: ["Mensagens de texto (sem limite)"]
          },
          {
            id: "intermediate",
            name: "Intermediário",
            price: "49.90",
            features: ["Mensagens de texto (sem limite)", "Áudio"]
          },
          {
            id: "premium",
            name: "Premium",
            price: "79.90",
            features: [
              "Mensagens de texto (sem limite)", 
              "Áudio", 
              "4 chamadas de voz por mês",
              "4 chamadas de vídeo por mês"
            ]
          }
        ];

        // Filter to only show plans that are more expensive than current plan
        const planOrder = ["free", "basic", "intermediate", "premium"];
        const currentPlanIndex = planOrder.indexOf(currentPlanId);
        
        const upgrades = defaultPlans.filter((plan: Plan) => 
          planOrder.indexOf(plan.id) > currentPlanIndex
        );
        
        setAvailableUpgrades(upgrades);
      }
    };
    
    fetchPlans();
    
    // Also fetch the current subscription to make sure we have the latest
    const fetchSubscription = async () => {
      const sub = await getCurrentSubscription();
      setSubscription(sub);
    };
    
    fetchSubscription();
  }, [currentPlanId]);

  // Calculate remaining time for trial plan
  useEffect(() => {
    if (subscription.planId === "free" && subscription.endDate) {
      const updateRemainingTime = () => {
        const now = new Date();
        const endDate = new Date(subscription.endDate as Date);
        
        if (now >= endDate) {
          setRemainingTime("Expirado");
          return;
        }
        
        const diffMs = endDate.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
          setRemainingTime(`${diffDays}d ${diffHours}h`);
        } else if (diffHours > 0) {
          setRemainingTime(`${diffHours}h ${diffMinutes}m`);
        } else {
          setRemainingTime(`${diffMinutes}m`);
        }
      };
      
      updateRemainingTime();
      const timer = setInterval(updateRemainingTime, 60000); // Update every minute
      
      return () => clearInterval(timer);
    }
  }, [subscription]);

  const handleUpgrade = async (planId: string) => {
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer upgrade.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(planId);
      
      // Para plano grátis, apenas atualizamos localmente
      if (planId === "free") {
        // Update user's subscription in Supabase
        const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days for free trial
        await setCurrentSubscription(planId, endDate, currentUser.id);

        toast({
          title: "Plano atualizado!",
          description: `Seu plano foi atualizado para ${planId}.`,
        });
        
        // Force reload to reflect changes
        window.location.reload();
      } else {
        // Criar checkout de assinatura para planos pagos
        const checkout = await createSubscriptionCheckout(planId);
        
        if (checkout && checkout.url) {
          // Abrir checkout em nova janela/aba
          window.open(checkout.url, '_blank');
        } else {
          throw new Error("Não foi possível criar a sessão de checkout");
        }
      }
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast({
        title: "Erro ao atualizar plano",
        description: "Ocorreu um erro ao atualizar seu plano. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  // Get current plan name for display
  const getPlanName = () => {
    const planMap: {[key: string]: string} = {
      "free": "Teste Grátis",
      "basic": "Básico",
      "intermediate": "Intermediário", 
      "premium": "Premium",
      "admin": "Administrador"
    };
    return planMap[subscription.planId] || "Desconhecido";
  };

  return (
    <div className="flex items-center mr-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="border-purple-300 flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{getPlanName()}</span>
            {remainingTime && (
              <Badge variant="outline" className="ml-1 text-xs">
                {remainingTime}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            <div className="font-medium">Seu plano: {getPlanName()}</div>
            {availableUpgrades.length > 0 ? (
              <>
                <p className="text-sm text-gray-500">Faça upgrade para ter acesso a mais recursos:</p>
                <div className="space-y-2">
                  {availableUpgrades.map((plan) => (
                    <div key={plan.id} className="border rounded p-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-gray-500">R${plan.price}/mês</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loading === plan.id}
                        >
                          {loading === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <ArrowUp className="h-4 w-4 mr-1" />
                          )}
                          Upgrade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Você já possui o plano mais alto disponível!
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PlanIndicator;
