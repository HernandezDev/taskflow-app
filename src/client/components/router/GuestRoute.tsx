import { CircleNotchIcon } from "@phosphor-icons/react";
import { useSignalEffect } from "@preact/signals";
import type { ComponentType } from "preact";
import { useTransitionRoute } from "../../hooks/useTransitionRoute";
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
    const navigate = useTransitionRoute();

    useSignalEffect(() => {
        const isInit = authStore.isInitializing.value;
        const isAuth = authStore.isAuthenticated.value;

        if (!isInit && isAuth) {
            navigate("/dashboard", { replace: true });
        }
    });

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