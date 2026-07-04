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

### 2.1 Ámbitos de Responsabilidad de Hooks (Dominio vs. Infraestructura)
La validez del uso de hooks nativos de React/Preact (`useState`, `useEffect`, `useReducer`, `useMemo`, `useCallback`) se define estrictamente por su ámbito de ejecución en la arquitectura:
* **Capa de Dominio y Vistas (Restringido):** Para la construcción de componentes visuales, páginas, flujos de datos y lógica de negocio, su uso está **estrictamente prohibido**. Toda reactividad local, derivación de estado y manejo de efectos secundarios asíncronos debe gestionarse de forma exclusiva mediante el ecosistema `@preact/signals` y `createModel`.
* **Capa de Infraestructura y Enrutamiento (Permitido):** Los hooks nativos son válidos única y exclusivamente como mecanismos de puente y orquestación arquitectónica. Ejemplos legítimos en el repositorio incluyen:
  - **Bootstrap Raíz:** `App.tsx` (ej. recuperar la sesión de forma asíncrona al montar la SPA).
  - **Guards de Autenticación:** `PrivateRoute.tsx` o `GuestRoute.tsx` (ej. usar `useEffect` para interceptar la navegación y redirigir al usuario si la sesión cambia de estado).

### 2.2 Enrutador Oficial (`preact-iso`)
Se utilizará **`preact-iso`** como enrutador oficial debido a su naturaleza *Edge-first*. Sus hooks nativos (`useLocation`, etc.) están confinados estrictamente a la Capa de Vista (decidir qué componente renderizar basándose en la URL), por lo que cumplen con la separación de responsabilidades.

---

## 3. Especificación Técnica de Signals (`@preact/signals`)

El motor reactivo aísla estrictamente la lógica de la UI apoyándose en las APIs oficiales de la librería.

### 3.1 Patrón Explícito de Encapsulamiento (`ReadonlySignal`)
Para prevenir mutaciones accidentales desde la UI, se instaura el patrón de **Flujo de Datos Unidireccional Estricto** apoyado en TypeScript:
* Todo modelo debe definir una `interface` explícita donde el estado expuesto a la vista esté tipado estrictamente como `ReadonlySignal`.
* Las variables `signal` internas son privadas; solo se devuelven bajo la firma de la interfaz.
* **Regla de Oro:** Los componentes JSX **solo pueden leer** Signals. Cualquier mutación debe realizarse ejecutando las acciones/métodos definidos en la interfaz del Modelo/Store.

### 3.2 Unificación Arquitectónica (`createModel` y `useModel`)
Toda agrupación de estado y lógica de negocio se genera utilizando la función oficial **`createModel`** de `@preact/signals`. La arquitectura divide su uso en dos conceptos físicos:

#### A. Stores (Estado Global / Singleton)
* **Definición:** Instancias únicas que sobreviven a la navegación.
* **Casos de Uso:** Sesión del usuario (`authStore`), caché global, preferencias de UI.
* **Instanciación:** Se exporta una única instancia generada con `new` directamente en el archivo `.ts`.

#### B. Modelos (Estado Efímero / Orientado a Componente)
* **Definición:** Lógica transitoria atada estrictamente al ciclo de vida de un componente (ej. estado de un formulario, paginación local).
* **Instanciación Estática:** Usar `const model = useModel(MyModel)` para modelos sin argumentos.
* **Instanciación Dinámica (Con Props):** Obligatorio usar fábrica: `const model = useModel(() => new MyModel(props.id))`.
* **Ciclo de Vida Automático:** El hook oficial `useModel` se encarga de crear la instancia en el primer renderizado, memorizarla y ejecutar su disposición al desmontar el componente.

### 3.3 Limpieza y Disposición Personalizada (*Custom Dispose*)
Si un modelo maneja recursos fuera del motor de signals (conexiones, temporizadores, o controladores `AbortController` de red), es **obligatorio** registrar su limpieza dentro de `createModel` usando un efecto sin dependencias que retorne la función de limpieza:
```typescript
const DataModel = createModel(() => {
  const abortController = new AbortController();
  effect(() => {
    return () => abortController.abort(); // Ejecutado vía Symbol.dispose
  });
  return { ... };
});
```

### 3.4 Bypass del Virtual DOM
* **Nodos de Texto:** Prohibido acceder a `.value` en el renderizado JSX. Pasa la referencia directa (`<p>{count}</p>`).
* **Atributos:** Pasa los signals a propiedades HTML (`value={inputValue}`) para mutaciones atómicas sin *diffing*.

---

## 4. Capa de Backend (Hono) y Base de Datos (Cloudflare D1)

* **Framework:** **Hono**, configurado con patrón *Lazy-Singleton* para inicialización diferida orientada a mitigar el *Cold Start*.
* **Base de Datos:** **Cloudflare D1** (SQLite distribuido).
* **ORM:** **Drizzle ORM**. Las consultas deben optimizarse mediante *prepared statements*. La inicialización de la conexión a D1 debe mantenerse separada de la infraestructura de Autenticación.
* **Patrón de Rutas:** Uso mandatorio de rutas encadenadas para exportar un tipo estricto unificado (`AppType`). 

---

## 5. Comunicación E2E, Red y Autenticación

### 5.1 Tipado de Red de Dominio (Zod + Hono RPC)
* El frontend consume la **API de Dominio** (CRUD de negocio, operaciones de la DB) exclusivamente a través del cliente tipado `hc<AppType>`.
* **Contrato de Datos (Zod):** Todo endpoint que reciba *payloads* debe validar la entrada síncronamente con Zod (`@hono/zod-validator`) bajo una política *Fail-Fast*.

### 5.2 Excepción de Autenticación (Better Auth)
Las peticiones relacionadas a la identidad del usuario (login, registro, recuperación de sesión) **no pasan** por Hono RPC. Estas son gestionadas exclusivamente de forma directa a través del cliente agnóstico generado por Better Auth (`src/client/lib/auth-client.ts`), el cual mantiene su propio contrato estricto de tipos con la configuración del servidor.

### 5.3 Control estricto de Peticiones Asíncronas
* Toda petición de red (**fetching**) se encapsulará directamente dentro de los métodos de un Modelo (`createModel`). 
* Es imperativo usar un `AbortController` local, limpiado vía efecto de disposición, para cancelar peticiones en vuelo y mitigar fugas de memoria al desmontar componentes de la vista.

---

## 6. Configuración de TypeScript y Organización Feature-Lite

### 6.1 Restricciones de TypeScript
* **Project References:** Orquestador raíz con `tsconfig.client.json` y `tsconfig.server.json`.
* **Sintaxis de Módulos:** `verbatimModuleSyntax` habilitado. Es obligatorio usar `import type` para cruzar fronteras frontend/backend.

### 6.2 Organización de Archivos
* `src/client/lib/` -> Configuración de red (Hono RPC, cliente de Better Auth) y utilidades base.
* `src/client/stores/` -> Singletons exportados globales (ej. `authStore.ts`).
* `src/client/models/` -> Clases generadas con `createModel` e Interfaces de TypeScript (`ReadonlySignal`).
* `src/client/pages/` -> Vistas mapeadas a rutas de `preact-iso`.
* `src/client/components/` -> Componentes puros (`UI`) e Infraestructura (`Router`).