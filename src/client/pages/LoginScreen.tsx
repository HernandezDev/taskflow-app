// src/client/pages/LoginScreen.tsx
import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { authStore } from "../stores/authStore";

export function LoginScreen() {
  const email = useSignal("");
  const password = useSignal("");
  // 1. Creamos una señal local para manejar el mensaje de error
  const errorMessage = useSignal<string | null>(null);
  
  const { route } = useLocation();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errorMessage.value = null; // Limpiamos el error previo al intentar de nuevo
    
    // Obtenemos el error directamente del retorno de tu función
    const { error } = await authStore.login(email.value, password.value);

    if (error) {
      // Better Auth suele devolver un objeto de error con una propiedad message
      // Usamos un casteo rápido para extraerlo de forma segura
      errorMessage.value = (error as { message?: string }).message || "Error al iniciar sesión. Verifica tus credenciales.";
    } else {
      route("/dashboard");
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form 
        onSubmit={handleSubmit} 
        class="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
      >
        <h1 class="text-2xl font-bold text-center mb-6 text-gray-800">
          Iniciar Sesión
        </h1>

        {/* 2. Mostramos la señal de error local */}
        {errorMessage.value && (
          <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {errorMessage.value}
          </div>
        )}

        <div class="space-y-4">
          <div>
            {/* 3. Conectamos el label con el input usando 'for' y 'id' */}
            <label for="emailInput" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="emailInput"
              type="email"
              value={email.value}
              onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
              required
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            {/* 3. Conectamos el label con el input usando 'for' y 'id' */}
            <label for="passwordInput" class="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="passwordInput"
              type="password"
              value={password.value}
              onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
              required
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={authStore.isPending.value}
            class="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {authStore.isPending.value ? "Conectando..." : "Entrar"}
          </button>
        </div>

        {/* 4. Enlace para ir a Crear Cuenta */}
        <div class="mt-6 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => route("/signup")}
            class="text-blue-600 hover:underline font-medium focus:outline-none"
          >
            Regístrate aquí
          </button>
        </div>
      </form>
    </div>
  );
}