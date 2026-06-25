// src/client/App.tsx
import { useHint } from "../hooks/useHint";

export function App() {
  // 1. ERGONOMÍA ABSOLUTA: Una sola línea de invocación
  const { data, isLoading, error } = useHint();

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-orange-500">
        
        <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-red-500 mb-3">
          Hono SPA Template
        </h1>
        
        <p class="text-gray-700 font-medium mb-6">
          Plantilla Fullstack: Hono en backend, Preact en el cliente y Vite de orquestador.
        </p>

        <hr class="border-gray-200 mb-6" />

        <div class="text-sm text-gray-500 space-y-5">
          <p>
            El frontend incluye TailwindCSS v4 y PWA. La <strong>comunicación con la API está tipada de extremo a extremo mediante Hono RPC</strong>.
          </p>
          
          <div class="bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-100 font-semibold shadow-inner flex items-center justify-center gap-2 min-h-12.5"> 
            {/* 2. CONSUMO REACTIVO: Evaluamos el '.value' de las signals */}
            {isLoading.value ? (
              <span class="animate-pulse">Consultando...</span>
            ) : error.value ? (
              <span class="text-red-500 text-xs">Error: {error.value.message}</span>
            ) : (
              <span>{data.value.message}</span>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}