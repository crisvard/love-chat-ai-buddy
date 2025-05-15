
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { purchaseGiftCheckout } from "@/services/checkout";
import { fetchActiveGifts, fetchUserPurchasedGifts, UserPurchasedGift } from "@/services/gifts";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: string;
}

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiftSelected: (gift: UserPurchasedGift) => void;
}

export function GiftsModal({ isOpen, onClose, onGiftSelected }: GiftsModalProps) {
  const [activeTab, setActiveTab] = useState<"shop" | "inventory">("shop");
  const [availableGifts, setAvailableGifts] = useState<Gift[]>([]);
  const [purchasedGifts, setPurchasedGifts] = useState<UserPurchasedGift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingGiftId, setPurchasingGiftId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadGifts();
    }
  }, [isOpen]);

  const loadGifts = async () => {
    setIsLoading(true);
    try {
      // Load available gifts from store
      const gifts = await fetchActiveGifts();
      setAvailableGifts(
        gifts.map((g) => ({
          id: g.id,
          name: g.name,
          emoji: g.emoji || "🎁",
          price: g.price.toString(),
        }))
      );

      // Load user's purchased gifts
      const userGifts = await fetchUserPurchasedGifts();
      setPurchasedGifts(userGifts.filter(g => !g.used_in_chat_message_id));
    } catch (error) {
      console.error("Error loading gifts:", error);
      toast({
        title: "Erro ao carregar presentes",
        description: "Não foi possível carregar a lista de presentes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseGift = async (gift: Gift) => {
    setPurchasingGiftId(gift.id);
    
    try {
      console.log("Iniciando checkout para gift:", gift.id);
      const success = await purchaseGiftCheckout(gift.id);
      
      if (!success) {
        throw new Error("Não foi possível iniciar o processo de compra");
      }
      
      toast({
        title: "Redirecionando para pagamento",
        description: "Você será redirecionado para a página de pagamento do Stripe.",
        variant: "success",
      });
      
      // O redirecionamento é feito pela função purchaseGiftCheckout
    } catch (error) {
      console.error("Error purchasing gift:", error);
      toast({
        title: "Erro ao comprar presente",
        description: "Ocorreu um erro ao processar sua compra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPurchasingGiftId(null);
    }
  };

  const handleSelectPurchasedGift = (gift: UserPurchasedGift) => {
    onGiftSelected(gift);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar presente</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "shop" | "inventory")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shop">Comprar</TabsTrigger>
            <TabsTrigger value="inventory">Meus Presentes</TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="border rounded-lg p-3 flex flex-col items-center hover:bg-slate-50 transition"
                  >
                    <div className="text-4xl mb-2">{gift.emoji}</div>
                    <div className="font-medium text-sm">{gift.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">R$ {gift.price}</div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handlePurchaseGift(gift)}
                      disabled={purchasingGiftId === gift.id}
                    >
                      {purchasingGiftId === gift.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Aguarde...
                        </>
                      ) : (
                        "Comprar"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : purchasedGifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Você não possui nenhum presente disponível.</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("shop")}
                  className="mt-2"
                >
                  Compre seus presentes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {purchasedGifts.map((purchasedGift) => (
                  <div
                    key={purchasedGift.id}
                    className="border rounded-lg p-3 flex flex-col items-center hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => handleSelectPurchasedGift(purchasedGift)}
                  >
                    <div className="text-4xl mb-2">{purchasedGift.gift?.emoji || "🎁"}</div>
                    <div className="font-medium text-sm">{purchasedGift.gift?.name || "Presente"}</div>
                    <Button size="sm" className="w-full mt-2">
                      Enviar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
