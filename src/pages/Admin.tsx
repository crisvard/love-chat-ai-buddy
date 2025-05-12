
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Gift, UserIcon, DollarSign, Bell } from "lucide-react";

// Mock data for plans
const initialPlans = [
  {
    id: "free",
    name: "Teste Grátis",
    price: "0",
    duration: "3 dias",
    description: "Experimente nosso serviço sem compromisso",
    features: ["Mensagens de texto"],
  },
  {
    id: "basic",
    name: "Básico",
    price: "29.90",
    duration: "mensal",
    description: "Para quem quer manter o contato",
    features: ["Mensagens de texto (sem limite)"],
  },
  {
    id: "intermediate",
    name: "Intermediário",
    price: "49.90",
    duration: "mensal",
    description: "Para uma experiência mais pessoal",
    features: ["Mensagens de texto (sem limite)", "Áudio"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "79.90",
    duration: "mensal",
    description: "Para a experiência completa",
    features: [
      "Mensagens de texto (sem limite)",
      "Áudio",
      "4 chamadas de voz por mês",
      "4 chamadas de vídeo por mês",
    ],
  },
];

// Mock data for special gifts/emojis (premium content)
const initialGifts = [
  { id: "1", name: "Coração Pulsante", emoji: "❤️", price: "5.00" },
  { id: "2", name: "Diamante", emoji: "💎", price: "10.00" },
  { id: "3", name: "Rosa", emoji: "🌹", price: "3.00" },
  { id: "4", name: "Presente", emoji: "🎁", price: "7.00" },
];

const initialUsers = [
  { id: "1", name: "João Silva", email: "joao@example.com", country: "Brasil", plan: "premium" },
  { id: "2", name: "Maria Souza", email: "maria@example.com", country: "Brasil", plan: "basic" },
  { id: "3", name: "Carlos Oliveira", email: "carlos@example.com", country: "Portugal", plan: "intermediate" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, logout } = useAuth();
  const [plans, setPlans] = useState(initialPlans);
  const [gifts, setGifts] = useState(initialGifts);
  const [users, setUsers] = useState(initialUsers);
  const [newGift, setNewGift] = useState({ name: "", emoji: "", price: "" });
  const [notification, setNotification] = useState("");

  // Check if user is admin, otherwise redirect to login
  useEffect(() => {
    if (!currentUser || !isAdmin()) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa ser um administrador para acessar esta página.",
      });
      navigate("/login");
    }
  }, [currentUser, isAdmin, navigate]);

  const handleUpdatePlan = (id: string, field: string, value: string) => {
    setPlans((prevPlans) =>
      prevPlans.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan))
    );
    toast({
      title: "Plano atualizado",
      description: `O plano ${id} foi atualizado com sucesso.`,
    });
  };

  const handleAddGift = () => {
    if (!newGift.name || !newGift.emoji || !newGift.price) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar presente",
        description: "Preencha todos os campos.",
      });
      return;
    }

    const id = (gifts.length + 1).toString();
    setGifts([...gifts, { id, ...newGift }]);
    setNewGift({ name: "", emoji: "", price: "" });
    toast({
      title: "Presente adicionado",
      description: `${newGift.name} foi adicionado com sucesso.`,
    });
  };

  const handleDeleteGift = (id: string) => {
    setGifts(gifts.filter((gift) => gift.id !== id));
    toast({
      title: "Presente removido",
      description: "O presente foi removido com sucesso.",
    });
  };

  const handleEditGift = (id: string, field: string, value: string) => {
    setGifts(
      gifts.map((gift) => (gift.id === id ? { ...gift, [field]: value } : gift))
    );
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
    navigate("/login");
  };

  // Save changes to localStorage when data changes
  useEffect(() => {
    localStorage.setItem("plans", JSON.stringify(plans));
    localStorage.setItem("gifts", JSON.stringify(gifts));
  }, [plans, gifts]);

  // Load data from localStorage on first render
  useEffect(() => {
    const savedPlans = localStorage.getItem("plans");
    const savedGifts = localStorage.getItem("gifts");

    if (savedPlans) {
      setPlans(JSON.parse(savedPlans));
    }
    if (savedGifts) {
      setGifts(JSON.parse(savedGifts));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Painel Administrativo</h1>
          <Button variant="ghost" className="text-white" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8">
        <Tabs defaultValue="gifts" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
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
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </TabsTrigger>
          </TabsList>

          {/* Gifts Tab Content */}
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

          {/* Plans Tab Content */}
          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Planos</CardTitle>
                <CardDescription>Edite os preços e benefícios dos planos disponíveis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {plans.map((plan) => (
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

          {/* Users Tab Content */}
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

          {/* Notifications Tab Content */}
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
  );
};

export default Admin;
