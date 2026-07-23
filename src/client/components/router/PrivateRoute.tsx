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

    // 1. Suscripción Atómica Pura (Seguridad post-hidratación)
    // Cuando este componente nace, isInitializing YA ES FALSE gracias al Escudo Raíz.
    useSignalEffect(() => {
        // Si en cualquier momento el usuario pierde la sesión, lo expulsamos.
        if (!authStore.isAuthenticated.value) {
            route("/", true);
        }
    });

    // 2. Renderizado Transparente: Cero escudos, cero lógica de negocio.
    return <Component {...rest} />;
}