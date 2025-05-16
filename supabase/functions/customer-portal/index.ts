
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging
const logStep = (step: string, details?: any) => {
  console.log(`[CUSTOMER-PORTAL] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
};

serve(async (req) => {
  // Lidar com requisições OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando função de portal do cliente");
    
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
    
    // Verificar se o usuário tem um customer ID no Stripe
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
      
    const stripeCustomerId = profileData?.stripe_customer_id;
    
    if (!stripeCustomerId) {
      throw new Error("Usuário não possui um ID de cliente no Stripe");
    }
    
    logStep("Customer ID encontrado", { customerId: stripeCustomerId });
    
    // Criar a sessão do portal de cliente
    const origin = req.headers.get("origin") || "https://ikbnplncntfftvghvrgv.lovable.ai";
    
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/`,
    });
    
    logStep("Sessão do portal criada", { url: session.url });
    
    return new Response(JSON.stringify({
      url: session.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] customer-portal: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
