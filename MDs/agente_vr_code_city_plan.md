# 🏙️ VR Code City + Agente IA (Arquitectura Avanzada)

Documento de diseño e implementación para transformar la experiencia VR de GitHub en una herramienta inmersiva de análisis de código. Basado en la metáfora de **"Software City"**, el entorno visualizará el código fuente real como una ciudad 3D interactiva y permitirá interactuar con el Oráculo (IA Local) proporcionándole contexto de los ficheros seleccionados.

---

## 🌟 Visión General del Nuevo Enfoque

Esta idea eleva el TFG a un nivel completamente nuevo. Pasamos de un "Dashboard de métricas de GitHub" a un **"Entorno Inmersivo de Análisis de Código Asistido por IA"**. 

La metáfora de la ciudad funciona así:
- **Distritos/Barrios**: Representan las carpetas (directorios) del proyecto.
- **Edificios**: Representan los ficheros.
- **Altura del edificio**: Líneas de código (LOC).
- **Color del edificio**: Tipo de lenguaje, o complejidad/frecuencia de commits.

Cuando el usuario navega por la ciudad, puede señalar un edificio específico con su controlador VR e interactuar con el Oráculo (Ollama). El Oráculo tendrá acceso al código fuente de ese fichero para explicarlo, buscar bugs o proponer refactorizaciones.

---

## 🏗️ Viabilidad y Retos

**¿Es viable?** SÍ, y tiene un valor académico inmenso. Mezcla tres áreas punteras: *Visualización de Software, Realidad Virtual, e IA Generativa Local.*

### Retos técnicos principales:
1. **Límites de contexto del LLM**: Un modelo local (Llama 3, Phi-3) no puede "leer" un repositorio entero de golpe. La solución es **RAG contextual basado en la mirada**: la IA solo lee el código del edificio (fichero) que el usuario está señalando.
2. **Generación de la Ciudad 3D**: Requiere un algoritmo en el backend que recorra las carpetas clonadas y genere un layout (como un "Treemap" en 2D que luego extruimos a 3D en A-Frame).
3. **Clonación dinámica**: El backend debe clonar el código de forma segura en una carpeta temporal y limpiar después.

---

## 📐 Nueva Arquitectura

### 1. Flujo de Clonación y Generación de la Ciudad

```
[Usuario introduce URL del Repo en el Lobby]
       ↓
[POST /api/rooms/:id/repo-clone]
       ↓
[Backend Express]
  1. git clone https://github.com/user/repo ./tmp/room-id
  2. Recorre el árbol de directorios ignorando node_modules/.git
  3. Cuenta las líneas de código (LOC) de cada fichero.
  4. Genera un JSON jerárquico (Treemap Layout).
       ↓
[Frontend A-Frame]
  1. Recibe el JSON del layout de la ciudad.
  2. Dibuja `<a-box>` (edificios) dinámicamente según las coordenadas y alturas.
```

### 2. Flujo de Interacción Agente-Código

```
[Usuario señala un Edificio en VR]
  → Gaze o Puntero Láser activa el evento `mouseenter` en el <a-box>
  → El panel del Oráculo se actualiza: "Fichero seleccionado: src/auth.js (150 líneas)"

[Usuario pulsa un botón rápido: "Explica este fichero"]
       ↓
[POST /api/rooms/:id/ask-code]
  { filePath: "src/auth.js", action: "explain" }
       ↓
[Backend (LLM Client)]
  1. Lee el contenido local de `./tmp/room-id/src/auth.js`.
  2. Crea el prompt: "Aquí tienes el código de auth.js:\n\n [CÓDIGO] \n\n Explica qué hace de forma concisa."
  3. Envía a Ollama local.
       ↓
[Oráculo en VR]
  → Responde con la explicación / refactor propuesto directamente en el panel flotante.
```

---

## 🛠️ Componentes Clave a Implementar

### A. Backend: Servicio de Análisis y Layout
Necesitaremos instalar paquetes como `simple-git` para clonar, y construir un algoritmo de layout (o usar librerías como `d3-hierarchy` en el servidor para calcular las posiciones x,y de la ciudad).

### B. Frontend: El Componente `code-city`
En lugar de gráficos de pastel o barras de BabiaXR, el centro de la escena será la ciudad generada dinámicamente.

```html
<!-- Ejemplo conceptual de cómo se renderizaría un edificio -->
<a-box class="code-building sh-hitbox"
       position="10 2.5 -5" 
       width="2" height="5" depth="2"
       color="#34d399"
       data-filepath="src/controllers/user.js"
       data-loc="250">
</a-box>
```

### C. Evolución del Oráculo
El panel del Oráculo ahora es dinámico y sensible al contexto. 
Si no estás señalando a ningún edificio, sus botones son generales (ej. *"Resume el proyecto"*).
Si apuntas a un edificio, los botones cambian a contexto de código:
1. *"¿Qué hace este fichero?"*
2. *"¿Hay algún error potencial aquí?"*
3. *"Propón cómo mejorar este código"*
4. *"Resume las dependencias de este archivo"*

---

## 🚧 Fases de Desarrollo Recomendadas

### Fase 1: Motor de Ciudad (Visualización)
- Implementar la clonación del repositorio en el backend con `simple-git`.
- Crear el script que parsea la estructura de archivos y calcula las métricas (LOC).
- Implementar el generador del layout 3D (treemap) y renderizar los `<a-box>` en A-Frame.

### Fase 2: Conexión Oráculo ↔ Ciudad
- Actualizar el Raycaster de los mandos VR para detectar los `.code-building`.
- Modificar el backend para que Ollama pueda leer el contenido de un archivo específico de la carpeta clonada temporal.
- Actualizar la UI del Oráculo para mostrar botones contextuales al seleccionar un edificio.

### Fase 3: Mejoras de Interacción (Open Code / Chat)
- Permitir input de texto libre o voz, inyectando siempre en el prompt de Ollama el archivo que el usuario tiene seleccionado actualmente.
- *Bonus*: Si el modelo propone una mejora, mostrar un panel de "Diff" (diferencias) en VR.

---

## 💬 Preguntas Abiertas para el Usuario

1. **Rendimiento Visual:** Renderizar cientos de `<a-box>` en VR puede saturar las Meta Quest. ¿Deberíamos limitar la ciudad solo a carpetas principales o excluir ciertos archivos (ej. ignorar tests o archivos de menos de 10 líneas)?
2. **Layout de la ciudad:** Construir un algoritmo de Treemap 3D desde cero lleva tiempo. ¿Prefieres que intentemos adaptarlo a primitivas simples o que exploremos si existe alguna librería A-Frame específica para layouts de grafos/ciudades?
3. **Gestión de la clonación:** Clonar repositorios grandes lleva tiempo y espacio en el disco duro. ¿Limitamos esto a repositorios pequeños/medianos durante la presentación del TFG?
