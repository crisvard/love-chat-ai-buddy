
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { verifyCheckoutResult } from "@/services/checkout";
import { getCurrentSubscription } from "@/services/subscription";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{success: boolean, message: string}>({
    success: true,
    message: "Estamos processando seu pagamento."
  });
  
  useEffect(() => {
    const checkPayment = async () => {
      try {
        setLoading(true);
        
        // Obter session_id da URL
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('session_id');
        
        // Verificar o resultado do checkout
        if (sessionId) {
          const result = await verifyCheckoutResult(sessionId);
          setStatus(result);
        } else {
          // Se não tiver session_id, apenas atualizamos a assinatura
          await getCurrentSubscription(true);
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        setStatus({
          success: false,
          message: "Não foi possível verificar o status do pagamento."
        });
      } finally {
        setLoading(false);
      }
    };
    
    checkPayment();
  }, [location]);
  
  const handleGoBack = () => {
    navigate('/');
  };
  
  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Pagamento Recebido</CardTitle>
          <CardDescription className="text-center">
            Obrigado pela sua compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
              <p className="text-center text-gray-600">Verificando seu pagamento...</p>
            </div>
          ) : (
            <div className={`text-center py-4 ${status.success ? 'text-green-700' : 'text-amber-700'}`}>
              {status.message}
            </div>
          )}
          <p className="text-center text-gray-500 mt-4">
            Você já pode começar a desfrutar dos benefícios da sua compra.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="default"
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o início
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
