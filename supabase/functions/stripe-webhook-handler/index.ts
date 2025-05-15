
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Helper para logging
const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ': ' + JSON.stringify(details) : ''}`);
};

// Para este endpoint, não precisamos de CORS, pois é chamado diretamente pelo Stripe
serve(async (req) => {
  try {
    logStep("Webhook recebido");
    
    // Obter chaves necessárias
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não está configurada");
    }
    
    if (!stripeWebhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET não está configurada");
    }
    
    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    // Inicializar Supabase com service role (para bypass de RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Verificar assinatura do webhook
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Assinatura do webhook não encontrada");
    }
    
    const body = await req.text();
    logStep("Corpo da requisição recebido");
    
    // Verificar a assinatura do evento
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      logStep("Evento verificado", { type: event.type });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`⚠️ Erro na assinatura do webhook: ${errorMessage}`);
      return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
    }
    
    // Obter o objeto de dados do evento
    const data = event.data.object;
    
    // Lidar com diferentes tipos de eventos
    switch (event.type) {
      case "checkout.session.completed": {
        logStep("Checkout completado", { id: data.id, mode: data.mode });
        
        const session = data as Stripe.Checkout.Session;
        const { metadata } = session;
        
        if (!metadata || !metadata.supabase_user_id) {
          throw new Error("Metadados da sessão não contêm o ID do usuário");
        }
        
        const userId = metadata.supabase_user_id;
        const itemType = metadata.item_type;
        
        if (session.mode === "subscription") {
          // Lidar com checkout de assinatura
          if (!session.subscription) {
            logStep("Sessão de assinatura sem ID de assinatura");
            break;
          }
          
          // Buscar dados da assinatura
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          // Buscar o ID do plano a partir dos metadados
          const planId = metadata.item_id;
          if (!planId) {
            throw new Error("ID do plano não encontrado nos metadados");
          }
          
          // Registrar ou atualizar assinatura no Supabase
          await supabaseAdmin.from("user_subscriptions").upsert({
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            status: subscription.status,
            is_active: subscription.status === "active" || subscription.status === "trialing",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            end_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,stripe_subscription_id'
          });
          
          logStep("Assinatura registrada/atualizada no banco", { userId, planId });
        } else if (session.mode === "payment") {
          // Lidar com pagamentos de gift
          if (!session.payment_intent) {
            logStep("Sessão de pagamento sem ID de pagamento");
            break;
          }
          
          // Buscar o ID do gift a partir dos metadados
          const giftId = metadata.item_id;
          const quantity = parseInt(metadata.quantity || "1");
          
          if (!giftId) {
            throw new Error("ID do gift não encontrado nos metadados");
          }
          
          // Buscar valor total pago
          const paymentIntentId = session.payment_intent as string;
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const amountPaid = paymentIntent.amount / 100; // Converter de centavos para reais
          
          // Registrar o gift comprado no Supabase
          await supabaseAdmin.from("user_purchased_gifts").insert({
            user_id: userId,
            gift_id: giftId,
            stripe_payment_intent_id: paymentIntentId,
            purchase_date: new Date().toISOString(),
            quantity: quantity,
            price_paid: amountPaid,
            transaction_details: { 
              payment_method: paymentIntent.payment_method_types?.[0] || 'card', 
              status: 'completed',
              timestamp: new Date().toISOString()
            }
          });
          
          logStep("Compra de gift registrada no banco", { userId, giftId });
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        logStep("Pagamento de fatura bem-sucedido");
        
        const invoice = data as Stripe.Invoice;
        if (!invoice.subscription) {
          logStep("Fatura sem ID de assinatura");
          break;
        }
        
        // Buscar a assinatura associada à fatura
        const subscriptionId = invoice.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Buscar o cliente e o usuário associado
        const customerId = invoice.customer as string;
        
        // Buscar o usuário pelo customer_id
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        
        // Buscar assinatura atual no banco de dados
        const { data: subscriptions } = await supabaseAdmin
          .from("user_subscriptions")
          .select("*")
          .eq("stripe_subscription_id", subscriptionId)
          .eq("user_id", userId);
          
        // Se não existir, precisamos buscar mais informações do plano
        if (!subscriptions || subscriptions.length === 0) {
          logStep("Assinatura não encontrada no banco", { subscriptionId });
          
          // Tentar determinar o plano pelo produto
          const items = subscription.items.data;
          if (items.length > 0) {
            const priceId = items[0].price.id;
            
            // Buscar plano pelo price_id
            const { data: plans } = await supabaseAdmin
              .from("plans")
              .select("*")
              .eq("stripe_price_id", priceId);
              
            if (plans && plans.length > 0) {
              const planId = plans[0].id;
              
              // Criar registro de assinatura
              await supabaseAdmin.from("user_subscriptions").insert({
                user_id: userId,
                plan_id: planId,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                status: subscription.status,
                is_active: subscription.status === "active" || subscription.status === "trialing",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              });
              
              logStep("Nova assinatura registrada no banco", { userId, planId });
            }
          }
        } else {
          // Atualizar a assinatura existente
          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              status: subscription.status,
              is_active: subscription.status === "active" || subscription.status === "trialing",
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId)
            .eq("user_id", userId);
            
          logStep("Assinatura atualizada no banco", { subscriptionId });
        }
        break;
      }
      
      case "invoice.payment_failed": {
        logStep("Pagamento de fatura falhou");
        
        const invoice = data as Stripe.Invoice;
        if (!invoice.subscription) {
          logStep("Fatura sem ID de assinatura");
          break;
        }
        
        // Buscar a assinatura associada à fatura
        const subscriptionId = invoice.subscription as string;
        
        // Atualizar o status da assinatura no banco
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);
          
        logStep("Status da assinatura atualizado para past_due", { subscriptionId });
        break;
      }
      
      // Novo: Assinatura criada
      case "customer.subscription.created": {
        logStep("Assinatura criada");
        
        const subscription = data as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Buscar o usuário pelo customer_id
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        
        // Determinar o plano pelo produto/preço
        const items = subscription.items.data;
        if (items.length === 0) {
          logStep("Assinatura sem itens", { subscriptionId: subscription.id });
          break;
        }
        
        const priceId = items[0].price.id;
        
        // Buscar plano pelo price_id
        const { data: plans } = await supabaseAdmin
          .from("plans")
          .select("*")
          .eq("stripe_price_id", priceId);
          
        if (!plans || plans.length === 0) {
          logStep("Plano não encontrado para o price_id", { priceId });
          break;
        }
        
        const planId = plans[0].id;
        
        // Criar/atualizar o registro da assinatura (upsert para garantir idempotência)
        await supabaseAdmin.from("user_subscriptions").upsert({
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          is_active: subscription.status === "active" || subscription.status === "trialing",
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          end_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,stripe_subscription_id'
        });
        
        logStep("Assinatura registrada/atualizada no banco", { subscriptionId: subscription.id, planId });
        break;
      }
      
      // Novo: Notificação de término de período trial
      case "customer.subscription.trial_will_end": {
        logStep("Período de teste da assinatura terminará em breve");
        
        const subscription = data as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Buscar o usuário pelo customer_id
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email, name")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        const userEmail = profiles[0].email;
        const userName = profiles[0].name;
        
        // Aqui você implementaria o envio de email ou notificação
        logStep("Notificar usuário sobre fim do período de teste", { 
          userId, 
          userEmail,
          trialEnd: new Date(subscription.trial_end! * 1000).toISOString()
        });
        
        // TODO: Implementar lógica de notificação
        // Exemplo de como seria salvar uma notificação no banco:
        // await supabaseAdmin.from('notifications').insert({
        //   user_id: userId,
        //   type: 'trial_ending',
        //   title: 'Seu período de teste está terminando',
        //   body: `Olá ${userName}, seu período de teste termina em ${new Date(subscription.trial_end! * 1000).toLocaleDateString()}.`,
        //   is_read: false,
        //   created_at: new Date().toISOString()
        // });
        
        break;
      }
      
      // Novo: Fatura criada
      case "invoice.created": {
        logStep("Fatura criada");
        // Geralmente apenas confirmar recebimento é suficiente
        // No entanto, você poderia salvar informações da fatura para referência futura
        break;
      }
      
      // Novo: Fatura finalizada
      case "invoice.finalized": {
        logStep("Fatura finalizada");
        
        const invoice = data as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Buscar o usuário pelo customer_id
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        const userEmail = profiles[0].email;
        
        // Aqui você implementaria o envio da fatura por email
        logStep("Fatura finalizada para usuário", { 
          userId, 
          userEmail,
          invoiceId: invoice.id,
          amount: invoice.total / 100
        });
        
        // TODO: Implementar envio de fatura
        break;
      }
      
      // Novo: Notificação de fatura próxima
      case "invoice.upcoming": {
        logStep("Fatura próxima");
        
        const invoice = data as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Buscar o usuário pelo customer_id
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email, name")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        const userEmail = profiles[0].email;
        const userName = profiles[0].name;
        
        // Aqui você implementaria o envio de notificação sobre a fatura próxima
        logStep("Notificar usuário sobre fatura próxima", { 
          userId, 
          userEmail,
          invoiceDate: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
          amount: invoice.total ? invoice.total / 100 : null
        });
        
        // TODO: Implementar lógica de notificação
        break;
      }
      
      case "customer.subscription.updated": {
        logStep("Assinatura atualizada");
        
        const subscription = data as Stripe.Subscription;
        
        // Buscar o usuário pelo customer_id
        const customerId = subscription.customer as string;
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);
          
        if (!profiles || profiles.length === 0) {
          logStep("Usuário não encontrado para o customer_id", { customerId });
          break;
        }
        
        const userId = profiles[0].id;
        
        // Atualizar assinatura no banco
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: subscription.status,
            is_active: subscription.status === "active" || subscription.status === "trialing",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            end_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id)
          .eq("user_id", userId);
          
        logStep("Assinatura atualizada no banco", { id: subscription.id, status: subscription.status });
        break;
      }
      
      case "customer.subscription.deleted": {
        logStep("Assinatura cancelada");
        
        const subscription = data as Stripe.Subscription;
        
        // Atualizar assinatura no banco
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "canceled",
            is_active: false,
            end_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);
          
        logStep("Assinatura marcada como cancelada no banco", { id: subscription.id });
        break;
      }
      
      default:
        logStep(`Evento não processado: ${event.type}`);
    }
    
    // Retornar sucesso
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] stripe-webhook: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
