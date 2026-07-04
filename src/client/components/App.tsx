import type { ComponentType } from 'preact'; 
import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router, useLocation } from 'preact-iso';
import { authStore } from '../stores/authModel'; 
import { LoginScreen } from './LoginScreen';

// --- COMPONENTES PLACEHOLDER ---
const DashboardScreen = () => <div class="p-8 text-center text-green-600"><h1 class="text-2xl font-bold">Dashboard (Zona Segura)</h1></div>;
const NotFoundScreen = () => <div class="p-8 text-center text-red-500"><h1 class="text-2xl font-bold">404 - No encontrado</h1></div>;

// 2. Definimos la interfaz estricta (¡Adiós 'any'!)
interface PrivateRouteProps {
  // biome-ignore lint/suspicious/noExplicitAny: El enrutador inyecta props dinámicas
  component: ComponentType<any>;
  path?: string;
  default?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: Permitimos cualquier prop extra del Router
  [key: string]: any; 
}

// 3. Aplicamos la interfaz al componente
function PrivateRoute({ component: Component, ...rest }: PrivateRouteProps) {
  const { route } = useLocation();

  useEffect(() => {
    if (!authStore.isPending.value && !authStore.isAuthenticated.value) {
      route('/', true); 
    }
  }, [authStore.isAuthenticated.value, authStore.isPending.value, route]);

  if (authStore.isPending.value || !authStore.isAuthenticated.value) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 animate-pulse">
        Verificando credenciales...
      </div>
    );
  }

  // Preact ya sabe que Component es válido y rest es seguro
  return <Component {...rest} />;
}

// --- LA APLICACIÓN PRINCIPAL ---
export function App() {
  useEffect(() => {
    authStore.checkSession();
  }, []);

  return (
    <LocationProvider>
      <ErrorBoundary onError={(e) => console.error("Crash visual de Preact:", e)}>
        <Router>
          <Route path="/" component={LoginScreen} />
          <PrivateRoute path="/dashboard" component={DashboardScreen} />
          <Route default component={NotFoundScreen} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}