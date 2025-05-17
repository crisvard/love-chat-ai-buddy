import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCurrentSubscription } from "./subscription";

export type CheckoutItemType = 'plan' | 'gift';

export interface CheckoutOptions {
  item_type: CheckoutItemType;
  item_id: string;
  quantity?: number;
  success_url?: string;
  cancel_url?: string;
  stripe_price_id?: string;  // Campo adicionado para permitir price_id direto
}

/**
 * Cria uma sessão de checkout no Stripe via edge function
 * @returns URL do checkout ou null se ocorrer erro
 */
export const createCheckout = async (options: CheckoutOptions): Promise<string | null> => {
  try {
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para realizar esta operação",
        variant: "destructive"
      });
      return null;
    }
    
    // Preparar dados para a requisição
    const requestData = {
      ...options,
      user_id: session.user.id,
    };
    
    console.log("Criando checkout com dados:", requestData);
    
    // Chamar edge function para criar checkout
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: requestData
    });
    
    if (error) {
      console.error("Erro ao criar checkout:", error);
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message || "Não foi possível iniciar o processo de pagamento",
        variant: "destructive"
      });
      return null;
    }
    
    if (!data?.url) {
      console.error("Resposta inválida da API de checkout:", data);
      toast({
        title: "Erro ao processar checkout",
        description: "Resposta inválida do servidor",
        variant: "destructive"
      });
      return null;
    }
    
    console.log("Checkout criado com sucesso:", data);
    return data.url;
    
  } catch (error) {
    console.error("Exceção ao criar checkout:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação",
      variant: "destructive"
    });
    return null;
  }
};

/**
 * Cria um checkout para assinatura de plano usando os price_ids do Stripe diretamente
 */
export const subscribeToPlan = async (planId: string): Promise<boolean> => {
  // Verificar se devemos buscar o price_id do banco de dados ou usar o mapeamento fixo
  console.log("Iniciando checkout para o plano:", planId);
  
  try {
    // Buscar o plano diretamente do banco de dados para obter o price_id
    const { data: plan, error } = await supabase
      .from("plans")
      .select("stripe_price_id, name")
      .eq("id", planId)
      .single();
    
    if (error) {
      console.error("Erro ao buscar plano:", error);
      throw new Error("Não foi possível obter informações do plano");
    }
    
    if (!plan || !plan.stripe_price_id) {
      console.error("Plano não encontrado ou sem price_id:", planId);
      toast({
        title: "Erro ao processar pagamento",
        description: "ID do plano inválido ou preço não configurado",
        variant: "destructive"
      });
      return false;
    }
    
    console.log(`Usando price_id ${plan.stripe_price_id} para o plano ${plan.name}`);
    
    const checkoutUrl = await createCheckout({
      item_type: 'plan',
      item_id: planId,
      stripe_price_id: plan.stripe_price_id
    });
    
    if (!checkoutUrl) {
      return false;
    }
    
    // Redirecionar para checkout
    window.open(checkoutUrl, '_blank');
    return true;
    
  } catch (error) {
    console.error("Erro ao processar subscription:", error);
    toast({
      title: "Erro ao processar assinatura",
      description: error instanceof Error ? error.message : "Erro desconhecido",
      variant: "destructive"
    });
    return false;
  }
};

/**
 * Cria um checkout para compra de gift
 */
export const purchaseGiftCheckout = async (giftId: string, quantity: number = 1): Promise<boolean> => {
  const checkoutUrl = await createCheckout({
    item_type: 'gift',
    item_id: giftId,
    quantity
  });
  
  if (!checkoutUrl) {
    return false;
  }
  
  // Redirecionar para checkout
  window.open(checkoutUrl, '_blank');
  return true;
};

/**
 * Verifica status de uma assinatura após retorno do checkout
 */
export const verifyCheckoutResult = async (sessionId?: string): Promise<{success: boolean, message: string}> => {
  try {
    if (!sessionId) {
      return { success: false, message: "ID da sessão não fornecido" };
    }
    
    // Forçar atualização das informações de assinatura do usuário
    await getCurrentSubscription(true);
    
    return { 
      success: true, 
      message: "Pagamento processado com sucesso" 
    };
  } catch (error) {
    console.error("Erro ao verificar resultado do checkout:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erro ao verificar pagamento" 
    };
  }
};
