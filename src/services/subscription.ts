
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
    console.log(`Checking if plan ${planId} allows feature ${feature}`);
    
    // Admin sempre tem acesso a todas as features
    if (planId === "admin") {
      return true;
    }
    
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
    console.log(`Plan features for ${planId}:`, features);
    
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
  const isActive = new Date() < new Date(endDate);
  console.log(`Trial active check: ${isActive}`, endDate);
  return isActive;
};

// Get the current user's subscription from Supabase
export const getCurrentSubscription = async (): Promise<{planId: string, endDate: Date | null}> => {
  console.log("Getting current subscription");
  // First check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    try {
      console.log("User session found:", session.user.id);
      
      // Verificar se o usuário é admin através da função is_admin()
      const { data: isAdminData, error: isAdminError } = await supabase
        .rpc('is_admin');
        
      if (!isAdminError && isAdminData === true) {
        console.log("User is admin via is_admin() function");
        return { planId: "admin", endDate: null };
      }
      
      // Se não for admin, verificar assinatura normal
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan_id, end_date')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching subscription from DB:", error);
        // Specifically check for admin users via email
        if (session.user.email === "armempires@gmail.com" || session.user.email === "admin@example.com") {
          console.log("Admin user detected via email, returning admin plan");
          return { planId: "admin", endDate: null };
        }
        // For other users, fallback to localStorage or default
      } else if (data) {
        console.log("Subscription data from DB:", data);
        return { 
          planId: data.plan_id, 
          endDate: data.end_date ? new Date(data.end_date) : null
        };
      }
    } catch (error) {
      console.error("Error in getCurrentSubscription:", error);
    }
  } else {
    console.log("No user session found, checking localStorage");
  }
  
  // Fallback to localStorage for backwards compatibility
  const storedSubscription = localStorage.getItem("userSubscription");
  
  if (storedSubscription) {
    try {
      console.log("Found stored subscription in localStorage");
      const subscription = JSON.parse(storedSubscription);
      return { 
        planId: subscription.plan_id, 
        endDate: subscription.end_date ? new Date(subscription.end_date) : null
      };
    } catch (error) {
      console.error("Error parsing subscription data:", error);
    }
  } else {
    console.log("No stored subscription in localStorage");
  }
  
  // Default to free trial if no subscription is found
  console.log("Defaulting to free trial");
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 day trial
  
  return { planId: "free", endDate: trialEndDate };
};

// Function to update subscription in Supabase
export const setCurrentSubscription = async (planId: string, endDate: Date | null, userId: string): Promise<void> => {
  console.log(`Setting subscription: ${planId} for user ${userId}`);
  // Local storage update for backwards compatibility
  const subscription = {
    plan_id: planId,
    start_date: new Date(),
    end_date: endDate,
    is_active: true
  };
  
  localStorage.setItem("userSubscription", JSON.stringify(subscription));
  console.log("Saved subscription to localStorage");

  // For Supabase
  if (userId) {
    try {
      console.log("Updating subscription in Supabase");
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
      } else {
        console.log("Successfully updated subscription in Supabase");
      }
    } catch (error) {
      console.error("Error in Supabase upsert:", error);
    }
  }
};
