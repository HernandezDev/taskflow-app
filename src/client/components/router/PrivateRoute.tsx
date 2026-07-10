import { CircleNotchIcon } from "@phosphor-icons/react";
import type { ComponentType } from "preact";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { authStore } from "../../stores/authStore";

export interface RouteWrapperProps {
    // biome-ignore lint/suspicious/noExplicitAny: El enrutador inyecta props dinámicas
    component: ComponentType<any>;
    path?: string;
    default?: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: Permitimos cualquier prop extra del Router
    [key: string]: any;
}

export function PrivateRoute({ component: Component, ...rest }: RouteWrapperProps) {
    const { route } = useLocation();

    useEffect(() => {
        // 🚀 CAMBIO CLAVE: Escuchamos isInitializing en vez de isPending
        if (!authStore.isInitializing.value && !authStore.isAuthenticated.value) {
            route("/", true); // Redirige al login y reemplaza el historial
        }
    }, [authStore.isAuthenticated.value, authStore.isInitializing.value, route]);

    // 🚀 CAMBIO CLAVE: Bloqueamos la UI solo durante la verificación inicial de la sesión
    // Mantenemos el spinner si no está autenticado para evitar que vea el Dashboard 
    // durante el milisegundo en que el useEffect lo expulsa hacia el Login.
    if (authStore.isInitializing.value || !authStore.isAuthenticated.value) {
        return (
            <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
                <CircleNotchIcon size={32} class="animate-spin" />
            </div>
        );
    }

    return <Component {...rest} />;
}