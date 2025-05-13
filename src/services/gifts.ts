
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export interface Gift {
  id: string;
  name: string;
  emoji?: string;
  image_url?: string;
  price: number;
  is_active: boolean;
  created_at?: string;
}

export interface UserPurchasedGift {
  id: string;
  user_id: string;
  gift_id: string;
  purchase_date: string;
  price_paid: number;
  transaction_details?: Record<string, any> | null;
  used_in_chat_message_id?: string | null;
}

// Carregar gifts ativos do Supabase
export const fetchActiveGifts = async (): Promise<Gift[]> => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error("Error fetching gifts:", error);
      toast({
        title: "Erro ao carregar presentes",
        description: "Não foi possível carregar a lista de presentes.",
        variant: "destructive"
      });
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchActiveGifts:", error);
    return [];
  }
};

// Comprar um gift e registrar na tabela user_purchased_gifts
export const purchaseGift = async (giftId: string, price: number): Promise<UserPurchasedGift | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error("User not authenticated:", userError);
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para comprar presentes.",
        variant: "destructive"
      });
      return null;
    }
    
    const userId = userData.user.id;
    
    // Criar registro da compra
    const { data, error } = await supabase
      .from('user_purchased_gifts')
      .insert({
        user_id: userId,
        gift_id: giftId,
        price_paid: price,
        purchase_date: new Date().toISOString(),
        transaction_details: { 
          payment_method: 'app_credit', 
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error purchasing gift:", error);
      toast({
        title: "Erro ao comprar presente",
        description: "Não foi possível completar a compra. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
    
    toast({
      title: "Presente comprado!",
      description: "Seu presente foi comprado com sucesso.",
    });
    
    // Converter os dados para o tipo UserPurchasedGift
    const purchasedGift: UserPurchasedGift = {
      id: data.id,
      user_id: data.user_id,
      gift_id: data.gift_id,
      purchase_date: data.purchase_date,
      price_paid: data.price_paid,
      transaction_details: data.transaction_details ? 
        JSON.parse(JSON.stringify(data.transaction_details)) : null,
      used_in_chat_message_id: data.used_in_chat_message_id
    };
    
    return purchasedGift;
  } catch (error) {
    console.error("Error in purchaseGift:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua compra.",
      variant: "destructive"
    });
    return null;
  }
};

// Buscar os gifts que um usuário comprou
export const fetchUserPurchasedGifts = async (): Promise<UserPurchasedGift[]> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error("User not authenticated:", userError);
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_purchased_gifts')
      .select('*, gifts(*)')
      .eq('user_id', userData.user.id)
      .order('purchase_date', { ascending: false });
      
    if (error) {
      console.error("Error fetching user's purchased gifts:", error);
      return [];
    }
    
    // Converter os dados para o tipo UserPurchasedGift[]
    const purchasedGifts: UserPurchasedGift[] = data.map(item => ({
      id: item.id,
      user_id: item.user_id,
      gift_id: item.gift_id,
      purchase_date: item.purchase_date,
      price_paid: item.price_paid,
      transaction_details: item.transaction_details ? 
        JSON.parse(JSON.stringify(item.transaction_details)) : null,
      used_in_chat_message_id: item.used_in_chat_message_id,
      // Adicionamos a propriedade gift para acesso fácil
      gift: item.gifts as Gift
    })) as UserPurchasedGift[];
    
    return purchasedGifts;
  } catch (error) {
    console.error("Error in fetchUserPurchasedGifts:", error);
    return [];
  }
};

// Marcar um gift como usado em uma mensagem específica
export const markGiftAsUsed = async (giftPurchaseId: string, messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_purchased_gifts')
      .update({ 
        used_in_chat_message_id: messageId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', giftPurchaseId);
      
    if (error) {
      console.error("Error marking gift as used:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in markGiftAsUsed:", error);
    return false;
  }
};
