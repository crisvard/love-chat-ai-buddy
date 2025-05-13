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
  const { currentUser, signup } = useAuth(); // Corrigido de signUp para signup
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

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
        const { data, error } = await supabase
          .from("ai_agents")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;
        setAgents(data || []);
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // 1. Registrar o usuário com email e senha
      const { error: signUpError } = await signup(values.email, values.password, {
        name: values.name,
        country: values.country,
        terms_accepted: true,
        is_adult: true,
      });

      if (signUpError) throw signUpError;

      // 2. Obter o ID do usuário recém-criado
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        throw new Error("Falha ao obter informações do usuário após cadastro");
      }

      // 3. Salvar a seleção do agente
      const { error: agentError } = await supabase
        .from("user_selected_agent")
        .insert({
          user_id: userData.user.id,
          selected_agent_id: values.agentId,
          nickname: values.nickname,
        });

      if (agentError) throw agentError;

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
            <CardTitle className="text-2xl font-bold text-center">Criar sua conta</CardTitle>
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
                          <FormItem>
                            <FormLabel>Escolha seu companheiro</FormLabel>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {agents.map((agent) => (
                                <div
                                  key={agent.id}
                                  onClick={() => form.setValue("agentId", agent.id)}
                                  className={`border rounded-lg p-3 cursor-pointer transition ${
                                    field.value === agent.id
                                      ? "border-purple-500 bg-purple-50"
                                      : "border-gray-200 hover:border-purple-300"
                                  }`}
                                >
                                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                                    <img
                                      src={agent.image || "/placeholder.svg"}
                                      alt={agent.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="text-sm font-medium text-center">
                                    {agent.name}
                                  </div>
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
                              <Input placeholder="Digite um apelido" {...field} />
                            </FormControl>
                            <FormMessage />
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
