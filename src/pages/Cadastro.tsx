
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  country: z.string().min(1, { message: "Selecione um país" }),
  agentId: z.string().min(1, { message: "Selecione um agente" }),
  nickname: z.string().min(1, { message: "Digite um apelido para seu agente" }),
});

const Cadastro = () => {
  const navigate = useNavigate();
  const { currentUser, signup, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      country: "br",
      agentId: "",
      nickname: "",
    },
  });

  // Adicionar uma função para lidar com o botão voltar
  const handleGoBack = async () => {
    // Se o usuário estiver logado, fazer logout
    if (currentUser) {
      await logout();
    }
    // Redirecionar para a página inicial
    navigate("/");
  };

  useEffect(() => {
    // Se o usuário já estiver logado, redirecionar para o chat
    if (currentUser) {
      navigate("/chat");
    }
  }, [currentUser, navigate]);

  // Carregar os agentes disponíveis
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // Primeiro tentamos carregar da tabela ai_agents que é a nova tabela
        const { data: aiAgents, error: aiError } = await supabase
          .from("ai_agents")
          .select("*")
          .eq("is_active", true);

        if (aiAgents && aiAgents.length > 0) {
          setAgents(aiAgents);
          setLoadingAgents(false);
          return;
        }

        // Se não encontrou na tabela ai_agents, tenta na tabela agents (legado)
        const { data: legacyAgents, error: legacyError } = await supabase
          .from("agents")
          .select("*");

        if (legacyError) throw legacyError;
        setAgents(legacyAgents || []);
      } catch (error) {
        console.error("Erro ao carregar agentes:", error);
        toast({
          title: "Erro ao carregar agentes",
          description: "Não foi possível carregar a lista de agentes disponíveis.",
          variant: "destructive",
        });
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  // Update selectedAgent when agentId changes
  useEffect(() => {
    const agentId = form.watch("agentId");
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      setSelectedAgent(agent);
    }
  }, [form.watch("agentId"), agents]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Find the selected agent to get its details
      const agent = agents.find(a => a.id === values.agentId);
      if (!agent) {
        throw new Error('Agente não encontrado');
      }

      // 1. Registrar o usuário com email e senha e metadados do agente
      const success = await signup(values.email, values.password, {
        name: values.name,
        country: values.country,
        terms_accepted: true,
        is_adult: true,
        agentId: values.agentId,
        agentName: agent.name,
        agentImage: agent.image,
        nickname: values.nickname
      });

      if (!success) {
        throw new Error('Falha ao criar conta');
      }

      // 2. Obter o ID do usuário recém-criado
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error("Falha ao obter informações do usuário após cadastro");
      }

      // 3. Salvar a seleção do agente na tabela user_selected_agent (nova tabela)
      const { error: agentError } = await supabase
        .from("user_selected_agent")
        .insert({
          user_id: userData.user.id,
          selected_agent_id: values.agentId,
          nickname: values.nickname,
        });

      if (agentError) {
        console.error("Erro ao salvar seleção do agente:", agentError);
        
        // Tentativa alternativa: salvar na tabela user_agent_selections (legado)
        const { error: legacyError } = await supabase
          .from("user_agent_selections")
          .insert({
            user_id: userData.user.id,
            agent_id: values.agentId,
            nickname: values.nickname,
          });
          
        if (legacyError) throw legacyError;
      }

      // Cache the agent data in localStorage for immediate access
      const agentData = {
        id: values.agentId,
        name: agent.name,
        image: agent.image,
        nickname: values.nickname
      };
      localStorage.setItem("selectedAgent", JSON.stringify(agentData));

      // Redirecionar para o chat após login bem-sucedido
      navigate("/chat");
      
      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo! Seu cadastro foi realizado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      let errorMessage = "Erro ao realizar cadastro. Tente novamente.";
      
      if (error.message) {
        if (error.message.includes("email already exists")) {
          errorMessage = "Este email já está cadastrado. Tente fazer login.";
        }
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-10">
      <div className="container max-w-md mx-auto px-4">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGoBack}
              >
                Voltar
              </Button>
              <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
              <div className="w-12"></div> {/* Elemento vazio para equilibrar o layout */}
            </div>
            <CardDescription className="text-center">
              Preencha seus dados e personalize seu companheiro virtual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione seu país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="br">Brasil</SelectItem>
                          <SelectItem value="pt">Portugal</SelectItem>
                          <SelectItem value="us">Estados Unidos</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-medium mb-4">Personalizar seu companheiro</h3>

                  {loadingAgents ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="agentId"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <FormLabel>Escolha seu companheiro</FormLabel>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {agents.map((agent) => (
                                <div
                                  key={agent.id}
                                  onClick={() => form.setValue("agentId", agent.id)}
                                  className={`border rounded-lg p-3 cursor-pointer transition ${
                                    field.value === agent.id
                                      ? "border-purple-500 bg-purple-50 shadow-md"
                                      : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
                                  }`}
                                >
                                  <div className="aspect-square overflow-hidden rounded-lg mb-2">
                                    <AspectRatio ratio={1/1} className="bg-muted">
                                      <Avatar className="w-full h-full">
                                        <img
                                          src={agent.image || "/placeholder.svg"}
                                          alt={agent.name}
                                          className="object-cover w-full h-full"
                                        />
                                      </Avatar>
                                    </AspectRatio>
                                  </div>
                                  <p className="text-sm font-medium text-center truncate">
                                    {agent.name}
                                  </p>
                                </div>
                              ))}
                            </div>
                            
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nickname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Como você quer chamar seu companheiro?</FormLabel>
                            <FormControl>
                              <Input placeholder="Digite um apelido carinhoso" {...field} />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground mt-1">
                              Exemplo: "Amor", "Querido(a)", "Meu bem"
                            </p>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    "Criar conta e começar"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm">
              Já tem uma conta?{" "}
              <Button
                variant="link"
                className="p-0"
                onClick={() => navigate("/login")}
              >
                Entrar
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;
