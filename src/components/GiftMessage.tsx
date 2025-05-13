
import { Gift } from "@/services/gifts";

interface GiftMessageProps {
  gift: Gift;
  senderName: string;
}

export function GiftMessage({ gift, senderName }: GiftMessageProps) {
  return (
    <div className="flex flex-col items-center bg-purple-50 p-4 rounded-lg border-2 border-purple-200 my-4 animate-pulse">
      <div className="text-5xl my-3 animate-bounce">
        {gift.emoji || "🎁"}
      </div>
      <div className="text-sm font-medium text-gray-700 mt-2 text-center">
        {senderName} enviou um presente: <strong>{gift.name}</strong>
      </div>
    </div>
  );
}
