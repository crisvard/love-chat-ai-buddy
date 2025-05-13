
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Gift, fetchActiveGifts } from '@/services/gifts';

interface GiftContextType {
  gifts: Gift[];
  isLoading: boolean;
  openGiftModal: () => void;
  selectedGift: Gift | null;
  setSelectedGift: (gift: Gift | null) => void;
  isGiftModalOpen: boolean;
  closeGiftModal: () => void;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

export const GiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  useEffect(() => {
    const loadGifts = async () => {
      setIsLoading(true);
      const activeGifts = await fetchActiveGifts();
      setGifts(activeGifts);
      setIsLoading(false);
    };
    
    loadGifts();
  }, []);

  const openGiftModal = () => {
    setIsGiftModalOpen(true);
  };

  const closeGiftModal = () => {
    setIsGiftModalOpen(false);
    setSelectedGift(null);
  };

  return (
    <GiftContext.Provider value={{ 
      gifts, 
      isLoading, 
      openGiftModal, 
      selectedGift, 
      setSelectedGift,
      isGiftModalOpen,
      closeGiftModal
    }}>
      {children}
    </GiftContext.Provider>
  );
};

export const useGift = (): GiftContextType => {
  const context = useContext(GiftContext);
  if (context === undefined) {
    throw new Error('useGift must be used within a GiftProvider');
  }
  return context;
};
