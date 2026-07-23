import { CircleNotchIcon } from "@phosphor-icons/react";
import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router } from 'preact-iso';

import { GuestRoute } from './components/router/GuestRoute';
import { PrivateRoute } from './components/router/PrivateRoute';
import { DashboardScreen } from './pages/DashboardScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SignupScreen } from './pages/SignupScreen';

import { authStore } from './stores/authStore';

const NotFoundScreen = () => (
    <div class="p-8 text-center text-red-500">
        <h1 class="text-2xl font-bold">404 - No encontrado</h1>
    </div>
);

// Escudo visual centralizado: la carga global se resuelve aquí
const GlobalShield = () => (
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-500">
        <CircleNotchIcon size={32} class="animate-spin text-blue-600" />
        <span class="text-sm font-medium animate-pulse">Sincronizando sesión...</span>
    </div>
);

export function App() {
    // 1. Orquestación Top-Down: Disparar la validación de la sesión (Solo ocurre en el primer montaje o al presionar F5)
    useEffect(() => {
        authStore.checkSession();
    }, []);

    // 2. ESCUDO RAÍZ (Suscripción Atómica Pura)
    // Leer `.value` directamente en el cuerpo funcional suscribe a `App` a esa señal.
    // Mientras sea true, devolvemos GlobalShield y cortamos el árbol. El Router NO se renderiza.
    if (authStore.isInitializing.value) {
        return <GlobalShield />;
    }

    // 3. Montaje Seguro Sincrónico
    // Cuando el código llega a esta línea, `isInitializing` es garantizadamente FALSE.
    // El enrutador preact-iso entra en acción con datos deterministas sobre `isAuthenticated`.
    return (
        <LocationProvider>
            <ErrorBoundary onError={(e) => console.error('Crash visual de Preact:', e)}>
                <Router>
                    {/* Hojas Reactivas: Solo se ocupan de evaluar rutas, sin mostrar spinners */}
                    <GuestRoute path="/" component={LoginScreen} />
                    <GuestRoute path="/signup" component={SignupScreen} />

                    <PrivateRoute path="/dashboard" component={DashboardScreen} />

                    <Route default component={NotFoundScreen} />
                </Router>
            </ErrorBoundary>
        </LocationProvider>
    );
}