
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging
const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  // Aceitar requisições OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de checkout");
    
    // Obter variáveis de ambiente
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não está configurada");
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Variáveis de ambiente do Supabase não estão configuradas");
    }
    
    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    // Inicializar Supabase com service role (para bypass de RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { persistSession: false } }
    );
    
    // Extrair dados da requisição
    const { 
      item_type, // 'plan' ou 'gift'
      item_id, 
      user_id,
      quantity = 1,
      success_url,
      cancel_url
    } = await req.json();
    
    logStep("Dados recebidos", { item_type, item_id, user_id, quantity });
    
    if (!item_type || !item_id || !user_id) {
      throw new Error("Parâmetros obrigatórios ausentes: item_type, item_id, user_id");
    }
    
    // Verificar se o tipo de item é válido
    if (item_type !== 'plan' && item_type !== 'gift') {
      throw new Error("item_type inválido. Deve ser 'plan' ou 'gift'");
    }
    
    // Buscar informações do usuário
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("email, name, stripe_customer_id")
      .eq("id", user_id)
      .single();
      
    if (userError || !userData) {
      throw new Error(`Erro ao buscar usuário: ${userError?.message || "Usuário não encontrado"}`);
    }
    
    // Encontrar ou criar cliente no Stripe
    let customerId = userData.stripe_customer_id;
    if (!customerId) {
      logStep("Cliente Stripe não encontrado, criando novo cliente");
      const customer = await stripe.customers.create({ 
        email: userData.email, 
        name: userData.name || undefined,
        metadata: { supabase_user_id: user_id } 
      });
      
      customerId = customer.id;
      
      // Atualizar stripe_customer_id no perfil do usuário
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user_id);
        
      logStep("ID do cliente Stripe atualizado no perfil", { customerId });
    } else {
      logStep("Cliente Stripe existente encontrado", { customerId });
    }
    
    // Configurar checkout baseado no tipo de item
    let mode: 'payment' | 'subscription';
    let priceId: string;
    
    if (item_type === 'plan') {
      // Buscar plano
      const { data: planData, error: planError } = await supabaseAdmin
        .from("plans")
        .select("stripe_price_id, name")
        .eq("id", item_id)
        .single();
        
      if (planError || !planData || !planData.stripe_price_id) {
        throw new Error(`Erro ao buscar plano: ${planError?.message || "Plano não encontrado ou sem price_id"}`);
      }
      
      mode = 'subscription';
      priceId = planData.stripe_price_id;
      logStep("Plano encontrado", { planName: planData.name, priceId });
      
    } else { // item_type === 'gift'
      // Buscar gift
      const { data: giftData, error: giftError } = await supabaseAdmin
        .from("gifts")
        .select("stripe_price_id, name")
        .eq("id", item_id)
        .single();
        
      if (giftError || !giftData || !giftData.stripe_price_id) {
        throw new Error(`Erro ao buscar gift: ${giftError?.message || "Gift não encontrado ou sem price_id"}`);
      }
      
      mode = 'payment';
      priceId = giftData.stripe_price_id;
      logStep("Gift encontrado", { giftName: giftData.name, priceId });
    }
    
    // URL base para redirecionamentos
    const origin = req.headers.get("origin") || "https://ikbnplncntfftvghvrgv.supabase.co";
    
    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: mode,
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/payment-cancelled`,
      metadata: {
        supabase_user_id: user_id,
        item_type: item_type,
        item_id: item_id,
      },
    });
    
    logStep("Sessão de checkout criada", { sessionId: session.id, url: session.url });
    
    // Retornar dados da sessão para o frontend
    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] create-checkout: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
