
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { GiftsModal } from './GiftsModal';
import { toast } from '@/components/ui/use-toast';
import { purchaseGiftCheckout } from '@/services/checkout';

interface ChatGiftButtonProps {
  onGiftSelected: (giftPurchase: any) => void;
}

export function ChatGiftButton({ onGiftSelected }: ChatGiftButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenGiftModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseGiftModal = () => {
    setIsModalOpen(false);
  };

  const handleGiftSelected = async (gift: any) => {
    try {
      setIsLoading(true);
      
      // Use the purchaseGiftCheckout function to initiate the checkout process
      console.log("Iniciando checkout para gift:", gift.id);
      const success = await purchaseGiftCheckout(gift.id);
      
      if (success) {
        toast({
          title: "Checkout iniciado",
          description: "Você foi redirecionado para a página de pagamento do Stripe.",
          variant: "default"
        });
      } else {
        throw new Error("Não foi possível processar sua solicitação");
      }
      
      // Close the modal
      setIsModalOpen(false);
      
      // Pass the gift to the parent component
      onGiftSelected(gift);
    } catch (error) {
      console.error("Erro ao processar gift:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-purple-600"
        onClick={handleOpenGiftModal}
        title="Enviar presente"
        disabled={isLoading}
      >
        <Gift className="h-5 w-5" />
      </Button>
      
      <GiftsModal 
        isOpen={isModalOpen}
        onClose={handleCloseGiftModal}
        onGiftSelected={handleGiftSelected}
      />
    </>
  );
}
