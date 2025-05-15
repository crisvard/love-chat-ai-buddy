
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { GiftsModal } from './GiftsModal';

interface ChatGiftButtonProps {
  onGiftSelected: (giftPurchase: any) => void;
}

export function ChatGiftButton({ onGiftSelected }: ChatGiftButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenGiftModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseGiftModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-purple-600"
        onClick={handleOpenGiftModal}
        title="Enviar presente"
      >
        <Gift className="h-5 w-5" />
      </Button>
      
      <GiftsModal 
        isOpen={isModalOpen}
        onClose={handleCloseGiftModal}
        onGiftSelected={onGiftSelected}
      />
    </>
  );
}
