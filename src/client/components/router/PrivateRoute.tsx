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
        if (!authStore.isPending.value && !authStore.isAuthenticated.value) {
            route("/", true); // Redirige al login y reemplaza el historial
        }
    }, [authStore.isAuthenticated.value, authStore.isPending.value, route]);

    if (authStore.isPending.value || !authStore.isAuthenticated.value) {
        return (
            <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
                Verificando credenciales...
            </div>
        );
    }

    return <Component {...rest} />;
}