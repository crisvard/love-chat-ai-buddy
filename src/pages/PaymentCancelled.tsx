
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelled() {
  const navigate = useNavigate();
  
  const handleGoBack = () => {
    navigate('/');
  };
  
  return (
    <div className="container max-w-md mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-center text-2xl">Pagamento Cancelado</CardTitle>
          <CardDescription className="text-center">
            Sua compra foi cancelada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 py-4">
            O processo de pagamento foi interrompido ou cancelado. 
            Nenhuma cobrança foi realizada.
          </p>
          <p className="text-center text-gray-500 mt-4">
            Se você encontrou algum problema ou precisar de ajuda, 
            entre em contato com nosso suporte.
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
