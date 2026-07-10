import { CircleNotchIcon } from "@phosphor-icons/react";
import type { ComponentType } from "preact";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { authStore } from "../../stores/authStore";

// Reutilizamos la misma interfaz para mantener consistencia
export interface RouteWrapperProps {
    // biome-ignore lint/suspicious/noExplicitAny: El enrutador inyecta props dinámicas
    component: ComponentType<any>;
    path?: string;
    default?: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: Permitimos cualquier prop extra del Router
    [key: string]: any;
}

export function GuestRoute({ component: Component, ...rest }: RouteWrapperProps) {
    const { route } = useLocation();

    useEffect(() => {
        // 🚀 CAMBIO CLAVE: Escuchamos isInitializing en vez de isPending
        if (!authStore.isInitializing.value && authStore.isAuthenticated.value) {
            route("/dashboard", true); // Redirige al panel y reemplaza el historial
        }
    }, [authStore.isAuthenticated.value, authStore.isInitializing.value, route]);

    // 🚀 CAMBIO CLAVE: Solo bloqueamos la UI si estamos verificando la sesión inicial
    // Mantenemos el bloqueo si ya está autenticado para evitar "parpadeos" antes de la redirección
    if (authStore.isInitializing.value || authStore.isAuthenticated.value) {
        return (
            <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
                <CircleNotchIcon size={32} class="animate-spin" />
            </div>
        );
    }

    return <Component {...rest} />;
}