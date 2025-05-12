
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Tipos para os agentes
interface AgentProfile {
  id: string;
  name: string;
  gender: "male" | "female";
  image: string;
}

const Personalize = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>([]);
  
  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa estar logado para personalizar seu namorado virtual.",
      });
      navigate("/login");
      return;
    }
    
    // Load existing selection if any
    const fetchUserAgentSelection = async () => {
      try {
        const { data, error } = await supabase
          .from('user_agent_selections')
          .select('*, agents(*)')
          .eq('user_id', currentUser.id)
          .single();
          
        if (!error && data) {
          setSelectedAgent(data.agents as AgentProfile);
          setNickname(data.nickname);
        }
      } catch (error) {
        console.error("Error fetching user agent selection:", error);
      }
    };
    
    // Fetch all available agents from Supabase
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*');
          
        if (error) throw error;
        
        setAgentProfiles(data);
      } catch (error) {
        console.error("Error fetching agents:", error);
        
        // Fallback to local storage
        const savedAgents = localStorage.getItem("agentProfiles");
        if (savedAgents) {
          setAgentProfiles(JSON.parse(savedAgents));
        }
      }
    };
    
    fetchAgents();
    if (currentUser) {
      fetchUserAgentSelection();
    }
  }, [currentUser, navigate]);
  
  const handleSelectAgent = (agent: AgentProfile) => {
    setSelectedAgent(agent);
  };
  
  const handleSubmit = async () => {
    if (!selectedAgent) {
      toast({
        variant: "destructive",
        title: "Selecione um perfil",
        description: "Escolha um perfil para seu namorado virtual",
      });
      return;
    }
    
    if (!nickname.trim()) {
      toast({
        variant: "destructive",
        title: "Escolha um apelido",
        description: "Defina como você quer chamar seu namorado virtual",
      });
      return;
    }
    
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Você precisa estar logado para continuar.",
      });
      navigate("/login");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('user_agent_selections')
        .upsert({
          user_id: currentUser.id,
          agent_id: selectedAgent.id,
          nickname
        }, { onConflict: 'user_id' });
        
      if (error) throw error;
      
      // Also save to localStorage for backwards compatibility
      localStorage.setItem("selectedAgent", JSON.stringify({
        ...selectedAgent,
        nickname
      }));
      
      toast({
        title: "Personalização concluída!",
        description: "Você será redirecionado para o chat",
      });
      
      // Redirecionar para o chat
      setTimeout(() => {
        navigate("/chat");
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao personalizar agente:", error);
      toast({
        variant: "destructive",
        title: "Erro ao personalizar",
        description: "Não foi possível salvar suas configurações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700">Personalize seu namorado virtual</h1>
          <p className="text-gray-600 mt-2">Escolha o perfil e como você deseja chamá-lo(a)</p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Escolha um perfil</h2>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {agentProfiles.map((agent) => (
                <CarouselItem key={agent.id} className="md:basis-1/3 lg:basis-1/4">
                  <div className="p-1">
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedAgent?.id === agent.id 
                          ? "ring-2 ring-purple-500 shadow-md" 
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleSelectAgent(agent)}
                    >
                      <CardContent className="flex flex-col items-center p-6">
                        <Avatar className="w-32 h-32">
                          <img 
                            src={agent.image} 
                            alt={agent.name} 
                            className="object-cover"
                          />
                        </Avatar>
                        <h3 className="mt-4 text-lg font-medium">{agent.name}</h3>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-4">
              <CarouselPrevious className="relative static mx-2" />
              <CarouselNext className="relative static mx-2" />
            </div>
          </Carousel>
        </div>
        
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Como você quer chamá-lo(a)?</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Digite um apelido carinhoso..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-grow"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Exemplo: "Amor", "Meu Docinho", "Querido(a)"
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="px-8"
          >
            {isLoading ? "Processando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Personalize;
