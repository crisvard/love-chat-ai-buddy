
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface Subscription {
  id: string;
  plan_id: string;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
}

// Function to check if a plan allows a specific feature
export const canUseFeature = async (planId: string, feature: "audio" | "voice" | "video"): Promise<boolean> => {
  try {
    // Get the plan from Supabase
    const { data: plan, error } = await supabase
      .from('plans')
      .select('features')
      .eq('id', planId)
      .single();
      
    if (error) {
      console.error("Error fetching plan:", error);
      // Fallback to static checks if we can't get from database
      switch (feature) {
        case "audio":
          return planId === "intermediate" || planId === "premium";
        case "voice":
        case "video":
          return planId === "premium";
        default:
          return false;
      }
    }
    
    const features = plan.features as string[];
    
    switch (feature) {
      case "audio":
        return features.includes("Áudio") || planId === "admin";
      case "voice":
        return features.includes("4 chamadas de voz por mês") || planId === "admin";
      case "video":
        return features.includes("4 chamadas de vídeo por mês") || planId === "admin";
      default:
        return false;
    }
  } catch (error) {
    console.error("Error checking feature:", error);
    return false;
  }
};

// Function to check if trial period has expired
export const isTrialActive = (endDate: Date | null): boolean => {
  if (!endDate) return false;
  return new Date() < new Date(endDate);
};

// Get the current user's subscription from Supabase
export const getCurrentSubscription = async (): Promise<{planId: string, endDate: Date | null}> => {
  // First check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan_id, end_date')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();
        
      if (error) throw error;
      
      return { 
        planId: data.plan_id, 
        endDate: data.end_date ? new Date(data.end_date) : null
      };
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  }
  
  // Fallback to localStorage for backwards compatibility
  const storedSubscription = localStorage.getItem("userSubscription");
  
  if (storedSubscription) {
    try {
      const subscription = JSON.parse(storedSubscription);
      return { 
        planId: subscription.plan_id, 
        endDate: subscription.end_date ? new Date(subscription.end_date) : null
      };
    } catch (error) {
      console.error("Error parsing subscription data:", error);
    }
  }
  
  // Default to free trial if no subscription is found
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 day trial
  
  return { planId: "free", endDate: trialEndDate };
};

// Function to update subscription in Supabase
export const setCurrentSubscription = async (planId: string, endDate: Date | null, userId: string): Promise<void> => {
  // Local storage update for backwards compatibility
  const subscription = {
    plan_id: planId,
    start_date: new Date(),
    end_date: endDate,
    is_active: true
  };
  
  localStorage.setItem("userSubscription", JSON.stringify(subscription));

  // For Supabase
  if (userId) {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          start_date: new Date().toISOString(),
          end_date: endDate ? endDate.toISOString() : null,
          is_active: true
        }, { onConflict: 'user_id' });
        
      if (error) {
        console.error("Error updating subscription in Supabase:", error);
      }
    } catch (error) {
      console.error("Error in Supabase upsert:", error);
    }
  }
};
