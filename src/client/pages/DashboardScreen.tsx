import { useLocation } from "preact-iso";
import { authStore } from "../stores/authStore";

export function DashboardScreen() {
  const { route } = useLocation();
  
  // Extraemos el usuario actual del store global
  const user = authStore.user.value;

  const handleLogout = async () => {
    // 1. Llamamos al método de logout del store
    await authStore.logout();
    
    // 2. Redirigimos al Login reemplazando el historial (true)
    // para que el usuario no pueda usar el botón "Atrás" del navegador
    route("/", true);
  };

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center border-t-4 border-blue-500">
        
        <div class="mb-6">
          <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
            Zona Segura
          </span>
        </div>

        <h1 class="text-3xl font-bold text-gray-800 mb-2">
          ¡Bienvenido!
        </h1>
        
        <p class="text-gray-600 mb-8 text-lg">
          Hola, <strong class="text-blue-600">{user?.name || user?.email || "Usuario"}</strong>
        </p>

        <div class="space-y-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={authStore.isPending.value}
            class="w-full bg-red-500 text-white font-semibold py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-4 focus:ring-red-200"
          >
            {authStore.isPending.value ? "Cerrando sesión..." : "Cerrar Sesión"}
          </button>
        </div>

      </div>
    </div>
  );
}