import { CaretLeftIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import { useTransitionRoute } from "../hooks/useTransitionRoute";
import { authStore } from "../stores/authStore"; 

export function SignupScreen() {
  // Señales locales para el formulario
  const name = useSignal("");
  const email = useSignal("");
  const password = useSignal("");
  const errorMessage = useSignal<string | null>(null);
  
  const route = useTransitionRoute();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errorMessage.value = null; 
    
    // Llamamos al método de registro de tu Store
    const { error } = await authStore.signUp(email.value, password.value, name.value);

    if (error) {
      errorMessage.value = (error as { message?: string }).message || "Error al crear la cuenta. Intenta nuevamente.";
    } else {
      // Si el registro es exitoso, Better Auth inicia sesión automáticamente,
      // así que lo mandamos directo al área protegida.
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
          Crear Cuenta
        </h1>

        {/* Mensaje de error local */}
        {errorMessage.value && (
          <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {errorMessage.value}
          </div>
        )}

        <div class="space-y-4">
          <div>
            <label for="nameInput" class="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="nameInput"
              type="text"
              value={name.value}
              onInput={(e) => (name.value = (e.target as HTMLInputElement).value)}
              required
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label for="signupEmailInput" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="signupEmailInput"
              type="email"
              value={email.value}
              onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
              required
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label for="signupPasswordInput" class="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="signupPasswordInput"
              type="password"
              value={password.value}
              onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
              required
              minLength={6} // Validación básica de HTML5
              class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={authStore.isPending.value}
            class="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {authStore.isPending.value ? "Creando cuenta..." : "Registrarse"}
          </button>
        </div>

        {/* Enlace para volver al Login */}
        <div class="mt-6 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => route("/", { direction: "backward" })}
            class="mt-2 inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <CaretLeftIcon class="mr-2" />
            Inicia sesión
          </button>
          ¿Ya tienes una cuenta?{" "}
        </div>
      </form>
    </div>
  );
}