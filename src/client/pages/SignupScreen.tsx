import { CaretLeftIcon, CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { useSignal } from "@preact/signals";
import { useFormErrors } from "../hooks/useFormErrors"; // 🚀 Importamos el nuevo hook
import { usePrefetch } from "../hooks/usePrefetch"; 
import { useTransitionRoute } from "../hooks/useTransitionRoute";
import { authStore } from "../stores/authStore";

export function SignupScreen() {
  const name = useSignal("");
  const email = useSignal("");
  const password = useSignal("");
  const confirmPassword = useSignal(""); 
  
  const errorMessage = useSignal<string | null>(null); 
  const reglasPass = useSignal({ length: false, upper: false, number: false }); 

  // 🚀 1. Instanciamos nuestro controlador de errores blindado
  const controladorErrores = useFormErrors();

  const route = useTransitionRoute();
  const obtenerValidador = usePrefetch(() => import('../lib/validarRegistro'));

  const manejarInputPassword = async (campo: 'password' | 'confirmPassword', valor: string) => {
    if (campo === 'password') password.value = valor;
    if (campo === 'confirmPassword') confirmPassword.value = valor;

    // 🚀 2. Usamos el método oficial del controlador
    controladorErrores.limpiarCampo(campo);

    const modulo = await obtenerValidador();
    const resultado = modulo.validarFormulario({
      nombre: name.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    });
    
    reglasPass.value = resultado.reglasPassword;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errorMessage.value = null; 
    
    // 🚀 3. Limpiamos todos los errores usando el controlador
    controladorErrores.limpiarTodos(); 

    const modulo = await obtenerValidador();
    const resultado = modulo.validarFormulario({
      nombre: name.value,
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    });

    if (!resultado.exito) {
      // 🚀 4. Seteamos los errores de la validación
      controladorErrores.setErrores(resultado.erroresCampos);
      reglasPass.value = resultado.reglasPassword;
      return; 
    }
    
    const { error } = await authStore.signUp(email.value, password.value, name.value);

    if (error) {
      errorMessage.value = (error as { message?: string }).message || "Error al crear la cuenta. Intenta nuevamente.";
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
          Crear Cuenta
        </h1>

        {errorMessage.value && (
          <div class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {errorMessage.value}
          </div>
        )}

        <div class="space-y-4">
          
          {/* INPUT: NOMBRE */}
          <div>
            <label for="nameInput" class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              id="nameInput"
              type="text"
              value={name.value}
              onInput={(e) => {
                name.value = (e.target as HTMLInputElement).value;
                // 🚀 5. Leemos y limpiamos a través del controlador
                controladorErrores.limpiarCampo('nombre');
              }}
              // 🚀 6. Accedemos de forma segura (Read-only) al valor del signal
              class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${controladorErrores.textos.value.nombre ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="Tu nombre"
            />
            {controladorErrores.textos.value.nombre && (
              <p class="text-xs text-red-500 mt-1 font-medium">{controladorErrores.textos.value.nombre[0]}</p>
            )}
          </div>

          {/* INPUT: EMAIL */}
          <div>
            <label for="signupEmailInput" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="signupEmailInput"
              type="email"
              value={email.value}
              onInput={(e) => {
                email.value = (e.target as HTMLInputElement).value;
                // 🚀 Usamos el controlador
                controladorErrores.limpiarCampo('email');
              }}
              class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${controladorErrores.textos.value.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
              placeholder="tu@email.com"
            />
            {controladorErrores.textos.value.email && (
              <p class="text-xs text-red-500 mt-1 font-medium">{controladorErrores.textos.value.email[0]}</p>
            )}
          </div>

          {/* INPUTS: CONTRASEÑAS */}
          <div class="flex gap-3">
            <div class="w-1/2">
              <label for="signupPasswordInput" class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                id="signupPasswordInput"
                type="password"
                value={password.value}
                onInput={(e) => manejarInputPassword('password', (e.target as HTMLInputElement).value)}
                class="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            
            <div class="w-1/2">
              <label for="signupConfirmInput" class="block text-sm font-medium text-gray-700 mb-1">Repetir</label>
              <input
                id="signupConfirmInput"
                type="password"
                value={confirmPassword.value}
                onInput={(e) => manejarInputPassword('confirmPassword', (e.target as HTMLInputElement).value)}
                class={`w-full border rounded-lg p-2.5 outline-none transition-colors focus:ring-1 ${controladorErrores.textos.value.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          {controladorErrores.textos.value.confirmPassword && (
            <p class="text-xs text-red-500 mt-0 font-medium">{controladorErrores.textos.value.confirmPassword[0]}</p>
          )}

          {/* CHECKLIST DE CONTRASEÑA */}
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-gray-500 mb-1">Tu contraseña debe tener:</p>
            <div class={`flex items-center gap-2 text-sm transition-colors ${reglasPass.value.length ? 'text-green-600' : 'text-gray-400'}`}>
              {reglasPass.value.length ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
              <span>Al menos 8 caracteres</span>
            </div>
            <div class={`flex items-center gap-2 text-sm transition-colors ${reglasPass.value.upper ? 'text-green-600' : 'text-gray-400'}`}>
              {reglasPass.value.upper ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
              <span>Una letra mayúscula</span>
            </div>
            <div class={`flex items-center gap-2 text-sm transition-colors ${reglasPass.value.number ? 'text-green-600' : 'text-gray-400'}`}>
              {reglasPass.value.number ? <CheckCircleIcon weight="fill" size={16} /> : <CircleIcon size={16} />}
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