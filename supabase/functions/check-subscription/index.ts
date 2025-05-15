
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging
const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  // Lidar com requisições OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando verificação de assinatura");
    
    // Inicializar Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não está configurada");
    }
    
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
    
    // Verificar se é admin (já tem função no banco)
    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin');
    if (isAdminData === true) {
      logStep("Usuário é admin");
      return new Response(JSON.stringify({
        planId: "admin",
        isActive: true,
        endDate: null,
        status: "active"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Buscar a assinatura atual do usuário no Supabase
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .maybeSingle();
      
    logStep("Buscou assinatura no banco", { encontrada: !!subscriptionData });
    
    // Se tiver um stripe_customer_id, verificar assinatura no Stripe
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    
    const stripeCustomerId = profileData?.stripe_customer_id;
    let planId = "free";
    let isActive = false;
    let endDate: string | null = null;
    let status = "inactive";
    
    if (stripeCustomerId) {
      logStep("Encontrou Stripe customer ID", { customerId: stripeCustomerId });
      
      try {
        // Verificar assinaturas ativas no Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const activeSubscription = subscriptions.data[0];
          logStep("Assinatura ativa encontrada no Stripe", { subId: activeSubscription.id });
          
          // Determinar o ID do plano com base no preço
          const priceId = activeSubscription.items.data[0].price.id;
          
          // Buscar plano correspondente ao preço no Stripe
          const { data: planData } = await supabaseAdmin
            .from("plans")
            .select("*")
            .eq("stripe_price_id", priceId)
            .maybeSingle();
            
          if (planData) {
            planId = planData.id;
          } else {
            // Se não encontrar pelo stripe_price_id, tentar determinar pelo valor
            const priceAmount = activeSubscription.items.data[0].price.unit_amount || 0;
            
            if (priceAmount <= 2990) {
              planId = "basic";
            } else if (priceAmount <= 4990) {
              planId = "intermediate";
            } else {
              planId = "premium";
            }
          }
          
          isActive = true;
          endDate = new Date(activeSubscription.current_period_end * 1000).toISOString();
          status = activeSubscription.status;
          
          // Atualizar subscription no banco de dados
          await supabaseAdmin.from("user_subscriptions").upsert({
            user_id: user.id,
            plan_id: planId,
            stripe_subscription_id: activeSubscription.id,
            stripe_customer_id: stripeCustomerId,
            status: activeSubscription.status,
            is_active: true,
            current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
            end_date: activeSubscription.cancel_at ? new Date(activeSubscription.cancel_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,stripe_subscription_id'
          });
          
          logStep("Banco de dados atualizado com informações do Stripe");
        } else if (subscriptionData) {
          // Se não encontrou no Stripe mas tem no BD, marcar como inativa
          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              is_active: false,
              status: "inactive",
              updated_at: new Date().toISOString()
            })
            .eq("id", subscriptionData.id);
            
          logStep("Assinatura marcada como inativa no banco");
        }
      } catch (stripeError) {
        console.error("Erro ao verificar assinatura no Stripe:", stripeError);
        
        // Se falhou na verificação no Stripe, usar dados do banco
        if (subscriptionData) {
          planId = subscriptionData.plan_id;
          isActive = subscriptionData.is_active;
          endDate = subscriptionData.end_date;
          status = subscriptionData.status;
        }
      }
    } else if (subscriptionData) {
      // Não tem customer_id mas tem assinatura no banco
      planId = subscriptionData.plan_id;
      isActive = subscriptionData.is_active;
      endDate = subscriptionData.end_date;
      status = subscriptionData.status;
    }
    
    // Se não tiver assinatura ativa, verificar se está em período de teste
    if (planId === "free" && !isActive) {
      // Verificar se foi criado nos últimos 3 dias = teste gratuito
      const createdAt = new Date(user.created_at || Date.now());
      const trialEndDate = new Date(createdAt);
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3 dias de teste
      
      if (new Date() < trialEndDate) {
        isActive = true;
        endDate = trialEndDate.toISOString();
        status = "trialing";
        logStep("Usuário em período de teste gratuito", { endDate });
      }
    }
    
    return new Response(JSON.stringify({
      planId,
      isActive,
      endDate,
      status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] check-subscription: ${errorMessage}`);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      planId: "free",
      isActive: false,
      endDate: null,
      status: "error" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
