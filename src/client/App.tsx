import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router } from 'preact-iso';

import { GuestRoute } from './components/router/GuestRoute';
import { PrivateRoute } from './components/router/PrivateRoute';
import { DashboardScreen } from './pages/DashboardScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SignupScreen } from './pages/SignupScreen';

import { authStore } from './stores/authStore';

const NotFoundScreen = () => (
  <div class="p-8 text-center text-red-500">
    <h1 class="text-2xl font-bold">404 - No encontrado</h1>
  </div>
);

export function App() {
  // El único side-effect permitido aquí: Inicializar la sesión al montar la app
  useEffect(() => {
    authStore.checkSession();
  }, []);

  return (
    <LocationProvider>
      <ErrorBoundary onError={(e) => console.error('Crash visual de Preact:', e)}>
        <Router>
          <GuestRoute path="/" component={LoginScreen} />
          <GuestRoute path="/signup" component={SignupScreen} />

          <PrivateRoute path="/dashboard" component={DashboardScreen} />

          <Route default component={NotFoundScreen} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}