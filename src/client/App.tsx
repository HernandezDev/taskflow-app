import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router } from 'preact-iso';
// 2. Importamos nuestros guardianes modulares
import { GuestRoute } from './components/router/GuestRoute';
import { PrivateRoute } from './components/router/PrivateRoute';
// 1. Importamos las pantallas
import { DashboardScreen } from './pages/DashboardScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SignupScreen } from './pages/SignupScreen';

// 3. Importamos el estado global
import { authStore } from './stores/authStore'; 

// --- COMPONENTES PLACEHOLDER ---
const NotFoundScreen = () => (
  <div class="p-8 text-center text-red-500">
    <h1 class="text-2xl font-bold">404 - No encontrado</h1>
  </div>
);

// --- LA APLICACIÓN PRINCIPAL ---
export function App() {
  // Inicializamos la verificación de sesión al montar la app
  useEffect(() => {
    authStore.checkSession();
  }, []);

  return (
    <LocationProvider>
      <ErrorBoundary onError={(e) => console.error("Crash visual de Preact:", e)}>
        <Router>
          {/* Rutas Públicas: Protegidas para usuarios logueados */}
          <GuestRoute path="/" component={LoginScreen} />
          <GuestRoute path="/signup" component={SignupScreen} />   
          
          {/* Rutas Privadas: Protegidas para visitantes */}
          <PrivateRoute path="/dashboard" component={DashboardScreen} />
          
          {/* Fallback 404 */}
          <Route default component={NotFoundScreen} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}