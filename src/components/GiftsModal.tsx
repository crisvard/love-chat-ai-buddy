
import { useState, useEffect } from "react";
import { Gift, fetchActiveGifts, purchaseGift } from "@/services/gifts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiftSelected: (giftPurchase: any) => void;
}

export function GiftsModal({ isOpen, onClose, onGiftSelected }: GiftsModalProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  
  useEffect(() => {
    const loadGifts = async () => {
      setLoading(true);
      const activeGifts = await fetchActiveGifts();
      setGifts(activeGifts);
      setLoading(false);
    };
    
    if (isOpen) {
      loadGifts();
    }
  }, [isOpen]);
  
  const handleGiftClick = (gift: Gift) => {
    setSelectedGift(gift);
  };
  
  const handlePurchase = async () => {
    if (!selectedGift) return;
    
    try {
      setPurchasing(true);
      const giftPurchase = await purchaseGift(selectedGift.id, selectedGift.price);
      
      if (giftPurchase) {
        onGiftSelected({
          ...giftPurchase,
          gift: selectedGift
        });
        onClose();
      }
    } finally {
      setPurchasing(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprar Presentes</DialogTitle>
          <DialogDescription>
            Escolha um presente especial para enviar na conversa
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : gifts.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            Nenhum presente disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-4">
            {gifts.map((gift) => (
              <div 
                key={gift.id}
                onClick={() => handleGiftClick(gift)}
                className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all
                  ${selectedGift?.id === gift.id 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'}`}
              >
                <div className="text-4xl mb-2">
                  {gift.emoji || "🎁"}
                </div>
                <div className="text-sm font-medium text-center">{gift.name}</div>
                <div className="text-sm text-purple-700 font-bold mt-1">
                  R${gift.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            onClick={handlePurchase} 
            disabled={!selectedGift || purchasing || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando
              </>
            ) : selectedGift ? (
              `Comprar ${selectedGift.name} por R$${selectedGift.price.toFixed(2)}`
            ) : (
              "Selecione um presente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
