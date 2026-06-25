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

### 2.1 Restricción Absoluta de React Hooks
Está **ESTRICTAMENTE PROHIBIDO** importar o utilizar: `useState`, `useReducer`, `useMemo` o `useCallback`. Toda la reactividad, derivación de estado y control de efectos secundarios debe ser gestionada exclusivamente mediante las primitivas detalladas en la sección 3.

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

* **`<Show>`**: Reemplaza de forma mandatoria los operadores ternarios (`condition ? <A/> : <B/>`) basados en expresiones reactivas. Previene reflows innecesarios evaluando el estado de manera eficiente:
    ```jsx
    <Show when={isVisible} fallback={<p>Acceso denegado</p>}>
      {/* Soporta renderizado directo o función inyectada con el valor actual */}
      {(value) => <AdminPanel data={value} />}
    </Show>
    ```
* **`<For>`**: Reemplaza de forma obligatoria el método clásico `array.map()` al renderizar colecciones basadas en arrays reactivos. Implementa de manera nativa un mecanismo de caché indexada que congela y reutiliza los elementos del DOM mutados, evitando re-renders masivos al insertar, mover o eliminar ítems de la lista.
    ```jsx
    <For each={items} fallback={<p>No hay registros disponibles</p>}>
      {(item, index) => <div key={index}>Registro: {item}</div>}
    </For>
    ```
* **`useLiveSignal(externalSignal)`**: Hook utilitario para generar un signal local sincronizado automáticamente y de forma unidireccional ante cualquier mutación de un signal externo u observable de infraestructura.
* **`useSignalRef(initialValue)`**: Genera una primitiva que unifica la interfaz de un `Ref` de Preact (vía `.current`) con la reactividad de un signal. Permite atrapar de forma reactiva mutaciones sobre referencias físicas de elementos del DOM.

---
### 3.4 Prohibición Estricta de Gestores de Estado y Caché Externos
Queda **ESTRICTAMENTE PROHIBIDA** la instalación e integración de librerías de gestión de estado global (Redux, Zustand, Jotai, Valtio, Pinia) o clientes de caché de servidor (React Query, SWR, RTK Query). La arquitectura actual las hace funcionalmente obsoletas, añaden latencia en la evaluación del cliente e incrementan innecesariamente el tamaño del bundle.

* **Estado Global de UI:** El motor `@preact/signals-core` opera de forma agnóstica a la capa de vista. Para compartir estado entre componentes sin *prop-drilling*, instancia un `signal()` o un `createModel()` en un archivo TypeScript puro (ej. `src/client/store/`) y expórtalo como un Singleton. Cualquier componente que lo importe se suscribirá automáticamente sin necesidad de envoltorios `<Provider>`.
* **Estado de Red y Caché:** La gestión de estados asíncronos, reintentos, promesas en vuelo y abortos de peticiones se delega EXCLUSIVAMENTE a la infraestructura E2E mediante Hono RPC y el hook de control `useRpcQuery`.

### 3.5 Excepción de Interoperabilidad (Zona de Cuarentena para Librerías React)

El ecosistema de dependencias está fuertemente acoplado a React. Al utilizar `preact/compat` para consumir librerías de terceros (ej. librerías de animaciones complejas, DataGrids, Drag & Drop) que exigen en su API el uso de patrones clásicos, se establece la siguiente excepción arquitectónica:

* **Wrappers de Aislamiento:** Se permite el uso de hooks tradicionales (`useEffect`, `useRef`, `useCallback`, `useState`) **ÚNICA Y EXCLUSIVAMENTE** dentro de componentes adaptadores ("Wrappers"). El único propósito de este archivo será conectar el ecosistema limpio de Signals con el ecosistema sucio de la librería externa.
* **Patrón de Traducción:** El Wrapper actúa como una frontera estricta. Recibe un `signal` (o lo lee del store), lo traduce al formato que la librería de React exige (usando `useSignalEffect` para sincronizar), e intercepta los eventos de la librería para mutar el `signal` de vuelta.
* **Prohibición de Fuga:** Bajo ninguna circunstancia la lógica nativa de React de estos componentes de terceros debe filtrarse hacia los controladores de dominio (`createModel`) o a la estructura principal de la UI.
* **Ubicación Estricta:** Cualquier componente que aplique esta excepción deberá aislarse físicamente en una ruta dedicada, como `src/client/components/vendors/`.

## 4. Capa de Backend (Hono) y Base de Datos (Cloudflare D1)

* **Framework:** **Hono**, configurado para entornos Edge rápidos y con consumo mínimo de memoria.
* **Base de Datos:** **Cloudflare D1** (arquitectura SQLite nativa de Cloudflare).
* **ORM:** **Drizzle ORM**. Las consultas deben optimizarse mediante *prepared statements* y transacciones atómicas para cumplir con los límites de concurrencia y latencia impuestos por D1.
* **Patrón de Rutas:** Uso mandatorio de rutas encadenadas para exportar un tipo estricto unificado (`AppType`). Este tipo sirve de contrato inmutable con el frontend.

---

## 5. Comunicación E2E (Hono RPC) y Mitigación de Race Conditions

### 5.1 Tipado de Red de Extremo a Extremo (E2E)
* El frontend consume la API del servidor exclusivamente a través del cliente Hono RPC generado mediante `hc<AppType>`.
* Existe un cliente único (Singleton) localizado en `src/client/lib/api.ts` que intercepta la función `fetch` nativa para inyectar configuraciones globales necesarias (encabezados de autenticación, telemetría, gestión de credenciales).

### 5.2 Control estricto de Peticiones y Ciclo de Vida (`useRpcQuery`)
* Toda carga inicial de datos o query asíncrona del lado del cliente **SIEMPRE** se encapsulará en el hook de infraestructura `useRpcQuery`.
* Este hook instancia internamente un `AbortController`. Es obligatorio pasar el `AbortSignal` obtenido al segundo argumento (`RequestInit`) de la llamada del cliente Hono RPC. 
* **Objetivo:** Si el componente se desmonta antes de que la promesa se resuelva, la petición de red se cancela de inmediato, evitando *race conditions* en el cliente y ahorrando ciclos de cómputo/facturación en las funciones Edge de Cloudflare.

---

## 6. Configuración de TypeScript y Organización Feature-Lite

### 6.1 Restricciones de TypeScript (Project References)
* Se implementa **TypeScript Project References** con un orquestador raíz.
* `tsconfig.client.json`: Configuración estricta orientada exclusivamente al entorno DOM.
* `tsconfig.server.json`: Configuración estricta orientada al entorno Cloudflare Edge (Worker runtime).
* **Aislamiento de Lógica:** El frontend solo consume tipos abstractos mediante las referencias configuradas. Queda estrictamente prohibido importar código ejecutable del backend en los bundles de Vite.
* **Sintaxis de Módulos:** `verbatimModuleSyntax` está habilitado por directiva global. Al cruzar la frontera entre frontend y backend, es obligatorio declarar las importaciones explicientemente mediante `import type`.

### 6.2 Organización de Archivos (Feature-Lite)
El código debe estructurarse estrictamente bajo los siguientes directorios para preservar la modularidad física y lógica del monorepo:

* `src/client/lib/` -> Infraestructura de red y hooks base abstractos (`api.ts`, `useRpcQuery.ts`).
* `src/client/hooks/` -> Hooks orientados al dominio del negocio (especializaciones de queries que consumen la infraestructura).
* `src/client/components/` -> Componentes puramente visuales, layout y ensamblaje JSX que consumen los hooks de dominio o instancian modelos locales.