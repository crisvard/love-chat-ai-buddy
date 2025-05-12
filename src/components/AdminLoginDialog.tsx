
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdminLoginDialogProps {
  isOpen: boolean;
  onLoginSuccess: () => void;
}

const AdminLoginDialog = ({ isOpen, onLoginSuccess }: AdminLoginDialogProps) => {
  const [email, setEmail] = useState("armempires@gmail.com");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log(`Tentando login admin direto com: ${email}`);
      
      // Check for admin credentials
      if (email === 'armempires@gmail.com' && password === 'mudar123') {
        try {
          // Try direct login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
          
          if (error) {
            // Try fallback admin credentials
            console.log("Login direto falhou, tentando com admin@example.com");
            const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
              email: 'admin@example.com',
              password: 'adminpassword'
            });
            
            if (adminError) {
              throw new Error("Falha na autenticação de administrador");
            } else {
              console.log("Login admin bem-sucedido via fallback");
              
              // Set admin subscription
              if (adminData.user) {
                try {
                  await supabase
                    .from('user_subscriptions')
                    .upsert({
                      user_id: adminData.user.id,
                      plan_id: 'admin',
                      start_date: new Date().toISOString(),
                      end_date: null,
                      is_active: true
                    }, { onConflict: 'user_id' });
                } catch (err) {
                  console.error("Erro ao configurar o plano admin:", err);
                }
              }
              
              onLoginSuccess();
              return;
            }
          } else {
            // Direct login succeeded, ensure admin role
            console.log("Login direto admin bem-sucedido");
            if (data.user) {
              try {
                await supabase
                  .from('user_subscriptions')
                  .upsert({
                    user_id: data.user.id,
                    plan_id: 'admin',
                    start_date: new Date().toISOString(),
                    end_date: null,
                    is_active: true
                  }, { onConflict: 'user_id' });
              } catch (err) {
                console.error("Erro ao configurar o plano admin:", err);
              }
            }
            
            onLoginSuccess();
            return;
          }
        } catch (error) {
          console.error("Erro no login admin:", error);
          throw error;
        }
      }
      
      // Special admin login fallback 
      if (email === 'admin' && password === 'admin') {
        console.log("Tentando login admin especial");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com', 
          password: 'adminpassword'
        });
        
        if (error) {
          throw new Error("Falha na autenticação de administrador");
        }
        
        console.log("Login admin bem-sucedido, redirecionando");
        onLoginSuccess();
        return;
      }
      
      // Regular login attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) throw error;
      
      // Check if user is admin via subscription
      if (data.user) {
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('plan_id')
          .eq('user_id', data.user.id)
          .eq('plan_id', 'admin')
          .single();
        
        if (subError || !subscription) {
          throw new Error("Usuário não tem permissões de administrador");
        }
      }
      
      console.log("Login bem-sucedido");
      onLoginSuccess();
      
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Falha na autenticação. Verifique suas credenciais de administrador.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Acesso de Administrador</DialogTitle>
          <DialogDescription>
            Por favor, faça login com suas credenciais de administrador para acessar o painel.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleLogin} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="admin-email" className="text-sm font-medium">Email</label>
            <Input
              id="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email.admin@exemplo.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium">Senha</label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar como Administrador"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLoginDialog;
