
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  plan_id: string;
  start_date: Date;
  end_date: Date | null;
  is_active: boolean;
}

// Function to check if a plan allows a specific feature
export const canUseFeature = (planId: string, feature: "audio" | "voice" | "video"): boolean => {
  switch (feature) {
    case "audio":
      return planId === "intermediate" || planId === "premium";
    case "voice":
    case "video":
      return planId === "premium";
    default:
      return false;
  }
};

// Function to check if trial period has expired
export const isTrialActive = (endDate: Date | null): boolean => {
  if (!endDate) return false;
  return new Date() < new Date(endDate);
};

// Get the current user's subscription from localStorage or mock data (in a real app, get from Supabase)
export const getCurrentSubscription = (): {planId: string, endDate: Date | null} => {
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
  // In a real app, this would be retrieved from Supabase
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 day trial
  
  return { planId: "free", endDate: trialEndDate };
};

// Function to update subscription in localStorage (for demo purposes)
// In a real app, this would update the Supabase record
export const setCurrentSubscription = async (planId: string, endDate: Date | null, userId: string): Promise<void> => {
  // Local storage update for demo
  const subscription = {
    plan_id: planId,
    start_date: new Date(),
    end_date: endDate,
    is_active: true
  };
  
  localStorage.setItem("userSubscription", JSON.stringify(subscription));

  // For a real app with Supabase
  if (userId) {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert([{
          user_id: userId,
          plan_id: planId,
          start_date: new Date().toISOString(), // Fix: Convert Date to ISO string
          end_date: endDate ? endDate.toISOString() : null, // Fix: Convert Date to ISO string or null
          is_active: true
        }], { onConflict: 'user_id' });
        
      if (error) {
        console.error("Error updating subscription in Supabase:", error);
      }
    } catch (error) {
      console.error("Error in Supabase upsert:", error);
    }
  }
};
