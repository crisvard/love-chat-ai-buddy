
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { subscribeToPlan } from './services/checkout.ts'

// Função para iniciar checkout de um plano diretamente
// AVISO: Não é recomendado expor esta função globalmente,
// mas está sendo adicionado conforme solicitado pelo usuário
window.startCheckout = async (planId: string) => {
  console.log(`Iniciando checkout para o plano: ${planId}`);
  
  switch(planId) {
    case "basic":
      console.log("Plano Básico selecionado - price_1RP6SHQPvTOtvaP8Xbp5NElV");
      break;
    case "intermediate":
      console.log("Plano Intermediário selecionado - price_1RMxchQPvTOtvaP8pxMzMxE1");
      break;
    case "premium":
      console.log("Plano Premium selecionado - price_1RP6SHQPvTOtvaP8Xbp5NElV");
      break;
  }
  
  // Utiliza a função de checkout atualizada que agora usa os price_ids diretos
  return await subscribeToPlan(planId);
};

// Exibir informação sobre a função no console
console.log("Para iniciar um checkout de um plano diretamente, use: window.startCheckout('basic'), window.startCheckout('intermediate') ou window.startCheckout('premium')");

// Declaração para TypeScript
declare global {
  interface Window {
    startCheckout: (planId: string) => Promise<boolean>;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
