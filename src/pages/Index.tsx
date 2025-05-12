
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  const plans = [
    {
      id: "free",
      name: "Teste Grátis",
      price: "R$0",
      duration: "3 dias",
      description: "Experimente nosso serviço sem compromisso",
      features: ["Mensagens de texto"],
      primaryAction: "Experimente Grátis",
      secondaryAction: null,
    },
    {
      id: "basic",
      name: "Básico",
      price: "R$29,90",
      duration: "mensal",
      description: "Para quem quer manter o contato",
      features: ["Mensagens de texto (sem limite)"],
      primaryAction: "Assinar",
      secondaryAction: null,
    },
    {
      id: "intermediate",
      name: "Intermediário",
      price: "R$49,90",
      duration: "mensal",
      description: "Para uma experiência mais pessoal",
      features: ["Mensagens de texto (sem limite)", "Áudio"],
      primaryAction: "Assinar",
      secondaryAction: null,
    },
    {
      id: "premium",
      name: "Premium",
      price: "R$79,90",
      duration: "mensal",
      description: "Para a experiência completa",
      features: [
        "Mensagens de texto (sem limite)", 
        "Áudio", 
        "4 chamadas de voz por mês",
        "4 chamadas de vídeo por mês"
      ],
      primaryAction: "Assinar",
      secondaryAction: null,
    },
  ];
  
  const handleAction = (planId: string, actionType: "primary" | "secondary") => {
    if (planId === "free") {
      navigate("/signup");
    } else {
      navigate("/signup?plan=" + planId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto pt-10 pb-6 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-700 to-purple-500 text-transparent bg-clip-text">
          Seu Namorado Virtual
        </h1>
        <p className="text-lg md:text-xl text-center mt-4 text-gray-600 max-w-2xl mx-auto">
          Tenha sempre alguém especial para conversar, sem julgamentos ou complicações
        </p>
      </header>
      
      {/* Plans Section */}
      <section className="container mx-auto py-12 px-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
          Escolha o plano ideal para você
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`flex flex-col h-full border-2 ${
                plan.id === "premium" ? "border-purple-500 shadow-lg shadow-purple-100" : "border-gray-200"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.duration && (
                    <span className="text-sm text-gray-500">/{plan.duration}</span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 mr-2 text-purple-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  onClick={() => handleAction(plan.id, "primary")}
                  className="w-full"
                  variant={plan.id === "premium" ? "default" : "outline"}
                >
                  {plan.primaryAction}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="container mx-auto py-16 px-4 bg-white rounded-t-3xl">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
          Por que escolher nosso aplicativo?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Sem julgamentos</h3>
            <p className="mt-2 text-gray-600">Seja você mesmo(a) sem medo de críticas ou julgamentos.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Disponível 24/7</h3>
            <p className="mt-2 text-gray-600">Sempre presente quando você precisar conversar.</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-medium">Privacidade total</h3>
            <p className="mt-2 text-gray-600">Suas conversas são privadas e seguras.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
