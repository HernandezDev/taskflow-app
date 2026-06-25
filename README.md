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
