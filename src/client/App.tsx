import { effect } from '@preact/signals-core';
import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router } from 'preact-iso';

import { GuestRoute } from './components/router/GuestRoute';
import { PrivateRoute } from './components/router/PrivateRoute';
import { DashboardScreen } from './pages/DashboardScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SignupScreen } from './pages/SignupScreen';

import { authStore } from './stores/authStore';
import { tasksStore } from './stores/tasksStore';

effect(() => {
  const isAuthenticated = authStore.isAuthenticated.value;
  const isInitializing = authStore.isInitializing.value;

  if (isInitializing) {
    return;
  }

  if (isAuthenticated) {
    tasksStore.execute();
  }
});

const NotFoundScreen = () => (
  <div class="p-8 text-center text-red-500">
    <h1 class="text-2xl font-bold">404 - No encontrado</h1>
  </div>
);

export function App() {
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