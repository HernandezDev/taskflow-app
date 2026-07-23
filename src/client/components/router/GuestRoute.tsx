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

export function GuestRoute({ component: Component, ...rest }: RouteWrapperProps) {
    const { route } = useLocation();

    // 1. Suscripción Atómica
    useSignalEffect(() => {
        const isInit = authStore.isInitializing.value;
        const isAuth = authStore.isAuthenticated.value;

        // Si terminó de verificar y TIENE sesión -> Redirigir al Dashboard
        if (!isInit && isAuth) {
            route("/dashboard", true);
        }
    });

    // 2. Bloqueo Visual: Leer .value
    const isInit = authStore.isInitializing.value;
    const isAuth = authStore.isAuthenticated.value;

    if (isInit || isAuth) {
        return (
            <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
                <CircleNotchIcon size={32} class="animate-spin" />
            </div>
        );
    }

    return <Component {...rest} />;
}