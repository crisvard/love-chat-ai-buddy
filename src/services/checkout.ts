
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Tipos para as funções de checkout
export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

/**
 * Cria uma sessão de checkout para assinatura de planos
 */
export const createSubscriptionCheckout = async (planId: string): Promise<CheckoutResponse | null> => {
  try {
    console.log(`Criando checkout para plano: ${planId}`);
    
    const { data, error } = await supabase.functions.invoke('create-subscription', {
      body: { planId }
    });
    
    if (error) {
      console.error("Erro ao criar sessão de assinatura:", error);
      toast({
        title: "Erro ao processar assinatura",
        description: "Não foi possível iniciar o processo de assinatura. Por favor, tente novamente.",
        variant: "destructive"
      });
      return null;
    }
    
    console.log("Sessão de checkout criada com sucesso:", data);
    return {
      url: data.url,
      sessionId: data.sessionId
    };
  } catch (error) {
    console.error("Exceção em createSubscriptionCheckout:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação de assinatura.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Cria uma sessão de checkout para compra de presentes
 */
export const createGiftCheckout = async (giftId: string, quantity: number = 1): Promise<CheckoutResponse | null> => {
  try {
    console.log(`Criando checkout para presente: ${giftId}, quantidade: ${quantity}`);
    
    const { data, error } = await supabase.functions.invoke('create-gift-payment', {
      body: { giftId, quantity }
    });
    
    if (error) {
      console.error("Erro ao criar checkout para o presente:", error);
      toast({
        title: "Erro ao processar compra",
        description: "Não foi possível iniciar o processo de compra. Por favor, tente novamente.",
        variant: "destructive"
      });
      return null;
    }
    
    console.log("Sessão de checkout criada com sucesso:", data);
    return {
      url: data.url,
      sessionId: data.sessionId
    };
  } catch (error) {
    console.error("Exceção em createGiftCheckout:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação de compra.",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Abre a URL do checkout do Stripe
 */
export const openCheckoutSession = (checkoutUrl: string) => {
  if (!checkoutUrl) {
    console.error("URL de checkout inválida");
    toast({
      title: "Erro de checkout",
      description: "URL de checkout inválida. Tente novamente.",
      variant: "destructive"
    });
    return false;
  }
  
  console.log(`Abrindo checkout do Stripe: ${checkoutUrl}`);
  
  try {
    // Abrir em uma nova aba
    window.open(checkoutUrl, '_blank');
    return true;
  } catch (error) {
    console.error("Erro ao abrir URL de checkout:", error);
    toast({
      title: "Erro de redirecionamento",
      description: "Não foi possível abrir a página de checkout. Tente novamente.",
      variant: "destructive"
    });
    return false;
  }
};
