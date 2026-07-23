import { CircleNotchIcon } from "@phosphor-icons/react";
import { useSignalEffect } from "@preact/signals";
import type { ComponentType } from "preact";
import { useLocation } from "preact-iso";
import { authStore } from "../../stores/authStore";

export interface RouteWrapperProps {
    // biome-ignore lint/suspicious/noExplicitAny: El enrutador inyecta props dinámicas
    component: ComponentType<any>;
    path?: string;
    default?: boolean;
    // biome-ignore lint/suspicious/noExplicitAny: Permitimos cualquier prop extra
    [key: string]: any;
}

export function PrivateRoute({ component: Component, ...rest }: RouteWrapperProps) {
    const { route } = useLocation();

    // 1. Suscripción Atómica: Reacciona inmediatamente cuando las señales mutan
    useSignalEffect(() => {
        const isInit = authStore.isInitializing.value;
        const isAuth = authStore.isAuthenticated.value;

        // Si ya terminamos de inicializar y NO hay sesión válida -> Expulsión determinista
        if (!isInit && !isAuth) {
            route("/", true);
        }
    });

    // 2. Bloqueo Visual: Leer .value aquí suscribe al componente para re-renderizar
    const isInit = authStore.isInitializing.value;
    const isAuth = authStore.isAuthenticated.value;

    if (isInit || !isAuth) {
        return (
            <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
                <CircleNotchIcon size={32} class="animate-spin" />
            </div>
        );
    }

    return <Component {...rest} />;
}