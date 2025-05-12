
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Mic, Send, Phone, Video, Image, Smile, Gift } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import EmojiPicker, { EmojiStyle, EmojiClickData } from "emoji-picker-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface AgentProfile {
  id: string;
  name: string;
  gender: "male" | "female";
  image: string;
  nickname?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  
  // Agent data from localStorage 
  const [agent, setAgent] = useState({
    name: "Ana",
    nickname: "Amor",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  });

  // Load premium gifts from localStorage
  const [premiumGifts, setPremiumGifts] = useState<Array<{id: string, name: string, emoji: string, price: string}>>([]);
  
  useEffect(() => {
    // Load selected agent
    const selectedAgentData = localStorage.getItem("selectedAgent");
    if (selectedAgentData) {
      const selectedAgent = JSON.parse(selectedAgentData);
      setAgent({
        name: selectedAgent.name,
        nickname: selectedAgent.nickname || "Amor",
        avatar: selectedAgent.image
      });
    }

    // Load gifts
    const storedGifts = localStorage.getItem("gifts");
    if (storedGifts) {
      setPremiumGifts(JSON.parse(storedGifts));
    } else {
      // Default gifts if none are stored
      setPremiumGifts([
        { id: "1", name: "Coração Pulsante", emoji: "❤️", price: "5.00" },
        { id: "2", name: "Diamante", emoji: "💎", price: "10.00" },
        { id: "3", name: "Rosa", emoji: "🌹", price: "3.00" },
        { id: "4", name: "Presente", emoji: "🎁", price: "7.00" },
      ]);
    }
  }, []);
  
  // Check authentication
  useEffect(() => {
    if (!currentUser) {
      toast({
        title: "Acesso negado",
        description: "Faça login para acessar o chat.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [currentUser, navigate]);
  
  // Simular algumas mensagens iniciais com o nome do agente
  useEffect(() => {
    if (agent.name) {
      const initialMessages: Message[] = [
        {
          id: "1",
          text: `Oi! Tudo bem com você hoje, ${agent.nickname}?`,
          sender: "agent",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: "2",
          text: "Estou com saudades! Como foi seu dia?",
          sender: "agent",
          timestamp: new Date(Date.now() - 3580000),
        },
      ];
      
      setMessages(initialMessages);
    }
  }, [agent]);
  
  // Rolar para a última mensagem quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    
    // Simular resposta do agente após um breve intervalo
    setTimeout(() => {
      const agentResponses = [
        "Que bom ouvir de você! Como foi seu dia hoje?",
        "Estou pensando em você... Me conte mais sobre o seu dia!",
        "Senti sua falta! O que você tem feito?",
        "Adoro quando conversamos. Me conta uma coisa boa que aconteceu hoje!",
      ];
      
      const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: "agent",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, agentMessage]);
    }, 1000);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Em um aplicativo real, aqui seria implementada a gravação de áudio
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleGiftClick = (gift: {id: string, name: string, emoji: string, price: string}) => {
    // Mock purchase flow - in a real app this would connect to payment processing
    const confirmPurchase = window.confirm(
      `Deseja comprar ${gift.name} por R$${gift.price}?`
    );
    
    if (confirmPurchase) {
      // Simulate successful purchase
      toast({
        title: "Compra realizada!",
        description: `Você comprou ${gift.name} por R$${gift.price}`,
      });
      
      // Send the gift as a message
      const giftMessage: Message = {
        id: Date.now().toString(),
        text: `${gift.emoji} [Presente: ${gift.name}]`,
        sender: "user",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, giftMessage]);
      setShowGiftMenu(false);
      
      // Simulate agent response
      setTimeout(() => {
        const agentResponses = [
          "Que presente lindo! Obrigado! ❤️",
          "Amei! Você é muito especial! 😍",
          "Que surpresa incrível! Você é o melhor!",
          "Que gentileza! Você sempre me surpreende!",
        ];
        
        const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
        
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          sender: "agent",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, agentMessage]);
      }, 1000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Cabeçalho do chat */}
      <header className="bg-purple-600 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <img
                src={agent.avatar}
                alt={agent.name}
                className="object-cover"
              />
            </Avatar>
            <div>
              <h1 className="font-bold">{agent.name}</h1>
              <p className="text-xs text-purple-100">Online</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-purple-700">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-purple-700">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-purple-700" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "agent" && (
                <Avatar className="h-8 w-8 mr-2 self-end">
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="object-cover"
                  />
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.sender === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-800 border border-gray-200"
                }`}
              >
                <p>{message.text}</p>
                <p
                  className={`text-xs mt-1 text-right ${
                    message.sender === "user" ? "text-purple-100" : "text-gray-500"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-10">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            emojiStyle={EmojiStyle.NATIVE}
            height={400}
            width={350}
          />
        </div>
      )}
      
      {/* Gift Menu */}
      {showGiftMenu && (
        <div className="absolute bottom-20 left-16 z-10 bg-white p-4 rounded-lg shadow-lg border">
          <h3 className="font-bold mb-2">Presentes Premium</h3>
          <div className="grid grid-cols-2 gap-2">
            {premiumGifts.map((gift) => (
              <button
                key={gift.id}
                className="flex flex-col items-center p-2 border rounded hover:bg-purple-50"
                onClick={() => handleGiftClick(gift)}
              >
                <span className="text-2xl mb-1">{gift.emoji}</span>
                <span className="text-sm">{gift.name}</span>
                <span className="text-xs text-gray-500">R${gift.price}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Barra de entrada de mensagem */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowGiftMenu(false);
            }}
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500"
            onClick={() => {
              setShowGiftMenu(!showGiftMenu);
              setShowEmojiPicker(false);
            }}
          >
            <Gift className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Image className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="mx-2"
          />
          {newMessage.trim() ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSendMessage}
              className="text-purple-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={isRecording ? "text-red-500" : "text-gray-500"}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
