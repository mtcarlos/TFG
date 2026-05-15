Quiero implementar una nueva fase funcional en mi proyecto de TFG basado en A-Frame, Networked-Aframe y WebRTC. El proyecto ya tiene una base multiusuario funcionando, por lo que es MUY IMPORTANTE que no rompas ni sustituyas el sistema actual de escenas, conexión multiusuario, avatares, WebRTC/audio o Networked-Aframe. Cualquier cambio debe hacerse de forma incremental, modular y compatible con lo que ya existe.

Contexto general del proyecto:
Estoy desarrollando una plataforma web inmersiva multiusuario en la que varios usuarios pueden entrar en una misma escena 3D usando A-Frame y Networked-Aframe. Ahora quiero orientar el TFG hacia una plataforma colaborativa de análisis de repositorios de GitHub en 3D. La idea es que, antes de entrar en la escena principal, los usuarios pasen por un lobby o antesala donde se pueda crear o unirse a una “Room”. Cada Room estará asociada a un repositorio de GitHub concreto. Una vez dentro, todos los usuarios de esa misma Room entrarán en la misma escena multiusuario y verán las mismas estadísticas del repositorio, que más adelante se representarán como gráficas 3D con BabiaXR.

Objetivo de esta fase:
Implementar el sistema inicial de Rooms y selección de repositorio mediante la API de GitHub, preparando los datos para que después puedan utilizarse en la escena 3D.

Requisitos principales:

1. Sistema de Rooms

- Crear un sistema de salas o Rooms.
- Cada Room debe tener un identificador único, por ejemplo un roomId.
- Los usuarios deben poder:
  - crear una nueva Room;
  - unirse a una Room existente mediante su roomId;
  - entrar a la escena multiusuario correspondiente a esa Room.
- Todos los usuarios que entren con el mismo roomId deben conectarse a la misma instancia/sala de Networked-Aframe, de forma que se vean entre ellos.
- No debe romperse el sistema actual de conexión multiusuario.
- Si actualmente la escena usa un room fijo en Networked-Aframe, modificarlo de forma segura para que el nombre de la sala se obtenga dinámicamente desde la URL o desde el estado de la aplicación.
- Ejemplo de URL deseada:
  - /lobby.html
  - /scene.html?room=abc123
  - /scene.html?room=abc123&repo=owner/repository
- Asegúrate de que el roomId se propaga correctamente a la configuración de Networked-Aframe.

1. Roles dentro de la Room

- La persona que crea la Room debe ser considerada el host o creador de la sala.
- Solo el host debe poder seleccionar o cambiar el repositorio de GitHub asociado a la Room.
- Los usuarios que se unan a una Room existente no deberían poder modificar el repositorio, solo ver cuál ha sido seleccionado.
- Implementar esta lógica de forma sencilla en esta fase. No hace falta autenticación compleja todavía, puede usarse un estado temporal en servidor o una marca de host generada al crear la sala.
- Si el proyecto no tiene backend persistente, se puede mantener el estado de Rooms en memoria en el servidor Node/Express actual.
- El diseño debe permitir que en el futuro se añada persistencia en base de datos.

1. Selección de repositorio de GitHub

- En el lobby, el host debe poder introducir una URL de GitHub o un identificador tipo owner/repo.
- Ejemplos válidos:
  - <https://github.com/networked-aframe/networked-aframe>
  - networked-aframe/networked-aframe
  - facebook/react
- Validar el formato introducido.
- Extraer correctamente owner y repo.
- Guardar el repositorio seleccionado dentro del estado de la Room.
- Mostrar en el lobby el repositorio asociado a la Room.
- Los usuarios no host deben ver el repositorio seleccionado, pero no editarlo.

1. Integración inicial con GitHub API

- Implementar un módulo separado para comunicarse con la GitHub API.
- No mezclar la lógica de GitHub directamente con la escena A-Frame.
- Obtener, como mínimo, estos datos iniciales:
  - nombre del repositorio;
  - owner;
  - descripción;
  - URL;
  - número de estrellas;
  - forks;
  - issues abiertas;
  - lenguaje principal;
  - fecha de creación;
  - fecha de última actualización;
  - lenguajes del repositorio usando el endpoint /languages;
  - contribuidores principales si es posible.
- Manejar errores de la API:
  - repositorio inexistente;
  - límite de rate limit;
  - error de red;
  - formato inválido;
  - repositorio privado o inaccesible.
- Preparar los datos en un formato limpio para poder usarlos luego en BabiaXR.
- Ejemplo de estructura esperada:

{
  "owner": "networked-aframe",
  "repo": "networked-aframe",
  "fullName": "networked-aframe/networked-aframe",
  "description": "...",
  "htmlUrl": "<https://github.com/networked-aframe/networked-aframe>",
  "stars": 1234,
  "forks": 200,
  "openIssues": 15,
  "mainLanguage": "JavaScript",
  "createdAt": "...",
  "updatedAt": "...",
  "languages": [
    { "name": "JavaScript", "bytes": 123456, "percentage": 72.5 },
    { "name": "HTML", "bytes": 30000, "percentage": 17.6 },
    { "name": "CSS", "bytes": 12000, "percentage": 9.9 }
  ],
  "contributors": [
    { "login": "user1", "contributions": 100, "avatarUrl": "..." }
  ]
}

1. Comunicación entre lobby, servidor y escena

- El lobby debe crear o recuperar una Room desde el servidor.
- Cuando el host selecciona un repositorio, el servidor debe asociar ese repositorio a la Room.
- Cuando cualquier usuario entra en la escena, la escena debe poder pedir al servidor los datos del repositorio asociado a su roomId.
- La escena debe recibir esos datos y dejarlos disponibles para los futuros componentes de visualización 3D.
- En esta fase no hace falta implementar todavía todas las gráficas 3D, pero sí dejar preparado el objeto de datos y mostrar al menos un panel básico dentro de la escena con información del repositorio para comprobar que funciona.

1. Preparación para BabiaXR

- Crear una capa de transformación de datos que convierta los datos de GitHub a datasets compatibles con futuras gráficas de BabiaXR.
- Por ejemplo:
  - dataset de lenguajes para gráfico de barras;
  - dataset de contribuidores;
  - dataset resumen de métricas principales.
- No hace falta crear todavía visualizaciones complejas, pero sí dejar los datos preparados y documentados.
- Si ya existe BabiaXR en el proyecto, no romper su configuración.
- Si no existe, no añadir una integración grande todavía salvo que sea necesario. Esta fase debe centrarse en Rooms + GitHub API + datos preparados.

1. Escena A-Frame

- Mantener la escena actual funcionando.
- Añadir de forma no invasiva un panel 3D o HUD básico que muestre:
  - nombre del repositorio;
  - descripción;
  - estrellas;
  - forks;
  - issues abiertas;
  - lenguaje principal.
- Este panel debe cargarse dinámicamente según el repositorio asociado a la Room.
- Si no hay repositorio asociado, mostrar un mensaje claro indicando que el host todavía no ha seleccionado repositorio.
- No eliminar avatares, controles, cámara, audio, ni componentes de Networked-Aframe existentes.

1. Seguridad y configuración

- No hardcodear tokens privados.
- Si se usa token de GitHub, leerlo desde variable de entorno, por ejemplo GITHUB_TOKEN.
- La integración debe funcionar también sin token, usando los endpoints públicos, aunque con menor rate limit.
- No exponer el token en el frontend.
- Las llamadas a GitHub deberían hacerse preferiblemente desde el backend para evitar problemas de CORS, rate limit y exposición de claves.

1. Estructura recomendada
Si encaja con la estructura actual del proyecto, crear módulos similares a estos:

server/
  rooms.js              -> gestión de Rooms en memoria
  githubClient.js       -> cliente para GitHub API
  githubDataMapper.js   -> transformación de datos para escena/BabiaXR

public/
  lobby.html
  lobby.js
  scene.html
  scene.js
  components/
    repo-info-panel.js

Pero adapta la estructura a la arquitectura real del proyecto. No reorganices todo el proyecto si no es necesario.

1. Endpoints sugeridos
Implementar endpoints similares a estos, si el backend actual lo permite:

POST /api/rooms
Crea una Room y devuelve:
{
  "roomId": "abc123",
  "hostToken": "secret-host-token"
}

GET /api/rooms/:roomId
Devuelve información de la Room:
{
  "roomId": "abc123",
  "repo": "owner/repo",
  "hasRepo": true
}

POST /api/rooms/:roomId/repo
Solo para host. Body:
{
  "repo": "owner/repo",
  "hostToken": "secret-host-token"
}

GET /api/rooms/:roomId/repo-data
Devuelve los datos procesados del repositorio asociado a la Room.

1. Cuidado extremo con el sistema multiusuario
Este punto es crítico:

- No reemplaces Networked-Aframe.
- No elimines la configuración de WebRTC/EasyRTC/Socket.IO existente.
- No cambies el flujo de conexión si no es necesario.
- Si necesitas modificar el nombre de la sala, hazlo de manera dinámica usando el roomId.
- Mantén compatibilidad con la escena actual.
- Antes de terminar, comprueba que dos pestañas diferentes pueden entrar en la misma room y verse dentro de la escena.
- Comprueba también que dos rooms distintas aíslan correctamente a los usuarios.

1. Resultado esperado de esta fase
Al terminar, quiero poder hacer lo siguiente:

Flujo 1:

1. Abrir el lobby.
2. Crear una Room.
3. Introducir un repositorio de GitHub.
4. Entrar en la escena.
5. Ver la escena multiusuario funcionando.
6. Ver un panel básico con la información del repositorio.

Flujo 2:

1. Otro usuario abre el lobby.
2. Introduce el roomId existente.
3. Ve el repositorio seleccionado por el host.
4. Entra en la escena.
5. Aparece en la misma sala multiusuario que el host.
6. Ve los mismos datos del repositorio.

Flujo 3:

1. Crear otra Room diferente.
2. Seleccionar otro repositorio.
3. Entrar en escena.
4. Confirmar que los usuarios de esta Room no se mezclan con los de la otra Room.

5. Documentación

- Añade una sección nueva en el README o en un archivo FASES.md explicando esta fase.
- Documenta:
  - cómo crear una Room;
  - cómo unirse a una Room;
  - cómo seleccionar repositorio;
  - qué endpoints se han creado;
  - qué datos se obtienen desde GitHub;
  - cómo se pasa el roomId a Networked-Aframe;
  - cómo probar que el sistema multiusuario sigue funcionando.

1. Estilo de implementación

- Código limpio, modular y comentado solo donde sea necesario.
- Evitar cambios masivos innecesarios.
- Priorizar estabilidad sobre complejidad.
- No implementar todavía LLM ni Text-to-Speech en esta fase.
- Dejar preparado el sistema para que en una fase futura pueda añadirse:
  - agente LLM explicativo;
  - text-to-speech;
  - gráficas 3D con BabiaXR;
  - comparación entre repositorios;
  - persistencia de Rooms;
  - autenticación real de host.

Resumen:
Implementa una primera versión estable del sistema de Rooms + selección de repositorio GitHub + obtención de datos del repositorio + paso de datos a la escena A-Frame, manteniendo intacto el sistema multiusuario con Networked-Aframe/WebRTC. El objetivo principal es que cada Room represente una sala colaborativa asociada a un repositorio concreto y que todos los usuarios de esa Room entren a la misma escena y vean las mismas estadísticas.
