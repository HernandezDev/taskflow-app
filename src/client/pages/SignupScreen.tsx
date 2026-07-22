import { CaretLeftIcon, CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import { useSignupForm } from "../hooks/useSignupForm";
import { useTransitionRoute } from "../hooks/useTransitionRoute";
import { translateErrorAuth } from "../lib/translateAuth";
import { authStore } from "../stores/authStore";

export function SignupScreen() {
  const route = useTransitionRoute();
  
  // Estado local para errores (muere al cambiar de ruta)
  const errorLocal = useSignal<string | null>(null);

  // 🚀 Todo el poder encapsulado en una sola línea
  const formulario = useSignupForm();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (authStore.isPending.value) return;

    errorLocal.value = null;

    const esValido = await formulario.validarSubmit();
    
    if (!esValido) return; // Si falla, el hook ya encendió las alertas rojas
    
    // Si pasa, enviamos al backend de Better Auth
    try {
      const { error } = await authStore.signUp(
        formulario.form.value.email,
        formulario.form.value.password,
        formulario.form.value.nombre
      );

      if (error) {
        errorLocal.value = translateErrorAuth(error);
      } else {
        route("/dashboard");
      }
    } catch (err) {
      errorLocal.value = translateErrorAuth(err);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} class="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 class="text-2xl font-bold text-center mb-6 text-gray-800">Crear Cuenta</h1>

        {errorLocal.value && (
          <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {errorLocal.value}
          </div>
        )}

        <div class="space-y-4">
          
          {/* INPUT: NOMBRE */}
          <div>
            <label for="nameInput" class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              id="nameInput"
              type="text"
              value={formulario.form.value.nombre}
              onInput={(e) => formulario.manejarInput('nombre', (e.target as HTMLInputElement).value)}
              class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${formulario.erroresTexto.value.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="Tu nombre"
            />
            {formulario.erroresTexto.value.nombre && (
              <p class="text-xs text-red-500 mt-1 font-medium">{formulario.erroresTexto.value.nombre[0]}</p>
            )}
          </div>

          {/* INPUT: EMAIL */}
          <div>
            <label for="signupEmailInput" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="signupEmailInput"
              type="email"
              value={formulario.form.value.email}
              onInput={(e) => formulario.manejarInput('email', (e.target as HTMLInputElement).value)}
              class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${formulario.erroresTexto.value.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="tu@email.com"
            />
            {formulario.erroresTexto.value.email && (
              <p class="text-xs text-red-500 mt-1 font-medium">{formulario.erroresTexto.value.email[0]}</p>
            )}
          </div>

          {/* INPUTS: CONTRASEÑAS */}
          <div class="flex gap-3">
            <div class="w-1/2">
              <label for="signupPasswordInput" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                id="signupPasswordInput"
                type="password"
                value={formulario.form.value.password}
                onInput={(e) => formulario.manejarInput('password', (e.target as HTMLInputElement).value)}
                class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            
            <div class="w-1/2">
              <label for="signupConfirmInput" class="block text-sm font-medium text-gray-700 mb-1">Repetir</label>
              <input
                id="signupConfirmInput"
                type="password"
                value={formulario.form.value.confirmPassword}
                onInput={(e) => formulario.manejarInput('confirmPassword', (e.target as HTMLInputElement).value)}
                class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${formulario.erroresTexto.value.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          {formulario.erroresTexto.value.confirmPassword && (
            <p class="text-xs text-red-500 mt-0 font-medium">{formulario.erroresTexto.value.confirmPassword[0]}</p>
          )}

          {/* CHECKLIST DE CONTRASEÑA */}
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-gray-500 mb-1">Tu contraseña debe tener:</p>
            <div class={`flex items-center gap-2 text-sm transition-colors ${formulario.reglasPass.value.length ? 'text-green-600' : 'text-gray-400'}`}>
              {formulario.reglasPass.value.length ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
              <span>Al menos 8 caracteres</span>
            </div>
            <div class={`flex items-center gap-2 text-sm transition-colors ${formulario.reglasPass.value.upper ? 'text-green-600' : 'text-gray-400'}`}>
              {formulario.reglasPass.value.upper ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
              <span>Una letra mayúscula</span>
            </div>
            <div class={`flex items-center gap-2 text-sm transition-colors ${formulario.reglasPass.value.number ? 'text-green-600' : 'text-gray-400'}`}>
              {formulario.reglasPass.value.number ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
              <span>Un número</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={authStore.isPending.value}
            class="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {authStore.isPending.value ? "Creando cuenta..." : "Registrarse"}
          </button>
        </div>

        <div class="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <button
            type="button"
            onClick={() => route("/", { direction: "backward" })}
            class="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <CaretLeftIcon class="mr-2" />
            Inicia sesión
          </button>
        </div>
      </form>
    </div>
  );
}