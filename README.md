# Proyecto TFG: Entorno Virtual Colaborativo 🌐

Este proyecto es una plataforma de realidad virtual compartida y multijugador desarrollada para la web (WebVR/WebXR). En este entorno, los usuarios pueden conectarse, compartir presencia y comunicarse en tiempo real.

Recientemente el proyecto ha evolucionado para albergar distintas experiencias dentro del mismo ecosistema, combinando un **entorno de construcción y recolección interactivo (PxlBuilder)** con un nuevo **entorno formal de visualización de datos en 3D para reuniones profesionales (BabiaXR)**.

## ✨ Características Principales

Actualmente la plataforma está dividida en tres módulos o "mundos" accesibles desde un punto central:

### 1. 🖥️ Terminal Lobby (`index.html`)

- Interfaz principal con una estética de terminal retro.
- Punto de entrada donde los usuarios configuran su nombre de usuario (sincronizado a través de la red) antes de elegir a qué sala conectarse.

### 2. 🔨 PxlBuilder: Mundo de Construcción y Recolección (`scenes/scene.html`)

- **Construcción Voxel 3D:** Un modo de construcción inmersivo donde los usuarios pueden colocar, eliminar y rotar distintos tipos de bloques y "props" (como árboles o rocas).
- **Recolección de Recursos:** Sistema interactivo de nodos de recursos (madera, piedra, metal). Los jugadores pueden golpear estos recursos (con feedback visual de barras de vida), los cuales al agotarse sueltan _drops_ recogibles en el mundo.
- **Inventario Dinámico:** Gestión completa de los materiales y bloques recogidos a través de un HUD en pantalla (estilo _Glassmorphism_).
- **Multijugador:** Todos los bloques construidos, destruidos y la presencia de los usuarios (con su color de avatar e identificador) se sincroniza en tiempo real de forma robusta.

### 3. 📊 Data Room: Visualización de Datos BABIAXR (`scenes/babia.html`)

- **Entorno Profesional:** Una nueva sala diseñada de forma elegante y minimalista pensada para reuniones corporativas, de investigación o docencia.
- **Gráficos 3D Interactivos:** Integración con **BabiaXR** para representar datos a gran escala a través de gráficos de barras 3D (_Barsmap_), gráficos circulares (_Pie charts_) y gráficos simples.
- **Exploración Espacial:** Los usuarios se pueden mover por la sala observando los perfiles de datos desde diferentes ejes y leyendo los paneles informativos.
- **Presets de Datos:** Selector interactivo para cambiar entre diferentes casos de uso corporativos (Ventas, Asistencia a reuniones, KPIs).
- **Sincronía de Avatares:** Al igual que en la sala de construcción, los avatares reflejan los nombres y personalización de los participantes en la reunión mediante un esquema NAF totalmente configurado.

## 🛠️ Tecnologías y Herramientas Utilizadas

- **Frontend 3D/VR:** [A-Frame](https://aframe.io/) y [Three.js](https://threejs.org/).
- **Visualización de Datos:** [BabiaXR](https://babiaxr.gitlab.io/babiaxr/).
- **Redes y Multijugador:** [Networked-Aframe](https://github.com/networked-aframe/networked-aframe), [Socket.io](https://socket.io/) y [EasyRTC](https://github.com/open-easyrtc/open-easyrtc).
- **Backend:** Node.js (Servidor de señalización e instanciación de salas P2P).
- **Diseño de Interfaz:** HTML5, JS y CSS3 Vainilla, empleando técnicas de diseño moderno como _Glassmorphism_ e iconografía reactiva.

## 🚀 Instalación y Uso Local

Sigue estos pasos para arrancar el entorno en tu máquina local:

1. **Clona el repositorio** en tu equipo local.
2. **Instala las dependencias** de Node necesarias ejecutando el comando:

   ```bash
   npm install
   ```

3. **Inicia el servidor** local:

   ```bash
   npm start
   ```

4. **Accede a la aplicación:** Abre un navegador basado en Chromium y dirígete a `http://localhost:8080`.
   _(Nota: Para entrar en WebXR usando gafas como Meta Quest, es obligatorio utilizar un túnel seguro `https` como NGROK o configurar un certificado SSL local)_.

## 🎮 Controles

### Modo Escritorio (Teclado y Ratón)

- **Movimiento:** Teclas `W`, `A`, `S`, `D`.
- **Mirar:** Movimiento del Ratón.
- **Modo PxlBuilder:**
  - **Colocar Bloque:** `Click Derecho`.
  - **Mina / Eliminar Bloque:** `Click Izquierdo`.
  - **Cambiar Item Activo:** `Q` / `E` o la `Rueda del Ratón`.
- **Pausa / Salir del foco:** `ESC`.

### Modo Realidad Virtual (HMD y Mandos VR)

- **Movimiento General:** Joystick Izquierdo _(Fly / Caminar)_.
- **Giro de Cámara (Snap Turn):** Joystick Derecho.
- **Modo PxlBuilder:**
  - **Construir / Interactuar:** Apretar el gatillo del mando derecho.
  - _(El sistema está preparado mediante WebXR Hand Controls y Laser Controls)_.

## 🔮 Roadmap / Futuro

Este es un proyecto vivo y en activo desarrollo. Los próximos pasos se centran en refinar los componentes corporativos y añadir métricas compartidas de los datos proyectados en el entorno BabiaXR, uniendo toda la experiencia bajo una presentación e interfaz impecable.
