
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
      console.log(`Tentando login admin com: ${email}`);
      
      // Usar credenciais diretas para login administrativo
      if ((email === 'armempires@gmail.com' && password === 'mudar123') || 
          (email === 'admin' && password === 'admin')) {
        
        console.log("Using special admin credentials");
        
        // Determinar qual email usar para login real
        const loginEmail = email === 'admin' ? 'admin@example.com' : email;
        const loginPassword = email === 'admin' ? 'adminpassword' : password;
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });
        
        if (error) {
          console.error("Erro de login:", error.message);
          throw new Error("Falha na autenticação de administrador. Verifique suas credenciais.");
        }
        
        console.log("Direct admin login successful");
        
        toast({
          title: "Login realizado",
          description: "Login de administrador bem-sucedido!",
        });
        
        onLoginSuccess();
        return;
      } else {
        throw new Error("Credenciais de administrador inválidas.");
      }
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
    <Dialog open={isOpen} onOpenChange={() => {}}>
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
          
          <p className="text-xs text-gray-500 text-center">
            Acesso com: admin / admin<br/>
            ou armempires@gmail.com / mudar123
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLoginDialog;
