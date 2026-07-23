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
    
    // Suscripción síncrona para el pipeline de renderizado
    const isAuth = authStore.isAuthenticated.value;

    useSignalEffect(() => {
        if (authStore.isAuthenticated.value) {
            route("/dashboard", true);
        }
    });

    // COMPUERTA SÍNCRONA: Si está autenticado, no inyectes ni un solo píxel del Login en el DOM.
    // El navegador mantendrá el fondo limpio mientras preact-iso procesa la redirección.
    if (isAuth) return null;

    return <Component {...rest} />;
}