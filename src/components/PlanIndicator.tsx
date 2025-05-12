
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Star, Lock, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

  // Load plans from localStorage (same as in Index.tsx)
  useEffect(() => {
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

    const savedPlans = localStorage.getItem("plans");
    const plans = savedPlans ? JSON.parse(savedPlans) : defaultPlans;
    
    // Filter to only show plans that are more expensive than current plan
    const planOrder = ["free", "basic", "intermediate", "premium"];
    const currentPlanIndex = planOrder.indexOf(currentPlanId);
    
    const upgrades = plans.filter((plan: Plan) => 
      planOrder.indexOf(plan.id) > currentPlanIndex
    );
    
    setAvailableUpgrades(upgrades);
  }, [currentPlanId]);

  // Calculate remaining time for trial plan
  useEffect(() => {
    if (currentPlanId === "free" && trialEndsAt) {
      const updateRemainingTime = () => {
        const now = new Date();
        const endDate = new Date(trialEndsAt);
        
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
  }, [currentPlanId, trialEndsAt]);

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
      // Update user's subscription in Supabase
      // In a real app, this would connect to a payment processor
      const endDate = planId === "free" ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null; // 3 days for free trial
      
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: currentUser.email, // Using email as user_id for demo
          plan_id: planId,
          start_date: new Date(),
          end_date: endDate,
          is_active: true
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Plano atualizado!",
        description: `Seu plano foi atualizado para ${planId}.`,
      });
      
      // Force reload to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error upgrading plan:", error);
      toast({
        title: "Erro ao atualizar plano",
        description: "Ocorreu um erro ao atualizar seu plano. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Get current plan name for display
  const getPlanName = () => {
    const planMap: {[key: string]: string} = {
      "free": "Teste Grátis",
      "basic": "Básico",
      "intermediate": "Intermediário", 
      "premium": "Premium"
    };
    return planMap[currentPlanId] || "Desconhecido";
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
                        <Button size="sm" onClick={() => handleUpgrade(plan.id)}>
                          <ArrowUp className="h-4 w-4 mr-1" /> Upgrade
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
