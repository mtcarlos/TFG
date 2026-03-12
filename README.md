# README 📝

 Es un espacio de realidad virtual compartido y multijugador desarrollado en la web (WebVR/WebXR). En este entorno, los usuarios pueden conectarse, explorar y construir en tiempo real utilizando un sistema de bloques estilo voxel. El proyecto actúa tanto como un punto de encuentro social, como una herramienta creativa de construcción inmersiva.

## ✨ Características Principales

- **Lobby Interactivo (`index.html`):** Una interfaz principal con una estética de terminal retro donde los usuarios pueden introducir su nombre y preparar su entrada a la experiencia.
- **Experiencia Multijugador en Tiempo Real (`scene.html`):** Interacción fluida con otros avatares conectados en el mismo entorno 3D, todo gracias a la tecnología WebRTC y Networked-Aframe.
- **Construcción Voxel 3D (`builder.html`):** Un modo de construcción estilo *sandbox* inmersivo. Los usuarios pueden colocar, eliminar y rotar diferentes tipos de bloques, gestionando su inventario mediante un Head-Up Display (HUD) dinámico.
- **Soporte de Realidad Virtual (VR):** Total compatibilidad con gafas de realidad virtual (WebXR) y controladores (como Oculus Touch), adaptando los controles, los menús de la mano y el raycasting para la construcción intuitiva.
- **Base de Datos de Lore (`lore.html`):** Una sección narrativa interactiva estilo "Pokédex" desde la cual se explora la historia de los personajes y el mundo de Logic Lobby (Probablemente más adelante se sustituya o se añada una sección que explique de forma detallada como funciona el sistema de crafteo de elementos y las posibilidades que abarca).

## 🛠️ Tecnologías y Herramientas Utilizadas

- **Frontend 3D/VR:** [A-Frame](https://aframe.io/) y [Three.js](https://threejs.org/).
- **Redes y Multijugador:** [Networked-Aframe](https://github.com/networked-aframe/networked-aframe), [Socket.io](https://socket.io/) y [EasyRTC](https://github.com/open-easyrtc/open-easyrtc).
- **Backend:** Node.js (como servidor de señalización para iniciar las conexiones Peer-to-Peer).
- **Interfaz (UI):** HTML5, CSS3 (Vanilla), y JavaScript.

## 🚀 Instalación y Uso Local

Sigue estos pasos para arrancar el entorno en tu máquina local:

1. **Clona el repositorio** en tu equipo local.
2. **Instala las dependencias** de Node necesarias ejecutando el siguiente comando en la terminal:

   ```bash
   npm install
   ```

3. **Inicia el servidor** de señalización y alojamiento:

   ```bash
   npm start
   ```

4. **Accede a la aplicación:** Abre tu navegador web (preferiblemente navegadores basados en Chromium) y dirígete a `http://localhost:8080` (el puerto predeterminado por EasyRTC).

## 🎮 Controles Principales (Modo Escritorio)

- **Movimiento:** Teclas `W`, `A`, `S`, `D`
- **Mirar:** Movimiento del Ratón
- **Modo Construcción (PxlBuilder):**
  - **Colocar Bloque:** `Click Derecho` (o Tecla `M` en algunos modos)
  - **Eliminar Bloque:** `Click Izquierdo` (o Tecla `N`)
  - **Cambiar Bloque (Inventario):** `Q` / `E` o la `Rueda del Ratón`
- **Pausa / Liberar el Ratón:** `ESC`

## Controles Principales (Modo VR)

- **Movimiento:** Joystick izquierdo
- **Mirar:** Joystick derecho
- **Modo Construcción (PxlBuilder):**
  - **Sacar menú de construcción:** Botón `Y` del mando izquierdo
  - **Colocar Bloque:** Apretar el gatillo del mando derecho
  - **Cambiar Bloque (Inventario):** Joystick izquierdo

*Los controles de realidad virtual se detectan y ajustan de manera automática al entrar en modo inmersivo utilizando los joysticks y gatillos de los mandos.*

## 🔮 Futuras Actualizaciones

Este proyecto se encuentra en desarrollo activo. *Este README es un documento vivo y se actualizará más adelante con las futuras implementaciones, mecánicas y secretos del lore que vayamos añadiendo.*
