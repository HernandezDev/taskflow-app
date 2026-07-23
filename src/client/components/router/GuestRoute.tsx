import { useSignalEffect } from "@preact/signals";
import type { ComponentType } from "preact";
import { useLocation } from "preact-iso";
import { authStore } from "../../stores/authStore";

export interface RouteWrapperProps {
    component: ComponentType<any>;
    path?: string;
    default?: boolean;
    [key: string]: any;
}

export function GuestRoute({ component: Component, ...rest }: RouteWrapperProps) {
    const { route } = useLocation();

    // 1. Suscripción Atómica Pura
    useSignalEffect(() => {
        if (authStore.isAuthenticated.value) {
            route("/dashboard", true);
        }
    });

    // 2. Renderizado Transparente
    return <Component {...rest} />;
}