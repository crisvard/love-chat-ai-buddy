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
import { Json } from "@/integrations/supabase/types";
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
  
  // Estado para controlar a exibição do diálogo de login
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Verifica se o usuário é admin assim que o componente é carregado
  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log("Verificando status de administrador:", currentUser);
      
      if (!currentUser) {
        console.log("Nenhum usuário autenticado, mostrando diálogo de login");
        setShowLoginDialog(true);
      } else if (!isAdmin()) {
        console.log("Usuário não é administrador, mostrando diálogo de login");
        setShowLoginDialog(true);
      } else {
        console.log("Usuário é administrador, carregando dados");
        setShowLoginDialog(false);
        fetchData();
      }
    };
    
    checkAdminStatus();
  }, [currentUser, isAdmin]);

  // Callback para quando o login é bem-sucedido
  const handleLoginSuccess = () => {
    console.log("Login bem-sucedido, fechando diálogo e carregando dados");
    setShowLoginDialog(false);
    fetchData();
  };

  // Fetch all data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*');
        
      if (plansError) throw plansError;
      
      setPlans(plansData.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price.toString(),
        duration: plan.duration,
        description: plan.description || "",
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : []
      })));
      
      // Fetch gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from('gifts')
        .select('*');
        
      if (giftsError) throw giftsError;
      
      setGifts(giftsData.map(gift => ({
        id: gift.id,
        name: gift.name,
        emoji: gift.emoji,
        price: gift.price.toString()
      })));
      
      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');
        
      if (agentsError) throw agentsError;
      
      setAgents(agentsData.map(agent => ({
        id: agent.id,
        name: agent.name,
        gender: agent.gender as "male" | "female",
        image: agent.image
      })));
      
      // Fetch users (combine profiles and subscriptions)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) throw profilesError;
      
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*');
        
      if (subscriptionsError) throw subscriptionsError;
      
      const usersList = profilesData.map(profile => {
        const subscription = subscriptionsData.find(sub => sub.user_id === profile.id);
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          country: profile.country,
          plan: subscription ? subscription.plan_id : 'none'
        };
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao carregar os dados.",
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
      
      const { error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setPlans((prevPlans) =>
        prevPlans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
      );
      
      toast({
        title: "Plano atualizado",
        description: `O plano ${id} foi atualizado com sucesso.`,
      });
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o plano.",
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

    try {
      const { data, error } = await supabase
        .from('gifts')
        .insert({
          name: newGift.name,
          emoji: newGift.emoji,
          price: parseFloat(newGift.price)
        })
        .select();
        
      if (error) throw error;
      
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
    } catch (error) {
      console.error("Error adding gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao adicionar o presente.",
      });
    }
  };

  const handleDeleteGift = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gifts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setGifts(gifts.filter((gift) => gift.id !== id));
      
      toast({
        title: "Presente removido",
        description: "O presente foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao remover o presente.",
      });
    }
  };

  const handleEditGift = async (id: string, field: string, value: string) => {
    try {
      // Prepare data based on field type
      const updateData: any = {};
      if (field === 'price') {
        updateData[field] = parseFloat(value);
      } else {
        updateData[field] = value;
      }
      
      const { error } = await supabase
        .from('gifts')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setGifts(
        gifts.map((gift) => (gift.id === id ? { ...gift, [field]: value } : gift))
      );
    } catch (error) {
      console.error("Error updating gift:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o presente.",
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
      const { data, error } = await supabase
        .from('agents')
        .insert({
          name: newAgent.name,
          gender: newAgent.gender,
          image: newAgent.image
        })
        .select();
        
      if (error) throw error;
      
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
    } catch (error) {
      console.error("Error adding agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao adicionar o perfil.",
      });
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setAgents(agents.filter((agent) => agent.id !== id));
      
      toast({
        title: "Perfil removido",
        description: "O perfil foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao remover o perfil.",
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
      
      const updateData: any = {
        [field]: value
      };
      
      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
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
    } catch (error) {
      console.error("Error updating agent:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o perfil.",
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

  if (isLoading && !showLoginDialog) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Carregando dados administrativos...</p>
      </div>
    );
  }

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
              <Button variant="ghost" className="text-white" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="container mx-auto p-4 py-8">
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
                            value={newGift.price}
                            onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                          />
                          <Button onClick={handleAddGift}>Adicionar</Button>
                        </div>

                        <div className="border rounded-md p-4">
                          <h3 className="text-lg font-medium mb-4">Presentes disponíveis</h3>
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
                      {plans.filter(plan => plan.id !== 'admin').map((plan) => (
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
                      ))}
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
                          <div className="grid gap-4">
                            {agents.map((agent) => (
                              <div key={agent.id} className="grid grid-cols-5 items-center gap-4 p-2 bg-gray-50 rounded-md">
                                <Avatar className="h-12 w-12">
                                  <img src={agent.image} alt={agent.name} className="object-cover" />
                                </Avatar>
                                <Input
                                  value={agent.name}
                                  onChange={(e) => handleEditAgent(agent.id, "name", e.target.value)}
                                />
                                <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                                  value={agent.gender}
                                  onChange={(e) => handleEditAgent(agent.id, "gender", e.target.value)}
                                >
                                  <option value="female">Feminino</option>
                                  <option value="male">Masculino</option>
                                </select>
                                <Input
                                  value={agent.image}
                                  onChange={(e) => handleEditAgent(agent.id, "image", e.target.value)}
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAgent(agent.id)}
                                >
                                  Excluir
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações Push</CardTitle>
                    <CardDescription>Envie mensagens em massa para todos os usuários</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div>
                        <label htmlFor="notification" className="block text-sm font-medium mb-1">
                          Mensagem
                        </label>
                        <Input
                          id="notification"
                          placeholder="Digite a mensagem a ser enviada..."
                          value={notification}
                          onChange={(e) => setNotification(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSendNotification}>Enviar para todos</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      )}
    </>
  );
};

export default Admin;
