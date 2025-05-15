
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para log
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GIFT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");
    
    // Obter STRIPE_SECRET_KEY do ambiente
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não está configurada");
    
    // Inicializar cliente Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Autenticar usuário com Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Cabeçalho de autorização não fornecido");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário não autenticado ou email não disponível");
    
    logStep("Usuário autenticado", { userId: user.id, email: user.email });
    
    // Obter dados da requisição
    const { giftId, quantity = 1 } = await req.json();
    if (!giftId) throw new Error("ID do presente não fornecido");
    
    logStep("Gift solicitado", { giftId, quantity });
    
    // Buscar informações do gift no Supabase
    const { data: giftData, error: giftError } = await supabaseClient
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();
    
    if (giftError || !giftData) {
      throw new Error(`Erro ao buscar gift: ${giftError?.message || "Gift não encontrado"}`);
    }
    
    logStep("Gift encontrado", { gift: giftData });
    
    // Verificar se o usuário já tem um customer_id no Stripe
    // Primeiro verificar na tabela de profiles
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    let customerId = profileData?.stripe_customer_id;
    
    // Se não tiver, buscar no Stripe por e-mail
    if (!customerId) {
      logStep("Customer ID não encontrado no perfil, buscando no Stripe por e-mail");
      
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Customer encontrado no Stripe", { customerId });
        
        // Atualizar o customer_id no perfil do usuário
        const supabaseService = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        await supabaseService
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
          
        logStep("Profile atualizado com customer_id");
      }
    }
    
    // Se o gift tiver um price_id no Stripe, usar ele
    // Caso contrário, criar um price dinâmico
    const origin = req.headers.get("origin") || "http://localhost:5173";
    let session;
    
    if (giftData.stripe_price_id) {
      // Usar price_id existente
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: giftData.stripe_price_id,
            quantity: quantity,
          },
        ],
        mode: "payment",
        success_url: `${origin}/gift-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/gift-canceled`,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          gift_id: giftId,
          quantity: String(quantity),
        },
      });
    } else {
      // Criar price dinâmico
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: giftData.name,
                description: `${giftData.emoji} presente virtual`,
              },
              unit_amount: Math.round(Number(giftData.price) * 100), // Preço em centavos
            },
            quantity: quantity,
          },
        ],
        mode: "payment",
        success_url: `${origin}/gift-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/gift-canceled`,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          gift_id: giftId,
          quantity: String(quantity),
        },
      });
    }
    
    logStep("Checkout session criada", { sessionId: session.id, url: session.url });
    
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-GIFT-PAYMENT] ERROR: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
