
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
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook chamado");

    // Obter STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET do ambiente
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não está configurada");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET não está configurada");
    
    // Inicializar cliente Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Verificar assinatura do webhook
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Assinatura do webhook não encontrada");
    
    // Obter o payload como texto
    const payload = await req.text();
    
    // Verificar assinatura do evento
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      logStep("Evento verificado", { type: event.type });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Erro na verificação do webhook", { error: errorMessage });
      
      return new Response(JSON.stringify({ error: "Assinatura do webhook inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Inicializar Supabase com service role para poder escrever no banco
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completado", { 
          id: session.id, 
          customerId: session.customer, 
          mode: session.mode 
        });
        
        if (!session.client_reference_id) {
          logStep("Checkout sem client_reference_id, ignorando");
          break;
        }

        // Processar baseado no modo da sessão
        if (session.mode === "subscription") {
          // Atualizar assinatura no banco de dados
          const userId = session.client_reference_id;
          const planId = session.metadata?.plan_id;
          
          if (planId) {
            logStep("Atualizando plano do usuário", { userId, planId });
            
            // Obter dados da assinatura do Stripe
            const subscriptions = await stripe.subscriptions.list({
              customer: session.customer as string,
              limit: 1
            });
            
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
              
              // Atualizar no banco
              const { error } = await supabaseAdmin
                .from('user_subscriptions')
                .upsert({
                  user_id: userId,
                  plan_id: planId,
                  stripe_subscription_id: subscription.id,
                  stripe_customer_id: session.customer as string,
                  is_active: true,
                  start_date: new Date().toISOString(),
                  end_date: currentPeriodEnd.toISOString(),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
                
              if (error) {
                logStep("Erro ao atualizar assinatura no banco", { error });
              } else {
                logStep("Assinatura atualizada com sucesso");
              }
            }
          }
        } else if (session.mode === "payment") {
          // Processar compra de gift
          const userId = session.client_reference_id;
          const giftId = session.metadata?.gift_id;
          const quantity = session.metadata?.quantity ? 
            parseInt(session.metadata.quantity) : 1;
          
          if (giftId) {
            logStep("Registrando compra de presente", { userId, giftId, quantity });
            
            // Buscar informações do gift
            const { data: giftData, error: giftError } = await supabaseAdmin
              .from('gifts')
              .select('*')
              .eq('id', giftId)
              .single();
            
            if (giftError || !giftData) {
              logStep("Erro ao buscar gift", { error: giftError });
              break;
            }

            // Registrar compras (uma entrada para cada quantidade)
            const purchases = [];
            
            for (let i = 0; i < quantity; i++) {
              purchases.push({
                user_id: userId,
                gift_id: giftId,
                price_paid: giftData.price,
                purchase_date: new Date().toISOString(),
                transaction_details: {
                  payment_method: 'stripe',
                  stripe_session_id: session.id,
                  status: 'completed',
                  timestamp: new Date().toISOString()
                }
              });
            }
            
            if (purchases.length > 0) {
              const { error: purchaseError } = await supabaseAdmin
                .from('user_purchased_gifts')
                .insert(purchases);
                
              if (purchaseError) {
                logStep("Erro ao registrar compras", { error: purchaseError });
              } else {
                logStep(`${quantity} presentes registrados com sucesso`);
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Atualização de assinatura", { 
          id: subscription.id, 
          customerId: subscription.customer,
          status: subscription.status
        });
        
        // Buscar usuário pelo customer_id do Stripe
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .maybeSingle();
        
        if (profileError) {
          logStep("Erro ao buscar perfil do usuário", { error: profileError });
          break;
        }
        
        if (!profiles) {
          logStep("Perfil não encontrado para o customer_id", { customerId: subscription.customer });
          break;
        }
        
        const userId = profiles.id;
        
        // Determinar o plano pelo item de assinatura
        if (subscription.items.data.length > 0) {
          const priceId = subscription.items.data[0].price.id;
          
          // Buscar plano pelo stripe_price_id
          const { data: planData, error: planError } = await supabaseAdmin
            .from('plans')
            .select('id')
            .eq('stripe_price_id', priceId)
            .maybeSingle();
          
          if (planError || !planData) {
            logStep("Erro ao buscar plano pelo price_id", { 
              error: planError, 
              priceId 
            });
            break;
          }
          
          const planId = planData.id;
          const isActive = subscription.status === 'active' || 
                           subscription.status === 'trialing';
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          
          // Atualizar assinatura
          const { error: updateError } = await supabaseAdmin
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: planId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              is_active: isActive,
              start_date: new Date(subscription.current_period_start * 1000).toISOString(),
              end_date: currentPeriodEnd.toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
          
          if (updateError) {
            logStep("Erro ao atualizar assinatura", { error: updateError });
          } else {
            logStep("Assinatura atualizada com sucesso", { userId, planId, isActive });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Assinatura cancelada", { 
          id: subscription.id, 
          customerId: subscription.customer 
        });
        
        // Buscar usuário pelo customer_id
        const { data: profiles, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .maybeSingle();
        
        if (profileError || !profiles) {
          logStep("Perfil não encontrado", { 
            error: profileError, 
            customerId: subscription.customer 
          });
          break;
        }
        
        const userId = profiles.id;
        
        // Marcar assinatura como inativa
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('stripe_subscription_id', subscription.id);
        
        if (updateError) {
          logStep("Erro ao marcar assinatura como inativa", { error: updateError });
        } else {
          logStep("Assinatura marcada como inativa", { userId });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Processar pagamento de fatura bem-sucedido
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Pagamento de fatura bem-sucedido", { 
          id: invoice.id, 
          customerId: invoice.customer 
        });

        if (invoice.subscription) {
          // Atualizar data de renovação da assinatura
          const { data: subscriptionData } = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          
          // Buscar usuário pelo customer_id
          const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', invoice.customer)
            .maybeSingle();
            
          if (!profileError && profiles) {
            const userId = profiles.id;
            const currentPeriodEnd = new Date(subscriptionData.current_period_end * 1000);
            
            // Atualizar data de fim da assinatura
            await supabaseAdmin
              .from('user_subscriptions')
              .update({ 
                end_date: currentPeriodEnd.toISOString(),
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .eq('stripe_subscription_id', invoice.subscription);
            
            logStep("Data de fim da assinatura atualizada", { 
              userId, 
              newEndDate: currentPeriodEnd 
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Processar falha no pagamento da fatura
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Falha no pagamento da fatura", { 
          id: invoice.id, 
          customerId: invoice.customer 
        });
        
        if (invoice.subscription) {
          // Buscar usuário pelo customer_id
          const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', invoice.customer)
            .maybeSingle();
            
          if (!profileError && profiles) {
            const userId = profiles.id;
            
            // Pode marcar a assinatura com um status de falha ou enviar notificação
            logStep("Falha no pagamento registrada para usuário", { userId });
          }
        }
        break;
      }
      
      default:
        logStep(`Evento não processado: ${event.type}`);
    }
    
    // Retornar sucesso
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[STRIPE-WEBHOOK] ERROR: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
