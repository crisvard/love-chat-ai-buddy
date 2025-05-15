
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
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    
    // Inicializar cliente Stripe e Supabase com service role para bypass RLS
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
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
    if (!user) throw new Error("Usuário não autenticado");
    
    logStep("Usuário autenticado", { userId: user.id, email: user.email });
    
    // Verificar se o usuário é admin
    const { data: isAdminData, error: isAdminError } = await supabaseClient.rpc('is_admin');
    if (!isAdminError && isAdminData === true) {
      logStep("Usuário é admin");
      return new Response(JSON.stringify({
        planId: "admin",
        isActive: true,
        endDate: null,
        status: "active",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Buscar o stripe_customer_id do usuário
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    let customerId = profileData?.stripe_customer_id;
    
    // Se não tiver customer_id, buscar no Stripe por e-mail
    if (!customerId && user.email) {
      logStep("Customer ID não encontrado no perfil, buscando no Stripe por e-mail");
      
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Customer encontrado no Stripe", { customerId });
        
        // Atualizar o customer_id no perfil do usuário
        await supabaseService
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
          
        logStep("Profile atualizado com customer_id");
      }
    }
    
    // Se não encontrou customer_id, o usuário não tem assinatura
    if (!customerId) {
      logStep("Usuário não tem customer_id no Stripe");
      return new Response(JSON.stringify({
        planId: "free",
        isActive: false,
        endDate: null,
        status: "inactive",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Buscar assinaturas ativas do cliente no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.items.data.price.product'],
    });
    
    // Se não tiver assinaturas ativas, definir como free
    if (subscriptions.data.length === 0) {
      logStep("Usuário não tem assinaturas ativas no Stripe");
      
      // Atualizar o status na tabela user_subscriptions
      const { data: existingSubData } = await supabaseClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingSubData) {
        // Desativar assinatura existente
        await supabaseService
          .from('user_subscriptions')
          .update({ is_active: false, status: 'inactive' })
          .eq('id', existingSubData.id);
          
        logStep("Assinatura existente foi desativada");
      }
      
      return new Response(JSON.stringify({
        planId: "free",
        isActive: false,
        endDate: null,
        status: "inactive",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // Pegar a assinatura mais recente
    const subscription = subscriptions.data[0];
    const status = subscription.status;
    const isActive = status === 'active' || status === 'trialing';
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    
    // Pegar detalhes do produto/plano
    // @ts-ignore - expandido na consulta
    const productId = subscription.items.data[0].price.product.metadata?.plan_id || 'unknown';
    
    logStep("Assinatura ativa encontrada", { 
      subscriptionId: subscription.id,
      status, 
      isActive,
      productId,
      currentPeriodEnd 
    });
    
    // Buscar o plano correspondente no Supabase
    let planId = "unknown";
    if (productId !== 'unknown') {
      // Se o product já tem o plan_id nos metadados, usar diretamente
      planId = productId;
    } else {
      // Caso contrário, buscar pelo stripe_product_id na tabela plans
      // @ts-ignore - expandido na consulta
      const stripeProductId = subscription.items.data[0].price.product.id;
      
      const { data: planData } = await supabaseClient
        .from('plans')
        .select('id')
        .eq('stripe_product_id', stripeProductId)
        .maybeSingle();
        
      if (planData) {
        planId = planData.id;
      }
    }
    
    // Atualizar a tabela user_subscriptions
    const subscriptionData = {
      user_id: user.id,
      plan_id: planId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status,
      is_active: isActive,
      start_date: currentPeriodStart.toISOString(),
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      end_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    };
    
    // Atualizar subscription existente ou inserir nova
    const { data: existingData } = await supabaseClient
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
      
    if (existingData) {
      await supabaseService
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', existingData.id);
        
      logStep("Assinatura existente atualizada", { subscriptionId: existingData.id });
    } else {
      // Desativar assinaturas anteriores
      await supabaseService
        .from('user_subscriptions')
        .update({ is_active: false, status: 'inactive' })
        .eq('user_id', user.id)
        .eq('is_active', true);
        
      // Inserir nova assinatura
      const { data: newSub, error: insertError } = await supabaseService
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select('id')
        .single();
        
      if (insertError) {
        logStep("Erro ao inserir nova assinatura", { error: insertError });
      } else {
        logStep("Nova assinatura inserida", { subscriptionId: newSub.id });
      }
    }
    
    // Retornar os dados da assinatura
    return new Response(JSON.stringify({
      planId,
      isActive,
      endDate: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      status,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CHECK-SUBSCRIPTION] ERROR: ${errorMessage}`);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      planId: "free",
      isActive: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
