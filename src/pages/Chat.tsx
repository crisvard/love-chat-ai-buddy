
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Mic, Send, Phone, Video, Image, Smile } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Dados do agente (em um aplicativo real, viriam do banco de dados)
  const agent = {
    name: "Ana",
    nickname: "Amor",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  };
  
  // Simular algumas mensagens iniciais
  useEffect(() => {
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
  }, []);
  
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
      
      {/* Barra de entrada de mensagem */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Smile className="h-5 w-5" />
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
