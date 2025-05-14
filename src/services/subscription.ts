import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { getFromCache, saveToCache, clearCacheItem, clearCache } from "@/utils/cacheUtils";

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

// Get the current user's subscription from Supabase
export const getCurrentSubscription = async (): Promise<{planId: string, endDate: Date | null}> => {
  console.log("Getting current subscription");
  
  // Check cache first
  const cachedSubscription = getFromCache<{planId: string, endDate: Date | null}>(CACHE_KEYS.CURRENT_SUBSCRIPTION);
  if (cachedSubscription) {
    console.log("Using cached subscription data", cachedSubscription);
    return cachedSubscription;
  }
  
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
        .select('plan_id, end_date')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
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
        const result = { 
          planId: data.plan_id, 
          endDate: data.end_date ? new Date(data.end_date) : null
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
        // Clear cache after update
        clearCacheItem(CACHE_KEYS.CURRENT_SUBSCRIPTION);
      }
    } catch (error) {
      console.error("Error in Supabase upsert:", error);
    }
  }
};
