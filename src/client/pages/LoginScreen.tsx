import { CaretRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import { useTransitionRoute } from "../hooks/useTransitionRoute";
import { traducirErrorAuth } from "../lib/traductorAuth";
import { authStore } from "../stores/authStore";

export function LoginScreen() {
  const email = useSignal("");
  const password = useSignal("");
  const mostrarPassword = useSignal(false);
  
  const route = useTransitionRoute();
  // Estado local específico de la vista (muere al cambiar de ruta)
  const errorLocal = useSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault(); // Evita que la página se recargue
    if (authStore.isPending.value) return; // Evita doble envío

    errorLocal.value = null;

    try {
      const { error } = await authStore.login(email.value, password.value);

      if (error) {
        errorLocal.value = traducirErrorAuth(error);
      } else {
        route("/dashboard");
      }
    } catch (err) {
      errorLocal.value = traducirErrorAuth(err);
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

        {/* 🚀 ZONA DE ERRORES DEL SERVIDOR */}
        {errorLocal.value && (
          <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center border border-red-100">
            {errorLocal.value}
          </div>
        )}

        <div class="space-y-4">
          {/* INPUT: EMAIL */}
          <div>
            <label for="emailInput" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="emailInput"
              type="email"
              value={email.value}
              onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
              required // 🚀 Validación nativa de HTML
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          {/* INPUT: CONTRASEÑA */}
          <div>
            <label for="passwordInput" class="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            
            {/* 🚀 CAJA RELATIVA: Mantiene al ojo dentro del input */}
            <div class="relative">
              <input
                id="passwordInput"
                type={mostrarPassword.value ? "text" : "password"}
                value={password.value}
                onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
                required // 🚀 Validación nativa de HTML
                class="w-full border border-gray-300 rounded-lg p-2.5 pr-12 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => (mostrarPassword.value = !mostrarPassword.value)}
                aria-label={mostrarPassword.value ? "Ocultar contraseña" : "Mostrar contraseña"}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
              >
                {mostrarPassword.value ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={authStore.isPending.value}
            class="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {authStore.isPending.value ? "Conectando..." : "Entrar"}
          </button>
        </div>

        <div class="mt-6 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => route("/signup")}
            class="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Regístrate aquí <CaretRightIcon class="ml-2" />
          </button>
        </div>
      </form>
    </div>
  );
}