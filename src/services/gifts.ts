
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { getFromCache, saveToCache, clearCacheItem } from "@/utils/cacheUtils";
import { createCheckout, CheckoutOptions } from "./checkout";

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
  gift?: Gift; // For joined queries
}

// Cache keys
const CACHE_KEYS = {
  ACTIVE_GIFTS: 'active_gifts',
  USER_PURCHASED_GIFTS: 'user_purchased_gifts'
};

// Cache TTL in milliseconds
const CACHE_TTL = {
  GIFTS: 30 * 60 * 1000, // 30 minutes for gifts list - doesn't change often
  USER_GIFTS: 5 * 60 * 1000 // 5 minutes for user purchased gifts - may change
};

// Carregar gifts ativos do Supabase
export const fetchActiveGifts = async (): Promise<Gift[]> => {
  try {
    // Check cache first
    const cachedGifts = getFromCache<Gift[]>(CACHE_KEYS.ACTIVE_GIFTS);
    if (cachedGifts) {
      console.log("Using cached active gifts", cachedGifts);
      return cachedGifts;
    }

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
    
    // Cache the results
    saveToCache(CACHE_KEYS.ACTIVE_GIFTS, data, CACHE_TTL.GIFTS);
    return data;
  } catch (error) {
    console.error("Error in fetchActiveGifts:", error);
    return [];
  }
};

// Criar sessão de checkout para compra de gift
export const createGiftCheckout = async (giftId: string, quantity: number = 1): Promise<{url: string, sessionId: string} | null> => {
  try {
    console.log(`Criando checkout para gift: ${giftId}, quantidade: ${quantity}`);
    
    const checkoutUrl = await createCheckout({
      item_type: 'gift',
      item_id: giftId,
      quantity
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
    console.error("Exceção em createGiftCheckout:", error);
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um erro ao processar sua solicitação de compra.",
      variant: "destructive"
    });
    return null;
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
    
    // Invalidate the user purchased gifts cache
    clearCacheItem(CACHE_KEYS.USER_PURCHASED_GIFTS);
    
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
    // Check cache first
    const cachedUserGifts = getFromCache<UserPurchasedGift[]>(CACHE_KEYS.USER_PURCHASED_GIFTS);
    if (cachedUserGifts) {
      console.log("Using cached user purchased gifts", cachedUserGifts);
      return cachedUserGifts;
    }

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
    
    // Cache the results
    saveToCache(CACHE_KEYS.USER_PURCHASED_GIFTS, purchasedGifts, CACHE_TTL.USER_GIFTS);
    return purchasedGifts;
  } catch (error) {
    console.error("Error in fetchUserPurchasedGifts:", error);
    return [];
  }
};

// Verificar se uma compra de gift foi concluída
export const verifyGiftPurchase = async (sessionId: string): Promise<UserPurchasedGift | null> => {
  try {
    console.log(`Verificando compra com sessionId: ${sessionId}`);
    
    // Dar um tempo para o webhook processar a compra
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Buscar compras recentes do usuário atual
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error("User not authenticated:", userError);
      return null;
    }
    
    // Invalidar cache para buscar dados atualizados
    clearCacheItem(CACHE_KEYS.USER_PURCHASED_GIFTS);
    
    // Buscar compras recentes (últimas 5)
    const { data, error } = await supabase
      .from('user_purchased_gifts')
      .select('*, gifts(*)')
      .eq('user_id', userData.user.id)
      .order('purchase_date', { ascending: false })
      .limit(5);
    
    if (error || !data || data.length === 0) {
      console.error("Error fetching recent purchases:", error);
      return null;
    }
    
    // Os gifts mais recentes aparecem primeiro, então retornar o primeiro
    const mostRecentPurchase = data[0];
    const purchasedGift: UserPurchasedGift = {
      id: mostRecentPurchase.id,
      user_id: mostRecentPurchase.user_id,
      gift_id: mostRecentPurchase.gift_id,
      purchase_date: mostRecentPurchase.purchase_date,
      price_paid: mostRecentPurchase.price_paid,
      transaction_details: mostRecentPurchase.transaction_details ? 
        JSON.parse(JSON.stringify(mostRecentPurchase.transaction_details)) : null,
      used_in_chat_message_id: mostRecentPurchase.used_in_chat_message_id,
      gift: mostRecentPurchase.gifts as Gift
    };
    
    return purchasedGift;
  } catch (error) {
    console.error("Error verifying gift purchase:", error);
    return null;
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
    
    // Invalidate the user purchased gifts cache
    clearCacheItem(CACHE_KEYS.USER_PURCHASED_GIFTS);
    return true;
  } catch (error) {
    console.error("Error in markGiftAsUsed:", error);
    return false;
  }
};
