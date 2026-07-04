# Especificación de Arquitectura y Directrices Técnicas (Monorepo Lógico)

Este documento centraliza de forma estricta las reglas arquitectónicas, restricciones del entorno, convenciones de tipado y optimizaciones de rendimiento que rigen el proyecto SPA Fullstack Edge. Cualquier desviación de estas pautas compromete la estabilidad, la eficiencia del *cold-start* en Cloudflare Workers/Pages o el rendimiento reactivo del cliente, y será tratada como deuda técnica crítica.

---

## 1. Resumen de la Arquitectura

* **Tipo de Aplicación:** Single Page Application (SPA) Fullstack.
* **Entorno de Despliegue:** Servidor Serverless/Edge distribuido globalmente (**Cloudflare Workers / Pages**).
* **Orquestador de Build:** Vite (optimizado para producción Edge sin sobrecarga de dependencias *legacy*).
* **Diseño y Estilos:** **TailwindCSS v4** utilizando configuración *CSS-first* a través del motor nativo Lightning CSS. Queda bloqueado el uso de archivos de configuración basados en JavaScript puro (`tailwind.config.js`) y plugins obsoletos.

---

## 2. Capa de Frontend (Preact & Reactividad Granular)

### 2.1 Restricción Principal de React Hooks (Capa de Datos)
Está **ESTRICTAMENTE PROHIBIDO** importar o utilizar: `useState`, `useReducer`, `useMemo` o `useCallback` para gestionar la lógica de negocio, peticiones de red o el estado global de la aplicación. Toda la reactividad, derivación de estado y control de efectos secundarios debe ser gestionada exclusivamente mediante las primitivas de Signals detalladas en la sección 3.

### 2.2 Excepción Estricta de Enrutamiento (Capa de Vista)
La prohibición de hooks nativos aplica a la capa de dominio. Se permite el uso implícito de hooks nativos de forma exclusiva por parte de la librería de enrutamiento oficial elegida (**`wouter-preact`**). Dado que su responsabilidad está confinada estrictamente a la Capa de Vista (decidir qué componente renderizar basándose en la URL), su uso no contamina el estado del dominio ni viola la arquitectura de desacoplamiento.

---

## 3. Especificación Técnica de la API de Signals

El motor reactivo se divide en tres paquetes con responsabilidades físicas y semánticas totalmente aisladas. Su uso debe ceñirse estrictamente a las siguientes firmas y reglas de ejecución:

### 3.1 `@preact/signals-core` (El Motor de Grafo Reactivo Puro)
Primitivas agnósticas del DOM para modelar el estado y la lógica de negocio pura.

* **`signal(initialValue, options)`**: Contenedor de estado síncrono. 
    * *Ciclo de vida avanzado*: Es obligatorio evaluar el uso del segundo argumento de configuración para la gestión eficiente de recursos en infraestructura o efectos secundarios globales:
        ```typescript
        const stream = signal(initial, {
          name: "telemetry_stream",
          watched() { /* Se ejecuta al recibir el primer subscriptor activo */ },
          unwatched() { /* Se ejecuta cuando pierde el último subscriptor; limpiar recursos aquí */ }
        });
        ```
* **`signal.peek()`**: Recupera el valor interno de un signal sin registrar una subscripción en el contexto reactivo actual. Es **obligatorio** su uso dentro de un `effect` cuando se requiere escribir en un signal `B` basándose en el estado de un signal `A`, si no se desea que los cambios en `B` re-ejecuten el efecto (prevención de bucles infinitos).
* **`computed(fn)`**: Derivación pura, memorizada y perezosa (*lazy*). La función `fn` solo se evalúa si existe al menos un subscriptor activo escuchando su cambio. Las dependencias se registran dinámicamente en tiempo de ejecución al acceder a `.value`.
* **`effect(fn)`**: Registra un observador síncrono en el grafo. 
    * *Disposición*: Retorna una función `dispose()` para destruir la subscripción manualmente.
    * *Limpieza*: La función `fn` puede retornar un callback de limpieza (*cleanup function*) que se ejecuta inmediatamente antes de la siguiente evaluación del efecto o al ser dispuesto.
    * *Contexto*: Si no se usa una función flecha, se puede invocar `this.dispose()` internamente para auto-destruirse bajo una condición de parada.
* **`batch(fn)`**: Agrupa múltiples escrituras síncronas en una única notificación al final del callback. Si se lee un signal modificado dentro del mismo `batch`, el motor forzará la actualización parcial únicamente de las dependencias necesarias para garantizar la consistencia de esa lectura inmediata; el resto se procesará al finalizar el bloque.
* **`untracked(fn)`**: Ejecuta un bloque de código arbitrario que lee signals sin registrar subscripciones en el contexto reactivo superior. Es el sustituto directo de aislamiento perimetral.
* **`createModel(fn)`**: Define abstracciones de negocio desechables. Envuelve automáticamente cada método retornado como una acción (*batched* y *untracked* por defecto). Captura de forma determinista todos los efectos creados durante la construcción para destruirlos en masa al invocar el método nativo `model[Symbol.dispose]()`.

### 3.2 `@preact/signals` (Enlace en Componentes e Integración de Ciclo de Vida)
Abstracciones para acoplar el grafo reactivo al ciclo de vida de los componentes de Preact.

* **Hooks Locales (`useSignal`, `useComputed`, `useSignalEffect`)**: Primitivas para instanciar estado reactivo volátil confinado estrictamente al árbol de un componente JSX.
* **`useModel(ModelFactory)`**: Hook imperativo para instanciar modelos complejos generados vía `createModel`. Garantiza una única inicialización por componente y delega la recolección de basura (*garbage collection*) invocando de manera automática `[Symbol.dispose]()` cuando el componente se desmonta de la UI.
* **Bypass del Virtual DOM (Regla de Oro de Rendimiento)**:
    * *Nodos de Texto*: Está **prohibido** acceder a `.value` dentro de elementos de texto JSX si se desea aislar el renderizado del nodo. Debe pasarse el objeto `signal` directamente.
        ```jsx
        // INCORRECTO: Re-renderiza todo el componente contenedor
        return <p>Contador: {count.value}</p>;
        
        // CORRECTO: Modifica directamente el nodo de texto en el DOM real; saltándose el VDOM
        return <p>Contador: {count}</p>;
        ```
    * *Optimización de Atributos*: Pasa los signals directamente a propiedades HTML nativas (`value={inputValue}`, `disabled={isDisabled}`). Preact interceptará la mutación y actualizará la propiedad del elemento del DOM de forma atómica sin comprobación de diferencias (*diffing*) en el VDOM.

### 3.3 `@preact/signals/utils` (Componentes de Control Estricto y Utilidades)
Componentes funcionales de optimización estructural para el árbol JSX que reemplazan las estructuras lógicas nativas de JavaScript.

* **`<Show>`**: Reemplaza de forma mandatoria los operadores ternarios (`condition ? <A/> : <B/>`) basados en expresiones reactivas. Previene reflows innecesarios evaluando el estado de manera eficiente.
* **`<For>`**: Reemplaza de forma obligatoria el método clásico `array.map()` al renderizar colecciones basadas en arrays reactivos. Implementa de manera nativa un mecanismo de caché indexada que congela y reutiliza los elementos del DOM mutados.
* **`useLiveSignal(externalSignal)`**: Hook utilitario para generar un signal local sincronizado automáticamente.
* **`useSignalRef(initialValue)`**: Genera una primitiva que unifica la interfaz de un `Ref` de Preact (vía `.current`) con la reactividad de un signal.

### 3.4 Prohibición Estricta de Gestores de Estado y Caché Externos
Queda **ESTRICTAMENTE PROHIBIDA** la instalación e integración de librerías de gestión de estado global (Redux, Zustand, Jotai, Valtio, Pinia) o clientes de caché de servidor (React Query, SWR, RTK Query). 

* **Estado Global de UI:** El motor `@preact/signals-core` opera de forma agnóstica a la capa de vista. Cualquier componente que lo importe se suscribirá automáticamente sin necesidad de envoltorios `<Provider>`.
* **Estado de Red y Caché:** La gestión de estados asíncronos se delega EXCLUSIVAMENTE a la infraestructura E2E mediante Hono RPC y el hook de control `useRpcQuery`.

### 3.5 Gestión de Autenticación y Sesión (Better Auth)
El control de identidad, sesión y autenticación se gestiona exclusivamente a través del cliente **Vanilla** (agnóstico) de **Better Auth**. Su estado debe encapsularse en un módulo de TypeScript puro (ej. `authStore.ts`) utilizando `@preact/signals-core`, manteniéndolo fuera del ciclo de vida de Preact. Queda terminantemente prohibido el uso de *Context Providers* de React/Preact para distribuir la sesión del usuario en el árbol de componentes.

### 3.6 Excepción de Interoperabilidad (Zona de Cuarentena para Librerías React)
Al utilizar `preact/compat` para consumir librerías de terceros complejas (ej. DataGrids, Drag & Drop), se establece la siguiente excepción:

* **Wrappers de Aislamiento:** Se permite el uso de hooks tradicionales **ÚNICA Y EXCLUSIVAMENTE** dentro de componentes adaptadores ("Wrappers"). El único propósito de este archivo será conectar el ecosistema limpio de Signals con el ecosistema de la librería externa.
* **Prohibición de Fuga:** La lógica nativa de React de estos componentes nunca debe filtrarse hacia los controladores de dominio (`createModel`) ni a la estructura principal de la UI. Deberán aislarse en `src/client/components/vendors/`.

---

## 4. Capa de Backend (Hono) y Base de Datos (Cloudflare D1)

* **Framework:** **Hono**, configurado con patrón *Lazy-Singleton* para inicialización diferida orientada a mitigar el *Cold Start* en el entorno Edge.
* **Base de Datos:** **Cloudflare D1** (arquitectura SQLite nativa de Cloudflare).
* **ORM:** **Drizzle ORM**. Las consultas deben optimizarse mediante *prepared statements*. La inicialización de la conexión a D1 debe mantenerse físicamente separada entre la lógica de negocio y la infraestructura de Autenticación para garantizar el desacoplamiento de dominios.
* **Patrón de Rutas:** Uso mandatorio de rutas encadenadas para exportar un tipo estricto unificado (`AppType`). 

---

## 5. Comunicación E2E (Hono RPC) y Validación Estricta

### 5.1 Tipado de Red y Validación E2E (Zod + Hono RPC)
* El frontend consume la API del servidor exclusivamente a través del cliente Hono RPC generado mediante `hc<AppType>`.
* **Contrato de Datos (Zod):** El contrato de tipos expuesto en `AppType` debe ser generado obligatoriamente infiriendo los esquemas de validación de **Zod** mediante el middleware `@hono/zod-validator`. 
* Toda ruta que reciba *payloads* (cuerpos JSON en POST/PUT/PATCH o parámetros de query) debe validar de forma síncrona su entrada con Zod para garantizar una política *Fail-Fast* antes de ejecutar cualquier lógica de negocio o consulta a la base de datos D1.

### 5.2 Control estricto de Peticiones y Ciclo de Vida (`useRpcQuery`)
* Toda carga inicial de datos o query asíncrona del lado del cliente **SIEMPRE** se encapsulará en el hook de infraestructura `useRpcQuery`.
* Este hook instancia internamente un `AbortController`. Es obligatorio pasar el `AbortSignal` obtenido al segundo argumento (`RequestInit`) de la llamada del cliente Hono RPC para cancelar peticiones al desmontar componentes y mitigar *race conditions*.

---

## 6. Configuración de TypeScript y Organización Feature-Lite

### 6.1 Restricciones de TypeScript (Project References)
* Se implementa **TypeScript Project References** con un orquestador raíz (`tsconfig.client.json` y `tsconfig.server.json`).
* **Sintaxis de Módulos:** `verbatimModuleSyntax` está habilitado. Al cruzar la frontera entre frontend y backend, es obligatorio declarar las importaciones explicientemente mediante `import type`.

### 6.2 Organización de Archivos (Feature-Lite)
El código debe estructurarse estrictamente bajo los siguientes directorios para preservar la modularidad física y lógica del monorepo:

* `src/client/lib/` -> Infraestructura de red, configuración de clientes (Better Auth, Hono) y abstracciones base.
* `src/client/store/` -> Estado global agnóstico y Singleton (ej. `authStore.ts`) utilizando `@preact/signals-core`.
* `src/client/hooks/` -> Hooks orientados al dominio del negocio que consumen la infraestructura (ej. implementaciones de `useRpcQuery`).
* `src/client/pages/` -> Vistas principales mapeadas directamente a las rutas del enrutador (`wouter-preact`).
* `src/client/components/` -> Componentes puramente visuales, layout y ensamblaje JSX.
---