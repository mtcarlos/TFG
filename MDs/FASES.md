# Fases del Proyecto — Collaborative VR Spaces

## Fase 1: Sistema de Rooms + GitHub API

### Descripción

Esta fase implementa el sistema inicial de **Rooms** (salas colaborativas) con **selección de repositorio de GitHub** mediante la API de GitHub. Cada Room se asocia a un repositorio concreto cuyas métricas son visibles por todos los usuarios conectados a la misma sala.

### Componentes implementados

#### Backend (`server/`)

| Archivo | Descripción |
|---------|-------------|
| `rooms.js` | Gestión de Rooms en memoria (crear, buscar, asignar repo) |
| `githubClient.js` | Cliente para GitHub REST API v3 (repo info, languages, contributors) |
| `githubDataMapper.js` | Transformación de datos crudos a formato limpio + datasets BabiaXR |

#### Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/rooms` | Crea una nueva Room. Devuelve `{ roomId, hostToken }` |
| `GET` | `/api/rooms/:roomId` | Devuelve info pública de la Room (sin hostToken) |
| `POST` | `/api/rooms/:roomId/repo` | Asigna un repositorio a la Room (solo host). Body: `{ repo, hostToken }` |
| `GET` | `/api/rooms/:roomId/repo-data` | Devuelve los datos procesados del repositorio |

#### Frontend

| Archivo | Descripción |
|---------|-------------|
| `lobby.html` | Lobby para crear/unirse a Rooms y seleccionar repositorio |
| `css/lobby.css` | Estilos del lobby (design system consistente con `index.css`) |
| `scenes/github-scene.html` | Escena A-Frame para GitHub Explorer con panel 3D y HUD HTML |
| `js/github-scene-logic.js` | Lógica de escena: avatares, networking, componente `repo-info-panel` |

---

### Cómo crear una Room

1. Abrir el lobby (`localhost:8080/lobby.html`), accesible desde el mundo "GitHub Explorer" en el selector de mundos.
2. Hacer clic en **"Create Room"**.
3. Se generará un código de sala (ej. `a1b2c3`). Compártelo con otros usuarios.
4. Introducir un repositorio GitHub en formato `owner/repo` o URL completa.
5. Hacer clic en **"Confirm"** para cargar los datos del repositorio.
6. Hacer clic en **"Enter Scene"** para entrar en la escena 3D.

### Cómo unirse a una Room

1. Abrir el lobby.
2. En la sección "Join a Room", introducir el código de sala compartido por el host.
3. Hacer clic en **"Join"**.
4. Si el host ya ha seleccionado un repositorio, aparecerá automáticamente.
5. Hacer clic en **"Enter Scene"** para entrar en la misma escena multiusuario.

### Cómo seleccionar un repositorio

Solo el **host** (creador de la Room) puede seleccionar o cambiar el repositorio.

Formatos válidos:
- `facebook/react`
- `networked-aframe/networked-aframe`
- `https://github.com/facebook/react`

El servidor valida el formato, consulta la API de GitHub y almacena los datos procesados.

### Datos obtenidos desde GitHub

Para cada repositorio se obtienen:
- **Información general**: nombre, owner, descripción, URL, estrellas, forks, issues abiertas, lenguaje principal, fechas de creación/actualización, licencia, rama por defecto.
- **Lenguajes**: distribución porcentual por bytes de código.
- **Contribuidores**: top 10 con login, número de contribuciones y avatar.

### Cómo se pasa el roomId a Networked-Aframe

El `roomId` se incluye en la URL de la escena como query parameter:

```
scenes/github-scene.html?room=abc123&username=Carlos
```

La escena lee el parámetro `room` y configura `networked-scene` con:

```js
scene.setAttribute('networked-scene', {
    room: `github-${roomId}`,  // Prefijo "github-" para aislar de otras escenas
    adapter: 'easyrtc',
    audio: true,
    serverURL: '/',
});
```

Esto garantiza que usuarios con el mismo `roomId` están en la misma sala de Networked-Aframe, y que diferentes Rooms están completamente aisladas.

### Cómo probar que el sistema multiusuario sigue funcionando

1. **PxlBuilder y Data Room**: Abrir `localhost:8080`, seleccionar PxlBuilder o Data Room, y verificar que siguen funcionando con normalidad. Estos mundos no han sido modificados.

2. **GitHub Explorer (misma Room)**:
   - Pestaña 1: Crear Room → Seleccionar repo → Entrar en escena.
   - Pestaña 2: Unirse a la misma Room → Entrar en escena.
   - Verificar que ambos usuarios se ven entre sí (avatares).
   - Verificar que ambos ven las mismas métricas del repositorio.

3. **GitHub Explorer (Rooms diferentes)**:
   - Pestaña 1: Crear Room A → Seleccionar repo X → Entrar.
   - Pestaña 2: Crear Room B → Seleccionar repo Y → Entrar.
   - Verificar que los usuarios de Room A **no** ven a los de Room B.
   - Verificar que cada Room muestra los datos de **su** repositorio.

---

### Estructura de archivos creados/modificados

```
server/
  rooms.js              → [NUEVO] Gestión de Rooms en memoria
  githubClient.js       → [NUEVO] Cliente GitHub API
  githubDataMapper.js   → [NUEVO] Transformación de datos
  easyrtc-server.js     → [MODIFICADO] +4 endpoints REST, +express.json()

lobby.html              → [NUEVO] Lobby de Rooms
css/lobby.css           → [NUEVO] Estilos del lobby

scenes/github-scene.html → [NUEVO] Escena A-Frame GitHub Explorer
js/github-scene-logic.js → [NUEVO] Lógica de escena

index.html               → [MODIFICADO] Tercer mundo "GitHub Explorer"
data/github/.gitkeep      → [NUEVO] Directorio para datasets BabiaXR

FASES.md                  → [NUEVO] Esta documentación
```

### Preparación para fases futuras

El sistema está diseñado para que en futuras fases se puedan añadir:

- **Gráficas 3D con BabiaXR**: Los datos ya se transforman a datasets compatibles (`languagesDataset`, `contributorsDataset`, `summaryDataset`).
- **Agente LLM explicativo**: Los datos procesados están centralizados y accesibles vía API.
- **Text-to-Speech**: La estructura modular permite añadir narración sobre los datos.
- **Comparación entre repositorios**: El sistema de Rooms permite asociar múltiples repos.
- **Persistencia de Rooms**: El módulo `rooms.js` tiene una interfaz limpia que se puede reemplazar por una base de datos.
- **Autenticación real de host**: El `hostToken` actual se puede sustituir por JWT/sesiones reales.
