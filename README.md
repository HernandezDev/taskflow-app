```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
## 📌 Requerimientos Funcionales y Reglas de Negocio

El sistema gestiona el ciclo de vida de las tareas de forma asíncrona en el Edge bajo las siguientes especificaciones:

### 1. Modelo de Estados y Transiciones
* **Estados Estrictos:** Una tarea solo puede residir en dos estados mutables: `PENDING` o `COMPLETED`.
* **Alternancia Atómica (Toggle):** La transición entre estados se ejecuta con un solo clic. Durante el tránsito de la petición de red (`PATCH /api/tasks/:id/toggle`), el componente visual específico debe deshabilitar sus controles locales para bloquear mutaciones concurrentes, manteniendo el resto de la interfaz interactiva.

### 2. Formulario de Creación (Escritura Restringida)
* **Validación de Campos:** 
  * `title`: Cadena de texto obligatoria. Se debe aplicar sanitización elemental (*trim*) en el cliente y servidor. Longitudes vacías o compuestas únicamente por espacios en blanco deben ser rechazadas en tiempo de validación de esquema (Zod). Max: 100 caracteres.
  * `deadline`: Fecha y hora opcional (`<input type="datetime-local">`).
* **Estado de Carga Inmediato (Optimistic Blocking):** Al procesar el envío, un selector reactivo global (`isLoading`) mutará a `true`, deshabilitando el formulario completo (inputs y botones) en el DOM real para mitigar el riesgo de duplicación de registros por doble sumisión (*double-submit*).

### 3. Lógica Criterio de Vencimiento (Overdue)
* **Cálculo Dinámico Derivado:** Una tarea se evalúa como **Atrasada (Overdue)** en tiempo de ejecución si cumple concurrentemente:
  $$\text{Estado} == \text{"PENDING"} \quad \land \quad \text{deadline} \neq \text{null} \quad \land \quad \text{deadline} < \text{Date.now()}$$
* **Comportamiento en la Interfaz:** Los componentes que cumplan esta condición deben inyectar clases semánticas de TailwindCSS v4 para alertar visualmente al usuario, recalculándose sin necesidad de recargar el navegador a través del grafo de señales.

---

## 📐 Arquitectura de Flujo de Datos y Tipado E2E

El siguiente diagrama detalla la separación física de dominios, el flujo unidireccional de datos en el *runtime* y el canal de inferencia estática de tipos en tiempo de compilación:

```mermaid
graph TD
    subgraph Browser["Navegador (Entorno Cliente)"]
        direction TB
        UI["Preact Components (TSX)<br/><i>Renderizado sin VDOM</i>"]
        MVVM["ViewModel (createModel)<br/><i>State: Signals Grafo</i>"]
        RPC["Hono RPC Client<br/><i>Fetch + AbortSignal</i>"]
        
        UI -->|Dispara Eventos / Lee Signals| MVVM
        MVVM -->|Mutaciones directas al DOM| UI
        MVVM -->|Invoca Métodos Tipados| RPC
    end

    subgraph Edge["Cloudflare Infrastructure (Servidor)"]
        direction TB
        API["Hono API Router<br/><i>Validador: Zod Eschema</i>"]
        ORM["Drizzle ORM<br/><i>SQL Abstracción</i>"]
        D1[("Cloudflare D1<br/><i>SQLite en el Edge</i>")]
        
        API -->|Ejecuta Queries| ORM
        ORM -->|Transacciona| D1
        D1 -->|Auto-generación: createdAt| ORM
    end

    %% Canales de Comunicación e Inferencia
    RPC ===>|Peticiones HTTP REST / JSON| API
    API -.->|Inferencia Estática: Export AppType| RPC

    classDef client fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef server fill:#efebe9,stroke:#5d4037,stroke-width:2px;
    classDef database fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    
    class UI,MVVM,RPC client;
    class API,ORM server;
    class D1 database;
 ```
---

## Ecosistema de Gestión de Estado y Red

| Herramienta | Caso de Uso Ideal | Nivel de Lógica | ¿Dónde vive la instancia? |
| :--- | :--- | :--- | :--- |
| **`useRpcQuery`** | Mostrar un dato simple (ej. un dropdown, un widget estático). | Nula (Solo lectura). | Ciclo de vida del Componente (Efímero). |
| **`useModel`** | Una pantalla interactiva completa (ej. Tablero, Formulario complejo). | Alta (Reglas de negocio, Mutaciones, Cálculos). | Ciclo de vida del Componente (Efímero). |
| **Store Global** | Datos que viajan con el usuario por toda la app (ej. Sesión, Tema). | Alta (Negocio Global, Sincronización en segundo plano). | Exportado en un Archivo (Singleton / Memoria persistente). |


### La "Piedra Rosetta" del Estado Frontend (Moderno)

| Nivel de Escala | Taskflow (Tu Arquitectura) | Next.js (App Router) | SvelteKit (Svelte 5) |
| :--- | :--- | :--- | :--- |
| **1. Destornillador** (Lectura Simple) | `useRpcQuery` | Server Components (`fetch`) / SWR | Funciones `load` (`+page.ts`) y lecturas con `$props()` |
| **2. Sala de Control** (ViewModel Efímero) | `createRpcModel` + `useModel` | Custom Hooks + *Server Actions* | Clases o funciones con `$state` instanciadas localmente |
| **3. La Bóveda** (Estado Global) | Singleton Store exportado | *Zustand* / Context API | Archivo `.ts` exportando un `$state` global (Singleton) |

# Referencia de Códigos de Error - Better Auth

*Listado completo de códigos de error extraídos de los tipos literales de la librería (`BetterAuthErrorCode`).*

## Autenticación y Credenciales
- `INVALID_PASSWORD`
- `INVALID_EMAIL`
- `INVALID_EMAIL_OR_PASSWORD`
- `CREDENTIAL_ACCOUNT_NOT_FOUND`
- `ACCOUNT_NOT_FOUND`
- `PASSWORD_TOO_SHORT`
- `PASSWORD_TOO_LONG`
- `USER_ALREADY_HAS_PASSWORD`
- `PASSWORD_ALREADY_SET`

## Usuarios y Sesiones
- `USER_NOT_FOUND`
- `INVALID_USER`
- `FAILED_TO_CREATE_USER`
- `FAILED_TO_UPDATE_USER`
- `USER_ALREADY_EXISTS`
- `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`
- `FAILED_TO_GET_USER_INFO`
- `FAILED_TO_CREATE_SESSION`
- `FAILED_TO_GET_SESSION`
- `SESSION_EXPIRED`
- `SESSION_NOT_FRESH`

## Verificación y Emails
- `USER_EMAIL_NOT_FOUND`
- `EMAIL_NOT_VERIFIED`
- `EMAIL_CAN_NOT_BE_UPDATED`
- `CHANGE_EMAIL_DISABLED`
- `VERIFICATION_EMAIL_NOT_ENABLED`
- `EMAIL_ALREADY_VERIFIED`
- `EMAIL_MISMATCH`
- `FAILED_TO_CREATE_VERIFICATION`

## Proveedores Sociales (OAuth)
- `SOCIAL_ACCOUNT_ALREADY_LINKED`
- `PROVIDER_NOT_FOUND`
- `LINKED_ACCOUNT_ALREADY_EXISTS`
- `FAILED_TO_UNLINK_LAST_ACCOUNT`

## Tokens y URLs de Retorno (Callbacks)
- `INVALID_TOKEN`
- `TOKEN_EXPIRED`
- `ID_TOKEN_NOT_SUPPORTED`
- `INVALID_ORIGIN`
- `INVALID_CALLBACK_URL`
- `INVALID_REDIRECT_URL`
- `INVALID_ERROR_CALLBACK_URL`
- `INVALID_NEW_USER_CALLBACK_URL`
- `MISSING_OR_NULL_ORIGIN`
- `CALLBACK_URL_REQUIRED`

## Validaciones y Errores Internos de API
- `FIELD_NOT_ALLOWED`
- `ASYNC_VALIDATION_NOT_SUPPORTED`
- `VALIDATION_ERROR`
- `MISSING_FIELD`
- `METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED`
- `BODY_MUST_BE_AN_OBJECT`
- `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`

# 📋 Plan de Tareas Pendientes y Roles de la Arquitectura
🧱 FASE 1: El Backend y el Contrato Maestro
Tarea 1: Crear los Schemas de Zod (note.schema.ts)

    El Rol de Zod: Gobernar y comunicar la ENTRADA (El Request).

    Su función exacta: Actúa como el guardia de seguridad del servidor. Dicta la estructura obligatoria de lo que el cliente intenta enviar (ej: "el título es un texto obligatorio de máximo 100 caracteres"). Viaja hacia el frontend a través de TypeScript para avisarle a tu editor de código qué datos exactos debe teclear el programador al mandar una petición, bloqueando cualquier dato corrupto en tiempo de ejecución.

Tarea 2: Crear el Controlador de Hono (notes.router.ts)

    El Rol de Hono RPC: Automatizar e inferir la SALIDA (El Response).

    Su función exacta: Ejecutar la lógica en el servidor (guardar en base de datos). Al responder, no usa Zod; en su lugar, TypeScript lee directamente tu código (return c.json(...)) y deduce automáticamente qué forma tiene la respuesta exitosa.

    El Contrato Maestro: Al final, empaqueta la regla de entrada de Zod y la regla de salida de Hono en un único tipo de TypeScript (type NotesRouter). Este tipo se exporta al frontend para documentar toda la autopista de comunicación.

🧠 FASE 2: El Frontend y la Separación de Cerebros
Tarea 3: Crear el Cerebro Global (notesStore.ts)

    El Rol de este elemento: El Almacén Inmortal (Persistencia en Memoria RAM).

    ¿Por qué es GLOBAL?: Porque su ciclo de vida es infinito mientras la aplicación esté abierta. No le importan los formularios, ni los errores de pantalla, ni los cargadores (loaders). Su único trabajo es guardar la lista pura de notas que bajó del servidor. Al ser global, si el usuario navega del Dashboard a su Perfil y luego regresa, las notas siguen vivas en la RAM. Evitamos destruir los datos y tener que hacer llamadas repetidas (fetch) a Cloudflare Workers, logrando una velocidad instantánea.

Tarea 4: Crear el Cerebro Local (NoteEditorModel.ts)

    El Rol de este elemento: El Trabajador Efímero (Estado de Interacción).

    ¿Por qué está ATADO AL CICLO DE VISTA?: Porque gestiona la basura temporal de la interfaz: el texto que el usuario está escribiendo en el <Editable> en ese instante, el booleano isSaving (para mostrar el spinner de carga), o el mensaje de error si el servidor se cae.

    La mitigación del Estado Zombie: Al estar atado al ciclo de vida del componente, en el momento en que el usuario cierra el editor o cambia de pantalla, este modelo se destruye por completo en la memoria. Si el usuario vuelve a entrar al editor de notas 10 minutos después, el modelo nace completamente de cero, limpio, sin textos a medio borrar ni errores viejos bloqueando la pantalla.

🔄 El Flujo de Cierre (Cómo colaboran)

Cuando el usuario termine de editar en el componente tonto y presione guardar:

    El Modelo Local recopila el texto y lo envía al backend usando el cliente tipado por el Router de Hono.

    Zod valida en el servidor que la entrada sea correcta.

    El servidor guarda la nota y devuelve la respuesta que Hono RPC ya documentó.

    Si la respuesta es exitosa, el Modelo Local toma esa nota nueva y se la entrega al Store Global.

    El Store Global actualiza su array en memoria y, gracias a la reactividad atómica de las Signals, la pantalla se redibuja en milisegundos sin re-renderizar todo el Dashboard.
