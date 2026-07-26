# Guía de Arquitectura — TaskFlow

Este documento describe cómo está construido el proyecto **realmente**, no cómo se planeó originalmente. Está pensado tanto para vos en el futuro como para cualquier agente (IA o humano) que trabaje sobre el código: seguir estas convenciones mantiene el proyecto consistente.

> Nota histórica: una versión anterior de este documento describía un patrón más estricto (prohibición total de hooks nativos fuera de la capa de infraestructura), y el manejo de tareas vivía en un singleton global (`tasksStore.ts`) con `useOptimisticMutation` como hook de sincronización en cada componente editable. Ambas cosas se revisaron: el estado de tareas pasó a ser un modelo efímero atado a la pantalla de Dashboard (`TaskModel`, vía `useModel`), y el optimismo/rollback se centralizó ahí en vez de repetirse por componente. Ver secciones 2 y 7.

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
| Global (singleton) | Objeto literal con signals privadas + interfaz pública `ReadonlySignal` | Datos que persisten mientras la app esté abierta, sin importar la pantalla: sesión, caché offline | `authStore.ts`, `offlineTasksStore.ts` |
| Modelo de datos remotos | `createModel` (vía la factory propia `createRpcModel`) | Envolver un fetch con estado de carga/error/auto-fetch, reusable dentro de otros modelos | `lib/createRpcModel.ts`, usado internamente por `TaskModel` |
| Efímero atado a un componente | `useModel` | Estado de una pantalla completa que debe destruirse al desmontar: datos remotos + acciones de mutación de esa vista | `models/TaskModel.ts`, instanciado con `useModel(TaskModel)` en `DashboardScreen` |

`createRpcModel` resuelve el patrón "fetch + `isLoading` + `error` + `AbortController` + auto-fetch al crearse" de forma reutilizable. `TaskModel` lo usa como pieza interna (`resource = createRpcModel(...)`), no lo reemplaza — sobre esa base agrega las acciones de dominio (`addTask`, `updateTask`, `deleteTask`) y la sincronización con el caché offline.

**Disposal en cascada:** como `createRpcModel` devuelve una instancia con su propio `[Symbol.dispose]`, y esa instancia vive *dentro* de la factory de otro `createModel` (`TaskModel`), no hay nada automático que conecte ambos ciclos de vida. `TaskModel` registra un `effect` de limpieza propio que llama explícitamente a `resource[Symbol.dispose]()` — sin eso, al desmontar `DashboardScreen` el modelo externo se limpia pero el `resource` interno (y su fetch en vuelo) no.

**Auto-fetch y orden de montaje:** `createRpcModel` dispara la petición apenas se instancia, sin esperar ninguna condición externa. Esto es seguro porque `DashboardScreen` (donde se crea `TaskModel` vía `useModel`) solo se monta detrás de `PrivateRoute`, que ya bloquea el render hasta que `authStore.isInitializing` es `false` y `authStore.isAuthenticated` es `true`. Si `TaskModel` (u otro modelo con auto-fetch) se usara en una pantalla que no esté detrás de ese guard, hay que reintroducir algún mecanismo de espera — no asumir que el auto-fetch es siempre seguro.

### 2.2 Hooks nativos de Preact — cuándo sí

La regla original prohibía hooks nativos (`useEffect`, etc.) fuera de infraestructura (bootstrap, guards de ruta), con una única excepción documentada: `useOptimisticMutation`, que sincronizaba un signal local con una prop externa para hacer optimistic update por componente. Ese hook **ya no existe** — se eliminó al mover el optimismo y el rollback a `TaskModel.updateTask`, que muta el modelo directamente y revierte con el valor previo si la petición falla. Los componentes de tarea (`TaskStatusControl`, y el título vía `Editable`) ya no mantienen una copia local del valor: leen directo la signal que expone `TaskModel.data`, así que no hay nada que resincronizar con `useEffect` por ese motivo.

Sigue existiendo un caso legítimo de `useEffect`, distinto del anterior: **sincronizar el estado interno de una librería de terceros con una prop controlada externamente**, cuando esa librería no ofrece un modo verdaderamente controlado.

- Patrón de referencia: `components/ui/Editable.tsx`. Usa `editable.machine` de Zag.js en modo **no controlado** (`defaultValue`, no `value` + `onValueChange`) — pasarle `value` sin su `onValueChange` correspondiente deja a Zag sin saber cuándo el valor "controlado" cambió, y al confirmar una edición la máquina puede volver al valor inicial en vez de al nuevo. La solución no es un `useEffect` de sincronización constante, sino un `api.setValue(value)` explícito, invocado solo en el momento puntual en que hace falta forzar el valor desde afuera (rollback tras un commit fallido).
- Los guards de ruta (`PrivateRoute`, `GuestRoute`) y el bootstrap raíz (`App.tsx`) siguen siendo los casos de infraestructura donde `useEffect` es la herramienta esperada.

**Limitación conocida y aceptada:** al usar `defaultValue` (no controlado), si el valor cambiara por una causa completamente externa a la propia edición del usuario (otra pestaña, una futura sincronización en tiempo real) mientras el componente sigue montado, `Editable` no se entera después del montaje inicial. Para el alcance actual del proyecto esto no es un problema real; si se agrega sincronización en tiempo real, hay que revisar este componente.

### 2.3 Enrutador (`preact-iso`)

Router oficial del proyecto. Sus hooks (`useLocation`, etc.) están confinados a la capa de vista (decidir qué renderizar según la URL).

### 2.4 Reglas de Signals

- **Encapsulamiento:** todo estado expuesto a la UI se tipa como `ReadonlySignal` en una interfaz explícita. Las signals internas son privadas al módulo/modelo; la única forma de mutarlas desde afuera es a través de los métodos expuestos.
- **Lectura en JSX:** pasar la signal directamente (`<p>{count}</p>`, `value={inputValue}`), no `.value` — así la mutación actualiza el nodo del DOM real directamente y evita pasar por el ciclo de diffing/reconciliación del Virtual DOM de Preact para ese valor puntual.
  - **Excepción legítima:** al iterar una lista para generar múltiples nodos (`tasks.value.map(...)`), hace falta el valor concreto del array, no la signal en sí — ahí sí corresponde leer `.value`. La regla de "pasar la signal directa" aplica a valores escalares en un único nodo, no a colecciones que se mapean.
- **Batching:** agrupar mutaciones relacionadas con `batch(() => { ... })` (ver `authStore.checkSession`, `createRpcModel.execute`).
- **Limpieza de recursos:** si un modelo maneja un `AbortController` u otro recurso externo, registrar su limpieza en un `effect` sin dependencias que retorne la función de cleanup (ver `createRpcModel`, y el disposal en cascada de `TaskModel` descrito en 2.1).

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
- **Distinguir "campo ausente" de "campo `null`" en updates parciales:** en validaciones y en el `.set()` de Drizzle, no usar un ternario truthy/falsy simple (`body.campo ? valor : undefined`) cuando el campo debe poder vaciarse explícitamente — `null` es falsy en JS y ese patrón lo trata igual que "no vino en el body", haciendo imposible borrar el valor. Ver `updateTaskValidator` (`deadline` con `.nullable().optional()`) y el `.set()` de `tasks.router.ts` como referencia: comparar explícitamente contra `=== undefined` y `=== null` por separado.

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
- `verbatimModuleSyntax` habilitado → usar `import type` para tipos que cruzan la frontera cliente/servidor. Ojo con exportar el `type` en el mismo lugar donde se declara (`export type X = ...`); con `verbatimModuleSyntax` una declaración local que se intenta re-exportar después no alcanza — TS la sigue viendo como no exportada en el punto de origen.
- Alias `@server` disponible desde el cliente para importar tipos del servidor (`AppType`, `AuthType`) sin rutas relativas largas.
- Tipos de dominio inferidos de Hono (`Task`, `UpdateTaskInput` en `models/TaskModel.ts`) se exportan desde ahí y se reutilizan en los componentes que los necesitan (`TaskItem`, `TaskStatusControl`) en vez de redeclararse a mano — evita que dos definiciones del mismo shape se desincronicen.
- **Tipos de Cloudflare:** el proyecto usa el paquete estático `@cloudflare/workers-types` (fijado en `package.json` como `^4.20260619.1`), no la generación por proyecto (`wrangler types` / script `cf-typegen`). Es una decisión deliberada: evita tener que regenerar tipos cada vez que cambian los bindings. Cloudflare recomienda migrar a la generación vía Wrangler, pero el paquete sigue actualizándose con versiones nuevas periódicamente, así que no hay urgencia.
  - **Detalle de versión importante:** el esquema `4.YYYYMMDD.patch` de la v4 ancla los tipos a un snapshot de fecha concreto de `workerd` (en este caso, 19/06/2026) — el mismo beneficio de precisión que da `wrangler types`, sin tener que generarlo. El rango `^4.20260619.1` en `package.json` evita saltar a mayor solo con `pnpm update`.
  - **Cuidado al actualizar a mano:** desde julio 2026 existe `@cloudflare/workers-types` v5, que simplificó el paquete a solo dos entrypoints (`workers-types` y `workers-types/experimental`) y **eliminó el anclaje por fecha** — con v5 siempre se obtienen los tipos de la compat date más reciente que soporte esa versión del paquete, no una fecha específica. Si en algún momento se corre `pnpm add -D @cloudflare/workers-types@latest` a mano, se pierde ese anclaje. No actualizar a v5 sin evaluar el impacto, o migrar a `wrangler types` en ese momento.

---

## 7. Modelo de dominio: tareas

- **Estados:** `PENDING` → `IN_PROGRESS` → `COMPLETED`.
- **Deadline:** opcional, `datetime-local` en la creación. En la actualización, el campo distingue tres casos: ausente (no tocar), `null` (quitar la fecha límite) o un número (fecha nueva) — ver sección 4. **La capacidad de quitar la fecha existe en el modelo de datos (`TaskModel.updateTask`, validador y router) pero todavía no tiene control expuesto en la UI** (ej. un botón para vaciar el deadline en `TaskItem`).
- **Overdue (derivado, no persistido):** una tarea es atrasada si `status !== "COMPLETED"` y `deadline` está definido y es anterior a `Date.now()`. Se calcula en el cliente, reactivamente, vía `computed`.

### 7.1 Dónde vive cada pieza

- **`models/TaskModel.ts`** (`createModel`, instanciado con `useModel` en `DashboardScreen`): estado de la lista de tareas (`data`, `isLoading`, `error`) más las acciones `addTask`, `updateTask`, `deleteTask`. `updateTask` aplica el cambio de forma optimista sobre `resource.data` y revierte al valor previo si la petición al servidor falla — el rollback vive acá, no en los componentes.
- **`stores/offlineTasksStore.ts`** (singleton): única responsabilidad, leer/escribir el caché de `localStorage` (`getCached<T>()` / `setCached<T>()`). No sabe nada de fetch, RPC, ni de la forma específica de una tarea — es genérico. `TaskModel` lo usa para poblar el estado inicial y para persistir cada cambio de `resource.data` vía `effect`.
- **`components/tasks/TaskItem.tsx`, `TaskQuickAdd.tsx`, `components/ui/TaskStatusControl.tsx`**: reciben `addTask`/`updateTask`/`deleteTask` **por props** desde `DashboardScreen` — no importan nada de un módulo global, porque ya no existe un singleton del que importar. Si se agrega un componente nuevo que necesite mutar tareas, debe recibir la acción correspondiente por props (o releer `TaskModel` vía `useModel` si vive dentro del mismo árbol de Dashboard), no reintroducir un import directo a un store global.

---

## 8. Organización de archivos

```
src/client/lib/        → cliente RPC, cliente de auth, factory de modelos remotos (createRpcModel)
src/client/models/       → modelos efímeros atados a pantalla, vía createModel + useModel (TaskModel)
src/client/stores/        → singletons globales: sesión (authStore), caché offline (offlineTasksStore)
src/client/hooks/           → hooks utilitarios reusables (usePrefetch, useTransitionRoute)
src/client/components/       → componentes de dominio (tasks/) y UI genérica (ui/), más infraestructura (router/)
src/client/pages/              → vistas mapeadas a rutas de preact-iso, dueñas de instanciar los modelos con useModel
```