
import React from 'react';

interface ChatGiftItemProps {
  emoji: string;
}

export const ChatGiftItem: React.FC<ChatGiftItemProps> = ({ emoji }) => {
  return (
    <div className="flex justify-center my-4">
      <div className="animate-bounce text-6xl">{emoji}</div>
    </div>
  );
};
