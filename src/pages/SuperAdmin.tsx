
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import { supabase } from "@/integrations/supabase/client";

const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(true);

  const handleLoginSuccess = () => {
    setShowDialog(false);
    toast({
      title: "Acesso concedido",
      description: "Você será redirecionado para o painel administrativo.",
    });
    setTimeout(() => navigate("/admin"), 1000);
  };

  // Verificar se o usuário já está logado como admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (session && session.session) {
          // Verificar se é admin via email
          const { data: user } = await supabase.auth.getUser();
          const email = user?.user?.email;
          
          if (email && (email === "armempires@gmail.com" || email === "admin@example.com")) {
            // Já está logado como admin, redirecionar
            toast({
              title: "Já autenticado como admin",
              description: "Você será redirecionado para o painel administrativo.",
            });
            navigate("/admin");
            return;
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Erro ao verificar status de admin:", error);
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="mt-2 text-gray-600">Verificando credenciais...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Administrativo</h1>
          <p className="mt-2 text-gray-600">Entre com suas credenciais de administrador</p>
        </div>
      </div>
      
      <AdminLoginDialog 
        isOpen={showDialog} 
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default SuperAdmin;
