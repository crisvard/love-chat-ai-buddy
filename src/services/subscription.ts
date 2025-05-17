import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { getFromCache, saveToCache, clearCacheItem, clearCache } from "@/utils/cacheUtils";
import { toast } from "@/components/ui/use-toast";
import { createCheckout } from "./checkout";

export interface Subscription {
  id: string;
  plan_id: string;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
}

// Cache keys
const CACHE_KEYS = {
  PLAN_FEATURES: 'plan_features_',
  CURRENT_SUBSCRIPTION: 'current_subscription',
};

// TTL values in milliseconds
const CACHE_TTL = {
  PLANS: 24 * 60 * 60 * 1000, // 24 hours for plans - rarely change
  SUBSCRIPTION: 5 * 60 * 1000, // 5 minutes for subscriptions - could change
};

// Function to check if a plan allows a specific feature
export const canUseFeature = async (planId: string, feature: "audio" | "voice" | "video"): Promise<boolean> => {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEYS.PLAN_FEATURES}${planId}_${feature}`;
    const cachedResult = getFromCache<boolean>(cacheKey);
    
    if (cachedResult !== null) {
      console.log(`Using cached feature check for ${planId}:${feature}`, cachedResult);
      return cachedResult;
    }
    
    console.log(`Checking if plan ${planId} allows feature ${feature}`);
    
    // Admin sempre tem acesso a todas as features
    if (planId === "admin") {
      saveToCache(cacheKey, true, CACHE_TTL.PLANS);
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
      let result: boolean;
      switch (feature) {
        case "audio":
          result = planId === "intermediate" || planId === "premium";
          break;
        case "voice":
        case "video":
          result = planId === "premium";
          break;
        default:
          result = false;
      }
      saveToCache(cacheKey, result, CACHE_TTL.PLANS);
      return result;
    }
    
    const features = plan.features as string[];
    console.log(`Plan features for ${planId}:`, features);
    
    let result: boolean;
    switch (feature) {
      case "audio":
        result = features.includes("Áudio") || planId === "admin";
        break;
      case "voice":
        result = features.includes("4 chamadas de voz por mês") || planId === "admin";
        break;
      case "video":
        result = features.includes("4 chamadas de vídeo por mês") || planId === "admin";
        break;
      default:
        result = false;
    }
    
    // Cache the result
    saveToCache(cacheKey, result, CACHE_TTL.PLANS);
    return result;
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

// Function to check and update subscription status via Edge Function
export const checkSubscription = async (): Promise<{planId: string, isActive: boolean, endDate: Date | null, status?: string}> => {
  console.log("Checking subscription status via Edge Function");
  
  try {
    const { data, error } = await supabase.functions.invoke('check-subscription');
    
    if (error) {
      console.error("Error checking subscription via Edge Function:", error);
      throw new Error(error.message);
    }
    
    console.log("Subscription check result:", data);
    
    // Clear cache and save new data
    clearCacheItem(CACHE_KEYS.CURRENT_SUBSCRIPTION);
    
    const result = {
      planId: data.planId,
      isActive: data.isActive,
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status
    };
    
    saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
    return result;
  } catch (error) {
    console.error("Error in checkSubscription:", error);
    
    // Try to use cached data if available
    const cachedSubscription = getFromCache<{planId: string, isActive: boolean, endDate: Date | null}>(CACHE_KEYS.CURRENT_SUBSCRIPTION);
    if (cachedSubscription) {
      console.log("Using cached subscription data after error", cachedSubscription);
      return cachedSubscription;
    }
    
    // Default fallback
    return { planId: "free", isActive: false, endDate: null };
  }
};

// Get the current user's subscription from Supabase
export const getCurrentSubscription = async (forceRefresh: boolean = false): Promise<{planId: string, endDate: Date | null}> => {
  console.log("Getting current subscription, forceRefresh:", forceRefresh);
  
  try {
    // Se forceRefresh, limpamos o cache
    if (forceRefresh) {
      clearCacheItem(CACHE_KEYS.CURRENT_SUBSCRIPTION);
    }
    
    // Try to get updated subscription from Edge Function first
    const subscription = await checkSubscription();
    return {
      planId: subscription.planId,
      endDate: subscription.endDate
    };
  } catch (error) {
    console.error("Error checking subscription, falling back to local data:", error);
    
    // Check cache 
    const cachedSubscription = getFromCache<{planId: string, endDate: Date | null}>(CACHE_KEYS.CURRENT_SUBSCRIPTION);
    if (cachedSubscription) {
      console.log("Using cached subscription data", cachedSubscription);
      return cachedSubscription;
    }
    
    // Original fallback methods
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
          const result = { planId: "admin", endDate: null };
          saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
          return result;
        }
        
        // Se não for admin, verificar assinatura normal
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('plan_id, current_period_end')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching subscription from DB:", error);
          // Specifically check for admin users via email
          if (session.user.email === "armempires@gmail.com" || session.user.email === "admin@example.com") {
            console.log("Admin user detected via email, returning admin plan");
            const result = { planId: "admin", endDate: null };
            saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
            return result;
          }
          // For other users, fallback to localStorage or default
        } else if (data) {
          console.log("Subscription data from DB:", data);
          
          // Use the correct field names from the database schema
          const result = { 
            planId: data.plan_id, 
            endDate: data.current_period_end ? new Date(data.current_period_end) : null
          };
          saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
          return result;
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
        const result = { 
          planId: subscription.plan_id, 
          endDate: subscription.end_date ? new Date(subscription.end_date) : null
        };
        saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
        return result;
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
    
    const result = { planId: "free", endDate: trialEndDate };
    saveToCache(CACHE_KEYS.CURRENT_SUBSCRIPTION, result, CACHE_TTL.SUBSCRIPTION);
    return result;
  }
};

// Create subscription checkout session via Edge Function
export const createSubscriptionCheckout = async (planId: string): Promise<{url: string, sessionId: string} | null> => {
  try {
    console.log(`Criando checkout de assinatura para plano: ${planId}`);
    
    // Buscar o stripe_price_id do plano
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('stripe_price_id, name')
      .eq('id', planId)
      .single();
      
    if (planError || !planData || !planData.stripe_price_id) {
      console.error("Erro ao buscar plano:", planError || "Plano não encontrado ou sem price_id");
      toast({
        title: "Erro ao iniciar assinatura",
        description: "Não foi possível encontrar o plano selecionado. Por favor, tente novamente.",
        variant: "destructive"
      });
      return null;
    }
    
    // Criar checkout usando nossa nova função
    const checkoutUrl = await createCheckout({
      item_type: 'plan',
      item_id: planId
    });
    
    if (!checkoutUrl) {
      return null;
    }
    
    // Extrair session_id da URL se estiver presente
    const url = new URL(checkoutUrl);
    const sessionId = url.searchParams.get('session_id') || '';
    
    return {
      url: checkoutUrl,
      sessionId: sessionId
    };
  } catch (error) {
    console.error("Exception in createSubscriptionCheckout:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação de assinatura.",
      variant: "destructive"
    });
    return null;
  }
};

// Open customer portal via Edge Function
export const openCustomerPortal = async (): Promise<{url: string} | null> => {
  try {
    console.log("Opening customer portal");
    
    const { data, error } = await supabase.functions.invoke('customer-portal');
    
    if (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Erro ao abrir portal",
        description: "Não foi possível abrir o portal de gerenciamento de assinatura. Por favor, tente novamente.",
        variant: "destructive"
      });
      return null;
    }
    
    console.log("Customer portal session created:", data);
    return {
      url: data.url
    };
  } catch (error) {
    console.error("Exception in openCustomerPortal:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação.",
      variant: "destructive"
    });
    return null;
  }
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
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: endDate ? endDate.toISOString() : null,
          end_date: endDate ? endDate.toISOString() : null
        }, { onConflict: 'user_id' });
        
      if (error) {
        console.error("Error updating subscription in Supabase:", error);
      } else {
        console.log("Successfully updated subscription in Supabase");
        // Clear cache after update
        clearCacheItem(CACHE_KEYS.CURRENT_SUBSCRIPTION);
      }
    } catch (error) {
      console.error("Error in Supabase upsert:", error);
    }
  }
};
