# Guía de Arquitectura — TaskFlow

Este documento describe cómo está construido el proyecto **realmente**, no cómo se planeó originalmente. Está pensado tanto para vos en el futuro como para cualquier agente (IA o humano) que trabaje sobre el código: seguir estas convenciones mantiene el proyecto consistente.

> Nota histórica: una versión anterior de este documento describía un patrón más estricto (prohibición total de hooks nativos fuera de la capa de infraestructura). En la práctica, ese patrón resultó demasiado rígido para casos reales de sincronización UI↔estado, así que la regla se ajustó. Ver sección 2.

---

## 1. Resumen de la arquitectura

- **Tipo:** Single Page Application (SPA) full-stack.
- **Deploy:** Cloudflare Workers / Pages (edge).
- **Build:** Vite.
- **Estilos:** TailwindCSS v4, configuración CSS-first (Lightning CSS). No usar `tailwind.config.js`.
- **Lint/format:** Biome.

---

## 2. Frontend (Preact + `@preact/signals`)

### 2.1 Regla general de estado

Todo el estado — global o local a un componente — se maneja con `@preact/signals` / `@preact/signals-core`. No usar `useState`/`useReducer` para modelar estado de dominio.

Existen tres niveles, según el alcance del dato:

| Nivel | Herramienta | Cuándo usarlo | Ejemplo en el proyecto |
|---|---|---|---|
| Global (singleton) | Objeto literal con signals privadas + interfaz pública `ReadonlySignal` | Datos que persisten mientras la app esté abierta: sesión, lista de tareas | `authStore.ts`, `tasksStore.ts` |
| Modelo de datos remotos | `createModel` (vía la factory propia `createRpcModel`) | Envolver un fetch con estado de carga/error, reusable en distintos stores | `lib/createRpcModel.ts`, usado por `tasksStore` |
| Efímero atado a un componente | `useModel` | Estado de interacción local que debe destruirse al desmontar (formularios complejos, paginación local) | **Todavía sin uso** — la app no tiene pantallas con ese nivel de complejidad. No evitar `useModel` por sistema si aparece un caso real; es una herramienta válida y disponible en `@preact/signals`. |

`createRpcModel` es un wrapper propio sobre `createModel` que resuelve el patrón "fetch + `isLoading` + `error` + `AbortController`" de forma reutilizable. Es el patrón a seguir para cualquier store que consuma datos del servidor.

### 2.2 Hooks nativos de Preact — cuándo sí

La regla original prohibía hooks nativos (`useEffect`, etc.) fuera de infraestructura (bootstrap, guards de ruta). En la práctica esto no cubre un caso legítimo: **sincronizar un signal local con una prop que cambia por fuera del componente** (ej. edición optimista de un campo cuyo valor real puede llegar actualizado desde el servidor).

Regla actualizada:

- **Preferir signals puros** para toda la lógica de estado y derivaciones (`computed`).
- **`useEffect` está permitido** cuando el objetivo es sincronizar estado interno con el ciclo de vida del componente o con props externas — no como reemplazo general de `computed`/`effect` de signals.
- Patrón de referencia: `hooks/useOptimisticMutation.ts`. Envuelve un signal local (`localValue`), lo hidrata con `useEffect` cuando cambia el valor inicial recibido por props, y expone `commitChange` con rollback automático si la mutación al servidor falla. Usar este hook (o este patrón) para cualquier campo editable inline con optimistic update.
- Los guards de ruta (`PrivateRoute`, `GuestRoute`) y el bootstrap raíz (`App.tsx`) siguen siendo los casos de infraestructura donde `useEffect` es la herramienta esperada.

### 2.3 Enrutador (`preact-iso`)

Router oficial del proyecto. Sus hooks (`useLocation`, etc.) están confinados a la capa de vista (decidir qué renderizar según la URL).

### 2.4 Reglas de Signals

- **Encapsulamiento:** todo estado expuesto a la UI se tipa como `ReadonlySignal` en una interfaz explícita. Las signals internas son privadas al módulo/modelo; la única forma de mutarlas desde afuera es a través de los métodos expuestos.
- **Lectura en JSX:** pasar la signal directamente (`<p>{count}</p>`, `value={inputValue}`), no `.value` — así la mutación actualiza el nodo del DOM real directamente y evita pasar por el ciclo de diffing/reconciliación del Virtual DOM de Preact para ese valor puntual.
- **Batching:** agrupar mutaciones relacionadas con `batch(() => { ... })` (ver `authStore.checkSession`, `createRpcModel.execute`).
- **Limpieza de recursos:** si un modelo maneja un `AbortController` u otro recurso externo, registrar su limpieza en un `effect` sin dependencias que retorne la función de cleanup (ver `createRpcModel`).

---

## 3. Build (Vite — doble pasada)

`vite.config.ts` es la pieza que amarra todo el proyecto a un único deploy en Cloudflare Pages. No es una config estándar de SPA: usa el `mode` de Vite para producir **dos builds distintos a partir del mismo comando**:

| `mode` | Qué construye | Plugin clave | Salida |
|---|---|---|---|
| `client` (default) | Frontend SPA (Preact, Tailwind, PWA) | `@preact/preset-vite`, `@tailwindcss/vite`, `VitePWA` | `dist/` |
| `server` | Backend Hono empaquetado para Pages Functions | `@hono/vite-build/cloudflare-pages` | `dist/_worker.js` |

El script `build` en `package.json` (`vite build && vite build --mode server`) ejecuta ambas pasadas en secuencia. La build de servidor usa `emptyOutDir: false` a propósito, para no borrar lo que ya generó la pasada de cliente. **Si se agrega un nuevo script de build o CI, respetar este orden** (cliente primero, servidor después) o se pierde el output del frontend.

### 3.1 Dev server

En desarrollo, `@hono/vite-dev-server` (con el adapter de Cloudflare) monta el backend de Hono (`src/server/index.ts`) dentro del mismo proceso de Vite. La opción `exclude` en `devServer` es la que define el ruteo local:

- Excluye explícitamente `/`, `/index.html`, `/src/**`, assets de Vite y `node_modules` — esas rutas las resuelve Vite como SPA normal.
- El patrón `/^\/(?!api).*/` es la regla clave: **cualquier ruta que no empiece con `/api` se trata como ruta del SPA**, no como endpoint del backend. Si se agrega un nuevo prefijo de API que no sea `/api`, hay que ajustar este patrón o el dev server no lo va a enrutar correctamente.

`injectClientScript: true` inyecta el script de HMR de Vite en las respuestas servidas por Hono durante desarrollo.

---

## 4. Backend (Hono + Cloudflare D1)

- **Framework:** Hono.
- **Base de datos:** Cloudflare D1 (SQLite), vía Drizzle ORM.
- **Rutas:** encadenadas (`.get().post().patch()...`) para poder exportar un tipo unificado (`AppType`) que el cliente RPC consume.
- La inicialización de la conexión a D1 se mantiene separada de la configuración de Better Auth.

---

## 5. Comunicación cliente-servidor

Hay **dos canales separados**, cada uno con su propio cliente. No mezclar responsabilidades entre ellos.

### 5.1 Canal de dominio: RPC tipado de Hono (`lib/api.ts`)

```ts
export const rpc = hc<AppType>("/", {
    fetch: (input, requestInit) =>
        fetch(input, { ...requestInit, credentials: "include" }),
});
```

- El tipo `AppType` se importa directo del router del servidor (`@server/index`) — el alias `@server` apunta a `src/server`. Esto es lo que da el tipado end-to-end sin generar nada a mano: si cambia una ruta en el backend, TypeScript marca error en el cliente al instante.
- El `fetch` custom fuerza `credentials: "include"` en **todas** las peticiones RPC. Esto es necesario porque la sesión de Better Auth viaja por cookie — sin este flag, el navegador no manda la cookie de sesión en las requests al backend y los endpoints protegidos fallan con 401 aunque el usuario esté logueado.
- Todo endpoint que reciba body debe validarse con Zod (`@hono/zod-validator`) en el servidor, fail-fast.

### 5.2 Canal de autenticación: cliente de Better Auth (`lib/auth-client.ts`)

```ts
export const authClient = createAuthClient({
    plugins: [inferAdditionalFields<AuthType>()],
});
```

- No pasa por el RPC de dominio — es un cliente separado, generado por Better Auth.
- `AuthType` también se importa desde el servidor (`@server/auth`), y el plugin `inferAdditionalFields` es lo que le da al cliente conocimiento de tipos de campos custom que se hayan agregado al modelo de usuario/sesión en el servidor (más allá de los campos base de Better Auth). Si se agrega un campo custom al usuario en el backend, este plugin es lo que lo propaga al tipado del cliente — no hay que declararlo dos veces.
- Maneja login, registro, logout y recuperación de sesión; internamente también depende de la cookie de sesión, coherente con el `credentials: "include"` del canal RPC.

### 5.3 Peticiones asíncronas

Todo fetch (de cualquiera de los dos canales) se encapsula en un modelo (store o `createRpcModel`), con `AbortController` propio, cancelado en la limpieza del `effect` correspondiente.

---

## 6. TypeScript

- Project references: `tsconfig.client.json` y `tsconfig.server.json`.
- `verbatimModuleSyntax` habilitado → usar `import type` para tipos que cruzan la frontera cliente/servidor.
- Alias `@server` disponible desde el cliente para importar tipos del servidor (`AppType`, `AuthType`) sin rutas relativas largas.
- **Tipos de Cloudflare:** el proyecto usa el paquete estático `@cloudflare/workers-types` (fijado en `package.json` como `^4.20260619.1`), no la generación por proyecto (`wrangler types` / script `cf-typegen`). Es una decisión deliberada: evita tener que regenerar tipos cada vez que cambian los bindings. Cloudflare recomienda migrar a la generación vía Wrangler, pero el paquete sigue actualizándose con versiones nuevas periódicamente, así que no hay urgencia.
  - **Detalle de versión importante:** el esquema `4.YYYYMMDD.patch` de la v4 ancla los tipos a un snapshot de fecha concreto de `workerd` (en este caso, 19/06/2026) — el mismo beneficio de precisión que da `wrangler types`, sin tener que generarlo. El rango `^4.20260619.1` en `package.json` evita saltar a mayor solo con `pnpm update`.
  - **Cuidado al actualizar a mano:** desde julio 2026 existe `@cloudflare/workers-types` v5, que simplificó el paquete a solo dos entrypoints (`workers-types` y `workers-types/experimental`) y **eliminó el anclaje por fecha** — con v5 siempre se obtienen los tipos de la compat date más reciente que soporte esa versión del paquete, no una fecha específica. Si en algún momento se corre `pnpm add -D @cloudflare/workers-types@latest` a mano, se pierde ese anclaje. No actualizar a v5 sin evaluar el impacto, o migrar a `wrangler types` en ese momento.

---

## 7. Modelo de dominio: tareas

- **Estados:** `PENDING` → `IN_PROGRESS` → `COMPLETED`.
- **Deadline:** opcional, `datetime-local`.
- **Overdue (derivado, no persistido):** una tarea es atrasada si `status !== "COMPLETED"` y `deadline` está definido y es anterior a `Date.now()`. Se calcula en el cliente, reactivamente, vía `computed`.

---

## 8. Organización de archivos

```
src/client/lib/        → cliente RPC, cliente de auth, factories de modelos (createRpcModel)
src/client/stores/      → singletons globales (authStore, tasksStore)
src/client/hooks/        → hooks utilitarios reusables (useOptimisticMutation, usePrefetch, useTransitionRoute)
src/client/components/    → componentes de dominio (tasks/) y UI genérica (ui/), más infraestructura (router/)
src/client/pages/          → vistas mapeadas a rutas de preact-iso
```