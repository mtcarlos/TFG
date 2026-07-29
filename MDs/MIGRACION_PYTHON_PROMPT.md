# Prompt de Instrucción para Migración a Microservicios (Python)

**Rol del Agente:** Eres un Arquitecto de Software Senior y un Ingeniero Backend experto en Node.js, Python (FastAPI/Flask) y arquitecturas de microservicios.

**Objetivo Principal:** Diseñar e implementar la migración parcial del backend del proyecto "VR Code City" hacia una arquitectura de microservicios híbrida, sin romper la compatibilidad actual con el cliente (Frontend). Todo debe seguir funcionando exactamente igual desde la perspectiva del usuario final.

## Contexto del Sistema Actual
El sistema actual es un monolito en Node.js que gestiona dos flujos radicalmente distintos:
1. **Flujo de Tiempo Real:** WebSockets y WebRTC (vía EasyRTC y Networked-Aframe) para la presencia de avatares VR y voz.
2. **Flujo de Procesamiento Pesado:** Clonación de repositorios de GitHub, análisis de árbol de archivos (Treemap/Layout) y comunicación HTTP con LLMs (OpenRouter) para el asistente virtual ("Oráculo").

## Alcance de la Migración
El Flujo 1 (Tiempo Real) **debe permanecer intacto en Node.js**.
El Flujo 2 (Procesamiento Pesado e IA) **debe extraerse completamente a un nuevo microservicio en Python**. 

El servidor Node.js pasará a actuar como un API Gateway o proxy para estas peticiones pesadas, delegando el trabajo matemático y de IA al servicio de Python.

---

## 1. Requisitos Funcionales (FR)

### FR1. Extracción del Módulo de Análisis de Repositorios
- El servicio en Python debe exponer un endpoint REST (ej. `POST /api/python/clone-and-analyze`) que reciba la URL de un repositorio de GitHub y el ID de la sala.
- Python debe ejecutar la clonación eficiente (`git clone --filter=blob:none`) en una carpeta temporal gestionada por él.
- Debe replicar la lógica actual de contar Líneas de Código (LOC), ignorar directorios basura (`node_modules`, binarios) y calcular timestamps de commits.
- Debe devolver un JSON con la estructura exacta (Treemap/City Layout) que Node.js enviará posteriormente al cliente.

### FR2. Extracción del Módulo Oráculo (LLM)
- El servicio en Python debe exponer un endpoint (ej. `POST /api/python/oracle/ask`) que reciba un `filePath`, la pregunta del usuario y el ID de la sala.
- Python debe buscar el archivo en su sistema de archivos temporal, leer el contenido en crudo, empaquetar el prompt y realizar la petición a la API de OpenRouter.
- Devolverá la respuesta en texto limpio al servicio Node.js.

### FR3. Patrón Proxy en Node.js
- Los endpoints actuales en `server/easyrtc-server.js` (`/api/rooms/:roomId/repo-clone` y `/api/rooms/:roomId/oracle/ask`) **no deben ser eliminados ni cambiar su firma de entrada/salida de cara al frontend**.
- Su lógica interna debe ser reescrita para convertirse en simples llamadas HTTP asíncronas (`fetch` o `axios`) que apunten a los nuevos endpoints del microservicio en Python.

---

## 2. Requisitos No Funcionales (NFR)

### NFR1. Compatibilidad y Transparencia (Backward Compatibility)
- El contrato de la API REST que consume el frontend de A-Frame debe permanecer 100% idéntico. El cliente web no debe requerir ninguna modificación en sus archivos JavaScript.

### NFR2. Seguridad y Aislamiento (Sandboxing)
- El microservicio en Python debe implementar mecanismos robustos de "Garbage Collection". Al igual que el sistema actual, cuando Node.js detecte que una sala se ha vaciado, debe notificar a Python (ej. `DELETE /api/python/rooms/:roomId`) para que este elimine de forma segura la carpeta clonada de `/tmp/`.
- Validar rigurosamente los inputs (URLs de repositorios) en Python para evitar inyección de comandos en consola a través del wrapper de Git.

### NFR3. Rendimiento y Concurrencia
- El servidor Python debe ser asíncrono (se recomienda encarecidamente **FastAPI** junto con `asyncio`) para poder procesar la clonación de múltiples repositorios simultáneamente sin bloquear el hilo principal.
- La comunicación entre Node.js y Python debe realizarse por red interna (`localhost` o red privada de contenedores si se usa Docker), con latencia submilisegundo.

### NFR4. Mantenibilidad
- El código Python debe seguir el estándar de tipado estricto (Type Hints) y documentarse con docstrings.
- Se debe entregar un archivo `requirements.txt` o `Pipfile` para la fácil instalación de dependencias en el nuevo servicio.

---

## Instrucciones de Ejecución para el Agente
Por favor, analiza estos requisitos y procede en el siguiente orden:
1. Diseña y muestra la arquitectura de las nuevas rutas de red entre Node.js y FastAPI.
2. Escribe el código del nuevo microservicio en Python (generando los archivos `main.py`, `analyzer.py`, y `oracle.py`).
3. Refactoriza el archivo actual `server/easyrtc-server.js` y `server/repoAnalyzer.js` de Node.js para eliminar la lógica pesada y transformarla en el cliente (Proxy) del servicio Python.
4. Explica cómo arrancar ambos servidores simultáneamente para pruebas locales.
