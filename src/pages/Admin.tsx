import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Gift, UserIcon, DollarSign, Bell, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import AdminLoginDialog from "@/components/AdminLoginDialog";

// Define interfaces for our data types
interface Plan {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
}

interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  country: string;
  plan: string;
}

interface AgentProfile {
  id: string;
  name: string;
  gender: "male" | "female";
  image: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, logout } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [newGift, setNewGift] = useState({ name: "", emoji: "", price: "" });
  const [notification, setNotification] = useState("");
  const [newAgent, setNewAgent] = useState<{ name: string; gender: "male" | "female"; image: string }>({ 
    name: "", 
    gender: "female", 
    image: "" 
  });
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controlar a exibição do diálogo de login
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Verifica se o usuário é admin assim que o componente é carregado
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log("Verificando status de administrador:", currentUser);
      
      if (!currentUser) {
        console.log("Nenhum usuário autenticado, mostrando diálogo de login");
        setShowLoginDialog(true);
        setIsLoading(false);
        return;
      }
      
      // Verificar explicitamente se o email é um dos emails admin conhecidos
      if (currentUser.email === "armempires@gmail.com" || currentUser.email === "admin@example.com") {
        console.log("Email admin reconhecido, carregando dados");
        setShowLoginDialog(false);
        fetchData();
        return;
      }
      
      // Verificar se o usuário tem papel de admin
      if (isAdmin()) {
        console.log("Usuário é administrador, carregando dados");
        setShowLoginDialog(false);
        fetchData();
      } else {
        console.log("Usuário não é administrador, mostrando diálogo de login");
        setShowLoginDialog(true);
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  // Callback para quando o login é bem-sucedido
  const handleLoginSuccess = () => {
    console.log("Login bem-sucedido, fechando diálogo e carregando dados");
    setShowLoginDialog(false);
    fetchData();
  };

  // Fetch all data from Supabase - with enhanced error handling
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching admin data...");
      
      // Fetch plans with error handling
      try {
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*');
          
        if (plansError) {
          console.error("Error fetching plans:", plansError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar planos",
            description: plansError.message,
          });
        } else if (plansData) {
          console.log("Plans data:", plansData);
          
          setPlans(plansData.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price.toString(),
            duration: plan.duration,
            description: plan.description || "",
            features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : []
          })));
        }
      } catch (err: any) {
        console.error("Exception fetching plans:", err);
        setError(prev => prev || `Erro ao carregar planos: ${err.message}`);
      }
      
      // Fetch gifts with error handling
      try {
        const { data: giftsData, error: giftsError } = await supabase
          .from('gifts')
          .select('*');
          
        if (giftsError) {
          console.error("Error fetching gifts:", giftsError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar presentes",
            description: giftsError.message,
          });
        } else if (giftsData) {
          console.log("Gifts data:", giftsData);
          
          setGifts(giftsData.map(gift => ({
            id: gift.id,
            name: gift.name,
            emoji: gift.emoji,
            price: gift.price.toString()
          })));
        }
      } catch (err: any) {
        console.error("Exception fetching gifts:", err);
        setError(prev => prev || `Erro ao carregar presentes: ${err.message}`);
      }
      
      // Fetch agents with error handling
      try {
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*');
          
        if (agentsError) {
          console.error("Error fetching agents:", agentsError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar agentes",
            description: agentsError.message,
          });
        } else if (agentsData) {
          console.log("Agents data:", agentsData);
          
          setAgents(agentsData.map(agent => ({
            id: agent.id,
            name: agent.name,
            gender: agent.gender as "male" | "female",
            image: agent.image
          })));
        }
      } catch (err: any) {
        console.error("Exception fetching agents:", err);
        setError(prev => prev || `Erro ao carregar agentes: ${err.message}`);
      }
      
      // Fetch users (profiles) with error handling
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
          
        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          toast({
            variant: "destructive",
            title: "Erro ao carregar perfis de usuários",
            description: profilesError.message,
          });
        } else if (profilesData) {
          console.log("Profiles data:", profilesData);
          
          // Try to fetch subscriptions
          let subscriptionsData: any[] = [];
          try {
            const { data: subData, error: subError } = await supabase
              .from('user_subscriptions')
              .select('*');
              
            if (subError) {
              console.error("Error fetching subscriptions:", subError);
            } else if (subData) {
              subscriptionsData = subData;
            }
          } catch (err: any) {
            console.error("Exception fetching subscriptions:", err);
          }
          
          // Create user list with or without subscription data
          const usersList = profilesData.map(profile => {
            const subscription = subscriptionsData.find((sub: any) => sub.user_id === profile.id);
            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              country: profile.country,
              plan: subscription ? subscription.plan_id : 'none'
            };
          });
          
          setUsers(usersList);
        }
      } catch (err: any) {
        console.error("Exception fetching user profiles:", err);
        setError(prev => prev || `Erro ao carregar perfis de usuários: ${err.message}`);
      }
      
    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      setError(`Erro geral ao carregar dados: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao carregar os dados: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlan = async (id: string, field: string, value: string) => {
    try {
      // Prepare data based on field type
      const updateData: any = {};
      if (field === 'price') {
        updateData[field] = parseFloat(value);
      } else {
        updateData[field] = value;
      }
      
      console.log(`Updating plan ${id}, field ${field} with value:`, updateData[field]);
      
      const { error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error updating plan:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao atualizar o plano: ${error.message}`,
        });
        return;
      }
      
      console.log("Plan updated successfully");
      
      // Update local state
      setPlans((prevPlans) =>
        prevPlans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
      );
      
      toast({
        title: "Plano atualizado",
        description: `O plano ${id} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao atualizar o plano: ${error.message}`,
      });
    }
  };

  const handleAddGift = async () => {
    if (!newGift.name || !newGift.emoji || !newGift.price) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar presente",
        description: "Preencha todos os campos.",
      });
      return;
    }

    // Validar o preço como um número
    const priceValue = parseFloat(newGift.price);
    if (isNaN(priceValue)) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar presente",
        description: "O preço deve ser um número válido.",
      });
      return;
    }

    try {
      console.log("Adding new gift:", newGift);
      
      const { data, error } = await supabase
        .from('gifts')
        .insert({
          name: newGift.name,
          emoji: newGift.emoji,
          price: priceValue
        })
        .select();
        
      if (error) {
        console.error("Error adding gift:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao adicionar presente: ${error.message}`,
        });
        return;
      }
      
      if (!data || data.length === 0) {
        console.error("No data returned after adding gift");
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível adicionar o presente. Nenhum dado retornado.",
        });
        return;
      }
      
      console.log("Gift added successfully:", data);
      
      // Add to local state
      setGifts([...gifts, {
        id: data[0].id,
        name: newGift.name,
        emoji: newGift.emoji,
        price: newGift.price
      }]);
      
      setNewGift({ name: "", emoji: "", price: "" });
      
      toast({
        title: "Presente adicionado",
        description: `${newGift.name} foi adicionado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error adding gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao adicionar o presente: ${error.message}`,
      });
    }
  };

  const handleDeleteGift = async (id: string) => {
    try {
      console.log("Deleting gift:", id);
      
      const { error } = await supabase
        .from('gifts')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting gift:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao remover o presente: ${error.message}`,
        });
        return;
      }
      
      console.log("Gift deleted successfully");
      
      // Update local state
      setGifts(gifts.filter((gift) => gift.id !== id));
      
      toast({
        title: "Presente removido",
        description: "O presente foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error("Error deleting gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao remover o presente: ${error.message}`,
      });
    }
  };

  const handleEditGift = async (id: string, field: string, value: string) => {
    try {
      // Prepare data based on field type
      const updateData: any = {};
      if (field === 'price') {
        const priceValue = parseFloat(value);
        if (isNaN(priceValue)) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "O preço deve ser um número válido.",
          });
          return;
        }
        updateData[field] = priceValue;
      } else {
        updateData[field] = value;
      }
      
      console.log(`Updating gift ${id}, field ${field} with value:`, updateData[field]);
      
      const { error } = await supabase
        .from('gifts')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error updating gift:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao atualizar o presente: ${error.message}`,
        });
        return;
      }
      
      console.log("Gift updated successfully");
      
      // Update local state
      setGifts(
        gifts.map((gift) => (gift.id === id ? { ...gift, [field]: value } : gift))
      );
      
      toast({
        title: "Presente atualizado",
        description: "Presente atualizado com sucesso.",
      });
    } catch (error: any) {
      console.error("Error updating gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao atualizar o presente: ${error.message}`,
      });
    }
  };

  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.image) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar perfil",
        description: "Preencha todos os campos.",
      });
      return;
    }

    try {
      console.log("Adding new agent:", newAgent);
      
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          gender: newAgent.gender,
          image: newAgent.image
        })
        .select();
        
      if (error) {
        console.error("Error adding agent:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao adicionar o perfil: ${error.message}`,
        });
        return;
      }
      
      if (!data || data.length === 0) {
        console.error("No data returned after adding agent");
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível adicionar o perfil. Nenhum dado retornado.",
        });
        return;
      }
      
      console.log("Agent added successfully:", data);
      
      // Add to local state
      const newAgentWithCorrectType: AgentProfile = {
        id: data[0].id,
        name: newAgent.name,
        gender: newAgent.gender,
        image: newAgent.image
      };
      
      setAgents([...agents, newAgentWithCorrectType]);
      
      setNewAgent({ name: "", gender: "female", image: "" });
      
      toast({
        title: "Perfil adicionado",
        description: `${newAgent.name} foi adicionado com sucesso.`,
      });
    } catch (error: any) {
      console.error("Error adding agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao adicionar o perfil: ${error.message}`,
      });
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      console.log("Deleting agent:", id);
      
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting agent:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao remover o perfil: ${error.message}`,
        });
        return;
      }
      
      console.log("Agent deleted successfully");
      
      // Update local state
      setAgents(agents.filter((agent) => agent.id !== id));
      
      toast({
        title: "Perfil removido",
        description: "O perfil foi removido com sucesso.",
      });
    } catch (error: any) {
      console.error("Error deleting agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao remover o perfil: ${error.message}`,
      });
    }
  };

  const handleEditAgent = async (id: string, field: string, value: string) => {
    try {
      // For gender field, ensure it's only 'male' or 'female'
      if (field === 'gender' && value !== 'male' && value !== 'female') {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Gênero deve ser 'male' ou 'female'.",
        });
        return;
      }
      
      console.log(`Updating agent ${id}, field ${field} with value:`, value);
      
      const updateData: any = {
        [field]: value
      };
      
      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error updating agent:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao atualizar o perfil: ${error.message}`,
        });
        return;
      }
      
      console.log("Agent updated successfully");
      
      // Update local state with type safety
      setAgents(
        agents.map((agent) => {
          if (agent.id === id) {
            if (field === 'gender') {
              return { ...agent, gender: value as "male" | "female" };
            } else {
              return { ...agent, [field]: value };
            }
          }
          return agent;
        })
      );
      
      toast({
        title: "Perfil atualizado",
        description: "Perfil atualizado com sucesso.",
      });
    } catch (error: any) {
      console.error("Error updating agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Ocorreu um erro ao atualizar o perfil: ${error.message}`,
      });
    }
  };

  const handleSendNotification = () => {
    if (!notification) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar notificação",
        description: "Digite uma mensagem para enviar.",
      });
      return;
    }

    toast({
      title: "Notificação enviada",
      description: `Notificação enviada para ${users.length} usuários.`,
    });
    setNotification("");
  };

  const handleLogout = () => {
    logout();
    setShowLoginDialog(true);
  };

  const handleRefresh = () => {
    fetchData();
    toast({
      title: "Dados atualizados",
      description: "Os dados foram atualizados com sucesso."
    });
  };

  return (
    <>
      {/* Admin login dialog */}
      <AdminLoginDialog 
        isOpen={showLoginDialog} 
        onLoginSuccess={handleLoginSuccess} 
      />
      
      {/* Main admin content - only shown when authenticated and login dialog is not visible */}
      {!showLoginDialog && (
        <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <header className="bg-purple-600 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  className="text-white" 
                  onClick={handleRefresh}
                >
                  Atualizar Dados
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-white" 
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </div>
            </div>
          </header>

          {/* Error display */}
          {error && (
            <div className="container mx-auto p-4 mt-4">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Erro: </strong> 
                <span className="block sm:inline">{error}</span>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="container mx-auto p-4 py-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Carregando...</span>
                  </div>
                  <p className="mt-2">Carregando dados administrativos...</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="gifts" className="w-full">
                <TabsList className="grid grid-cols-5 mb-8">
                  <TabsTrigger value="gifts" className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span>Presentes</span>
                  </TabsTrigger>
                  <TabsTrigger value="plans" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Planos</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Usuários</span>
                  </TabsTrigger>
                  <TabsTrigger value="profiles" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Perfis</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>Notificações</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gifts">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gerenciar Presentes e Emojis Premium</CardTitle>
                      <CardDescription>Adicione, edite ou remova emojis premium que podem ser comprados pelos usuários</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-4 gap-4">
                            <Input
                              placeholder="Nome do presente"
                              value={newGift.name}
                              onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                            />
                            <Input
                              placeholder="Emoji (ex: ❤️)"
                              value={newGift.emoji}
                              onChange={(e) => setNewGift({ ...newGift, emoji: e.target.value })}
                            />
                            <Input
                              placeholder="Preço (ex: 5.00)"
                              type="number"
                              step="0.01"
                              min="0"
                              value={newGift.price}
                              onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                            />
                            <Button onClick={handleAddGift}>Adicionar</Button>
                          </div>

                          <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">Presentes disponíveis</h3>
                            {gifts.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                Nenhum presente encontrado. Adicione um novo presente acima.
                              </div>
                            ) : (
                              <div className="grid gap-4">
                                {gifts.map((gift) => (
                                  <div key={gift.id} className="grid grid-cols-5 items-center gap-4 p-2 bg-gray-50 rounded-md">
                                    <span className="text-2xl">{gift.emoji}</span>
                                    <Input
                                      value={gift.name}
                                      onChange={(e) => handleEditGift(gift.id, "name", e.target.value)}
                                    />
                                    <Input
                                      value={gift.emoji}
                                      onChange={(e) => handleEditGift(gift.id, "emoji", e.target.value)}
                                    />
                                    <div className="flex items-center">
                                      <span className="mr-1">R$</span>
                                      <Input
                                        value={gift.price}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        onChange={(e) => handleEditGift(gift.id, "price", e.target.value)}
                                      />
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteGift(gift.id)}
                                    >
                                      Excluir
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="plans">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gerenciar Planos</CardTitle>
                      <CardDescription>Edite os preços e benefícios dos planos disponíveis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        {plans.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            Nenhum plano encontrado. Clique em Atualizar Dados para tentar novamente.
                          </div>
                        ) : (
                          plans.filter(plan => plan.id !== 'admin').map((plan) => (
                            <div key={plan.id} className="border p-4 rounded-md">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <h3 className="font-medium">{plan.name}</h3>
                                  <p className="text-sm text-gray-500">{plan.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>R$</span>
                                  <Input
                                    value={plan.price}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onChange={(e) => handleUpdatePlan(plan.id, "price", e.target.value)}
                                  />
                                  <span>/{plan.duration}</span>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Benefícios:</h4>
                                <ul className="space-y-1 text-sm">
                                  {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <span>•</span>
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="users">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usuários</CardTitle>
                      <CardDescription>Visualize todos os usuários registrados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {users.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          Nenhum usuário encontrado. Clique em Atualizar Dados para tentar novamente.
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="p-2 text-left font-medium">Nome</th>
                                <th className="p-2 text-left font-medium">Email</th>
                                <th className="p-2 text-left font-medium">País</th>
                                <th className="p-2 text-left font-medium">Plano</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{user.name}</td>
                                  <td className="p-2">{user.email}</td>
                                  <td className="p-2">{user.country}</td>
                                  <td className="p-2 capitalize">{user.plan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profiles">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gerenciar Perfis de Agentes</CardTitle>
                      <CardDescription>Adicione, edite ou remova perfis disponíveis para os usuários</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-4 gap-4">
                            <Input
                              placeholder="Nome do perfil"
                              value={newAgent.name}
                              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                            />
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                              value={newAgent.gender}
                              onChange={(e) => setNewAgent({ ...newAgent, gender: e.target.value as "male" | "female" })}
                            >
                              <option value="female">Feminino</option>
                              <option value="male">Masculino</option>
                            </select>
                            <Input
                              placeholder="URL da imagem"
                              value={newAgent.image}
                              onChange={(e) => setNewAgent({ ...newAgent, image: e.target.value })}
                            />
                            <Button onClick={handleAddAgent}>Adicionar</Button>
                          </div>

                          <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">Perfis disponíveis</h3>
                            {agents.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                Nenhum perfil encontrado. Adicione um novo perfil acima.
                              </div>
                            ) : (
                              <div className="grid gap-4">
                                {agents.map((agent) => (
                                  <div key={agent.id} className="grid grid-cols-5 items-center gap
