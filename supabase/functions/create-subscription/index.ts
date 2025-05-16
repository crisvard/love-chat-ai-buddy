
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging
const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-SUBSCRIPTION] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  // Lidar com requisições OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando função create-subscription");
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não está configurada");
    }
    
    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    // Criar cliente Supabase com service role key para operações diretas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Criar cliente Supabase para autenticação
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Autenticar usuário a partir do token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autenticação não fornecido");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Erro de autenticação: ${userError?.message || "Usuário não encontrado"}`);
    }
    
    const user = userData.user;
    logStep("Usuário autenticado", { id: user.id, email: user.email });
    
    // Obter dados da requisição
    const { planId } = await req.json();
    
    if (!planId) {
      throw new Error("ID do plano não fornecido");
    }
    logStep("Dados recebidos", { planId });
    
    // Buscar dados do plano
    const { data: planData, error: planError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();
      
    if (planError || !planData) {
      throw new Error(`Erro ao buscar plano: ${planError?.message || "Plano não encontrado"}`);
    }
    
    logStep("Plano encontrado", { nome: planData.name, preço: planData.price });
    
    // Verificar se usuário já tem um customer_id no Stripe
    let stripeCustomerId: string | null = null;
    
    // Verificar primeiro no profile
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
      
    if (profileData?.stripe_customer_id) {
      stripeCustomerId = profileData.stripe_customer_id;
      logStep("Customer ID encontrado no perfil", { customerId: stripeCustomerId });
    } 
    
    // Se não tiver no perfil, buscar no Stripe pelo e-mail
    if (!stripeCustomerId) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        logStep("Customer ID encontrado no Stripe", { customerId: stripeCustomerId });
        
        // Atualizar o perfil com o customer_id encontrado
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", user.id);
          
        logStep("Perfil atualizado com customer ID");
      }
    }
    
    // Se ainda não tiver um customer_id, criar um novo
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: profileData?.name || user.email.split("@")[0],
        metadata: {
          supabase_user_id: user.id
        }
      });
      
      stripeCustomerId = newCustomer.id;
      logStep("Novo customer criado no Stripe", { customerId: stripeCustomerId });
      
      // Atualizar o perfil com o novo customer_id
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
        
      logStep("Perfil atualizado com novo customer ID");
    }
    
    // Criar a sessão de checkout
    const origin = req.headers.get("origin") || "https://ikbnplncntfftvghvrgv.lovable.ai";
    
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: planData.name,
              description: planData.description || `Assinatura: ${planData.name}`,
            },
            unit_amount: Math.round(Number(planData.price) * 100), // Converter para centavos
            recurring: {
              interval: "month"
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/`,
      cancel_url: `${origin}/`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        item_type: 'plan'
      },
    });
    
    logStep("Sessão de checkout criada", { sessionId: session.id, url: session.url });
    
    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] create-subscription: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
