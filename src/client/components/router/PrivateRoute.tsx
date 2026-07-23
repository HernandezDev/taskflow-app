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
    
    // Suscripción síncrona
    const isAuth = authStore.isAuthenticated.value;

    useSignalEffect(() => {
        if (!authStore.isAuthenticated.value) {
            route("/", true);
        }
    });

    // COMPUERTA SÍNCRONA: Si es un intruso, no inyectes el Dashboard. 
    if (!isAuth) return null;

    return <Component {...rest} />;
}