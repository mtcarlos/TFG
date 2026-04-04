# Especificación funcional y técnica del nuevo rumbo del TFG

## 1. Resumen ejecutivo

Este documento define el nuevo enfoque del Trabajo de Fin de Grado: una **plataforma multiusuario en realidad virtual basada en comunicación en tiempo real** que incorpora, como nueva línea principal de evolución, un **entorno de visualización de datos en 3D e interactivo en VR**, orientado a reuniones, presentaciones y análisis colaborativo de información.

La base tecnológica y conceptual existente **no se sustituye**, sino que se **preserva**. El núcleo del proyecto sigue siendo la **comunicación en tiempo real en entornos virtuales multiusuario**, construida sobre **A-Frame** y **Networked-Aframe** como framework principal del proyecto, manteniendo el soporte de sincronización de usuarios, presencia compartida y, cuando proceda, audio espacial.

El cambio estratégico consiste en abandonar la línea de expansión centrada en sistemas lúdicos de tipo crafting, y abrir una **nueva rama paralela del producto**: un escenario o mundo específico para **analítica visual inmersiva**, apoyado en **BabiaXR** para la representación de gráficos y datos.

La plataforma pasa así de un tono principalmente fantástico/lúdico a un tono **más formal, profesional y orientado a contextos empresariales, académicos y de colaboración**, sin perder la esencia inmersiva e interactiva de la realidad virtual.

---

## 2. Contexto del cambio

### 2.1 Situación anterior

Hasta ahora, la plataforma estaba evolucionando en torno a:

* Un sistema multiusuario VR en tiempo real.
* Un sistema de construcción por bloques estilo Minecraft.
* Un intento de ampliación mediante recolección y crafting.

Aunque el sistema de construcción alcanzó un nivel funcional aceptable, el sistema de crafting introdujo una complejidad alta en:

* diseño de interacción,
* compatibilidad simultánea desktop/VR,
* coherencia de estados multijugador,
* mantenimiento del código,
* escalabilidad futura.

### 2.2 Motivo del cambio de rumbo

La decisión de redirigir el TFG responde a criterios de viabilidad, coherencia técnica y valor académico/profesional:

* El crafting añade complejidad de gameplay que no refuerza de forma directa el valor principal del proyecto.
* La plataforma tiene más potencial diferencial si se enfoca en un caso de uso claro y serio.
* La visualización de datos inmersiva encaja mejor con el concepto de reuniones, colaboración y comprensión espacial de información.
* BabiaXR ofrece una base más alineada con este nuevo objetivo que un sistema de crafting diseñado ad hoc.

### 2.3 Nueva dirección conceptual

La plataforma se redefine como un **ecosistema multiusuario VR para comunicación y análisis visual colaborativo**, donde varias personas pueden entrar en una misma sala virtual y:

* verse y compartir espacio,
* comunicarse en tiempo real,
* observar visualizaciones de datos en 3D,
* interactuar con gráficos y paneles,
* utilizar el entorno como soporte para reuniones, demos o presentaciones.

---

## 3. Visión del producto

### 3.1 Declaración de visión

Diseñar e implementar una plataforma web inmersiva multiusuario, basada en A-Frame y Networked-Aframe, que permita la comunicación en tiempo real en VR y que incorpore un entorno paralelo especializado en **visualización de datos 3D interactiva con BabiaXR**, orientado a contextos profesionales y colaborativos.

### 3.2 Propuesta de valor

La plataforma debe permitir una experiencia más rica que una videollamada o dashboard tradicional, aportando:

* **presencia compartida**,
* **espacialidad**,
* **comprensión visual más intuitiva**,
* **interacción inmersiva con la información**,
* **potencial demostrativo e innovador**.

### 3.3 Principios rectores

1. **No romper lo existente**.
2. **Construcción paralela y modular**.
3. **Aprovechar el núcleo multiusuario ya desarrollado**.
4. **Separar claramente el mundo lúdico del nuevo mundo profesional**.
5. **Diseñar con prioridad para demo funcional y mantenible**.
6. **Mantener compatibilidad entre desktop y VR siempre que sea posible**.
7. **Priorizar claridad visual, rendimiento y legibilidad de datos**.

---

## 4. Objetivos del TFG

## 4.1 Objetivo general

Desarrollar un nuevo entorno inmersivo multiusuario orientado a la **visualización colaborativa de datos en 3D**, integrado dentro de la arquitectura ya existente del TFG y sustentado sobre el sistema de comunicación en tiempo real en realidad virtual.

## 4.2 Objetivos específicos

* Mantener el núcleo de comunicación multiusuario y presencia en VR.
* Crear un nuevo escenario independiente, por ejemplo `babia.html`, dedicado al análisis de datos.
* Integrar BabiaXR para representar gráficos 3D interactivos.
* Diseñar una arquitectura de ficheros separada para evitar romper la escena existente.
* Adaptar el acceso desde `index.html` para ofrecer entrada a ambos mundos.
* Redefinir el lenguaje visual de la plataforma hacia una estética más profesional.
* Eliminar del nuevo enfoque el lore y los elementos narrativos no necesarios.
* Diseñar interacciones comprensibles tanto en desktop como en VR.
* Preparar el sistema para presentaciones, reuniones o demostraciones empresariales.

---

## 5. Alcance del proyecto

## 5.1 Incluido en alcance

### Núcleo común

* Sistema multiusuario en tiempo real.
* Avatares o representación de usuarios conectados.
* Sincronización de presencia y posición.
* Audio espacial si ya forma parte de la base y es viable mantenerlo.
* Navegación desde una página principal a distintos mundos.

### Nuevo mundo de datos

* Nueva escena independiente (`babia.html` o equivalente).
* Integración de visualizaciones 3D con BabiaXR.
* Dataset de ejemplo o datasets de prueba.
* Interacciones básicas con gráficos.
* UI/UX formal y profesional.
* Ficheros JS/CSS separados de la parte anterior.

### Capa de producto

* Replanteamiento de identidad visual.
* Nuevo flujo de acceso más profesional.
* Posicionamiento del proyecto como herramienta colaborativa.

## 5.2 Fuera de alcance inicial

* Sistema de crafting completo.
* Recolección de materiales.
* Lore fantástico del mundo en la nueva rama profesional.
* Persistencia compleja empresarial con backend analítico real.
* Edición avanzada de dashboards por el usuario final.
* Integraciones con herramientas corporativas externas en una primera fase.
* Control de permisos, roles corporativos avanzados o analítica en producción.

---

## 6. Requisitos de alto nivel

### RH-01

La plataforma debe mantener su capacidad de comunicación multiusuario en tiempo real como núcleo principal.

### RH-02

Debe existir un nuevo entorno paralelo orientado a visualización de datos, separado del mundo anterior.

### RH-03

El acceso a ambos mundos debe gestionarse desde `index.html`.

### RH-04

El nuevo entorno debe utilizar BabiaXR para representar datos en 3D.

### RH-05

El nuevo mundo debe adoptar una estética formal, limpia, profesional y funcional.

### RH-06

La nueva implementación debe minimizar impacto sobre el código existente.

### RH-07

La arquitectura debe facilitar extensión futura y mantenimiento.

---

## 7. Caso de uso principal

### 7.1 Escenario de referencia

Una empresa, equipo o grupo académico entra a un entorno virtual compartido. Cada participante se conecta desde navegador en desktop o mediante visor VR. Una vez dentro, todos aparecen en una misma sala moderna y profesional donde se muestran gráficos tridimensionales interactivos. El presentador puede desplazarse alrededor de las visualizaciones, señalar áreas concretas y comentar tendencias. Los demás usuarios pueden observar la información desde distintos ángulos y participar en la conversación en tiempo real.

### 7.2 Valor del caso de uso

Este escenario convierte la plataforma en una herramienta para:

* reuniones inmersivas,
* presentaciones de KPIs,
* docencia y explicación de datos,
* demostraciones tecnológicas,
* exploración colaborativa de información compleja.

---

## 8. Arquitectura conceptual

## 8.1 Arquitectura general del sistema

La plataforma se organiza en dos capas:

### A. Núcleo compartido

Responsable de:

* conexión multiusuario,
* sincronización de entidades,
* audio/voz si aplica,
* utilidades compartidas,
* flujo de entrada y selección de sala.

### B. Mundos o escenas especializadas

1. **Mundo previo**: experiencia ya existente.
2. **Nuevo mundo BabiaXR**: experiencia de visualización de datos.

Esta separación permite evolucionar ambos entornos sin acoplar sus lógicas de forma innecesaria.

## 8.2 Decisión estratégica de arquitectura

Se recomienda una arquitectura **por escenas desacopladas con recursos específicos**, donde cada mundo tenga:

* su HTML propio,
* su CSS propio,
* su JS propio,
* sus assets específicos,
* y solo comparta con el núcleo los módulos realmente comunes.

## 9. Propuesta de estructura de ficheros

```text
/project-root
│
├── index.html
├── assets/
│   ├── common/
│   ├── worlds/
│   │   ├── build-world/
│   │   └── babia-world/
│   └── ui/
│
├── css/
│   ├── common.css
│   ├── index.css
│   ├── world-build.css
│   └── babia.css
│
├── js/
│   ├── core/
│   │   ├── app-config.js
│   │   ├── network-init.js
│   │   ├── room-manager.js
│   │   ├── avatar-manager.js
│   │   ├── ui-common.js
│   │   └── utils.js
│   │
│   ├── worlds/
│   │   ├── build/
│   │   │   ├── build-scene.js
│   │   │   ├── block-system.js
│   │   │   └── interactions-build.js
│   │   │
│   │   └── babia/
│   │       ├── babia-scene.js
│   │       ├── babia-data-loader.js
│   │       ├── babia-charts.js
│   │       ├── babia-interactions.js
│   │       ├── babia-ui.js
│   │       └── babia-presets.js
│   │
│   └── components/
│       ├── vr-pointer.js
│       ├── desktop-controls.js
│       ├── tooltips.js
│       └── shared-panels.js
│
├── data/
│   ├── demo/
│   │   ├── sales.json
│   │   ├── attendance.json
│   │   ├── project-status.json
│   │   └── comparison.csv
│
├── scenes/
│   ├── build.html
│   └── babia.html
│
└── README.md
```

## 9.1 Criterios de esta estructura

* `index.html` funciona como hub principal.
* `scenes/build.html` mantiene el mundo previo.
* `scenes/babia.html` contiene el nuevo entorno profesional.
* `js/core` centraliza lógica reutilizable.
* `js/worlds/babia` encapsula toda la lógica nueva.
* `css/babia.css` evita mezclas de estilos fantásticos y corporativos.
* `data/demo` facilita demos sin depender de backend externo.

---

## 10. Flujo de navegación del usuario

## 10.1 Flujo principal propuesto

1. El usuario accede a `index.html`.
2. Introduce nombre de usuario y/o código de sala según el flujo actual.
3. Selecciona el mundo al que quiere entrar:

   * Mundo original.
   * Mundo de visualización de datos.
4. El sistema redirige a la escena elegida.
5. Se inicializa la conexión multiusuario.
6. El usuario aparece en el entorno correspondiente.

## 10.2 Recomendación UX para `index.html`

La página principal debe reformularse con un enfoque más profesional y menos narrativo, incluyendo:

* título claro del proyecto,
* breve descripción del propósito,
* acceso a salas,
* selector de experiencia,
* estética moderna y limpia,
* mensajes cortos y funcionales.

### Texto orientativo de acceso

* **Collaborative VR Spaces**
* **Choose your environment**
* **Construction World**
* **Data Visualization World**

---

## 11. Diseño del nuevo mundo `babia.html`

## 11.1 Propósito de la escena

`babia.html` será una escena especializada en visualización inmersiva de datos para reuniones, análisis y presentación colaborativa.

## 11.2 Características principales

* Entorno arquitectónico profesional.
* Disposición amplia y legible.
* Gráficos 3D visibles desde varios ángulos.
* Espacios para moverse alrededor de los datos.
* Paneles de apoyo con contexto textual.
* Interacción simple y clara.

## 11.3 Concepto espacial recomendado

Se recomienda diseñar la escena como una **sala de reuniones inmersiva futurista/minimalista**, con elementos como:

* plataforma central para gráficos principales,
* zonas laterales para paneles secundarios,
* fondo neutro y elegante,
* iluminación suave,
* contraste suficiente para resaltar datos,
* pocos elementos decorativos no funcionales.

## 11.4 Distribución sugerida

### Zona central

* Gráfico principal 3D.
* Espacio de presentación.
* Punto de enfoque visual.

### Zona lateral izquierda

* Leyenda o panel de filtros.
* Información contextual.

### Zona lateral derecha

* Gráficos complementarios.
* Comparativas.

### Zona de bienvenida

* Instrucciones básicas de interacción.
* Identificación del dataset cargado.

---

## 12. Integración con BabiaXR

## 12.1 Rol de BabiaXR en el proyecto

BabiaXR será la tecnología encargada de la representación de datos en 3D dentro del nuevo mundo. Debe utilizarse como el motor principal para construir:

* gráficos de barras 3D,
* comparativas de series,
* distribuciones espaciales,
* paneles de datos interactivos,
* visualizaciones comprensibles en entorno inmersivo.

## 12.2 Objetivos de la integración

* Reducir el esfuerzo de implementación desde cero.
* Aprovechar componentes existentes enfocados en data visualization XR.
* Incrementar el valor demostrativo y académico del TFG.
* Mantener una capa propia de control sobre datasets, disposición y UX.

## 12.3 Criterio de integración

BabiaXR debe integrarse de forma encapsulada en el mundo `babia.html`, evitando contaminar el resto del proyecto. La lógica de datos y gráficos debe quedar abstraída en módulos específicos.

---

## 13. Requisitos funcionales detallados

## 13.1 Requisitos funcionales generales

### RF-01. Selección de mundo

El sistema debe permitir seleccionar desde `index.html` entre el mundo previo y el nuevo mundo de visualización de datos.

### RF-02. Entrada multiusuario

Los usuarios deben poder entrar a una misma sala compartida dentro del mundo `babia.html`.

### RF-03. Presencia compartida

Cada usuario debe poder visualizar a los demás participantes dentro del entorno.

### RF-04. Comunicación en tiempo real

La base de comunicación en tiempo real debe mantenerse como elemento central del sistema.

## 13.2 Requisitos funcionales del mundo BabiaXR

### RF-05. Carga de escena profesional

La escena `babia.html` debe cargar un entorno formal y funcional orientado a reuniones.

### RF-06. Carga de dataset

El sistema debe poder cargar al menos un dataset de demostración para mostrar gráficos en la escena.

### RF-07. Representación gráfica 3D

El sistema debe representar datos mediante gráficos 3D interactivos apoyados en BabiaXR.

### RF-08. Soporte a múltiples visualizaciones

La escena debe poder contener más de una visualización simultánea.

### RF-09. Etiquetas y contexto

Las visualizaciones deben incluir etiquetas, títulos o leyendas suficientes para comprender la información.

### RF-10. Interacción básica con gráficos

El usuario debe poder interactuar con las visualizaciones para obtener información adicional.

### RF-11. Interacción compatible desktop/VR

Las interacciones deben ser accesibles tanto desde escritorio como desde VR, adaptando puntero, raycaster o controles.

### RF-12. Panel informativo

Debe existir un panel que explique el dataset o la visualización activa.

### RF-13. Cambio o selección de vistas

Se recomienda permitir alternar entre distintas visualizaciones o presets de datos.

### RF-14. Feedback visual

Los elementos interactivos deben responder con feedback visual claro al foco o selección.

### RF-15. Mantenimiento del mundo previo

El mundo existente no debe dejar de funcionar por la integración del nuevo módulo.

---

## 14. Requisitos no funcionales

### RNF-01. Modularidad

La implementación debe estar desacoplada por escenas y módulos.

### RNF-02. Escalabilidad

La arquitectura debe permitir añadir nuevas visualizaciones sin reescribir la base del mundo.

### RNF-03. Mantenibilidad

Cada responsabilidad debe estar localizada en ficheros específicos.

### RNF-04. Rendimiento

La escena debe mantener un rendimiento razonable en navegador web y, en la medida de lo posible, en visores VR.

### RNF-05. Legibilidad

La información mostrada debe ser clara y comprensible en 3D.

### RNF-06. Compatibilidad

Debe funcionar al menos en navegadores modernos compatibles con A-Frame/WebXR.

### RNF-07. Robustez

La carga de un dataset erróneo no debería romper toda la escena, sino mostrar un error controlado o un fallback.

### RNF-08. Coherencia visual

El nuevo mundo debe tener una identidad visual consistente, profesional y limpia.

### RNF-09. Reutilización

Todo lo que pueda ser compartido entre mundos debe abstraerse en módulos comunes.

---

## 15. Diseño de interacción

## 15.1 Principio general

La interacción con datos en VR debe ser **simple, directa y legible**, evitando sobrecargar al usuario con mecánicas complejas.

## 15.2 Interacciones mínimas recomendadas

### Desktop

* mirar/mover cámara,
* desplazarse por la sala,
* apuntar con cursor o raycaster,
* hacer clic sobre un elemento gráfico,
* mostrar tooltip o panel contextual.

### VR

* apuntar con controlador o puntero VR,
* resaltar elemento bajo foco,
* seleccionar una barra, nodo o segmento,
* mostrar información contextual flotante,
* cambiar dataset o preset desde paneles interactivos.

## 15.3 Reglas de usabilidad

* Los datos importantes deben verse sin necesidad de precisión extrema.
* Los elementos interactivos deben ser suficientemente grandes.
* El foco debe indicarse con animación sutil, brillo o escala.
* No debe dependerse exclusivamente del color para transmitir significado.
* Debe evitarse saturar la escena con demasiadas visualizaciones al mismo tiempo.

---

## 16. Diseño visual y dirección de arte

## 16.1 Cambio de identidad estética

La nueva dirección del proyecto requiere un cambio claro desde el tono fantástico/narrativo hacia una identidad:

* profesional,
* sobria,
* tecnológica,
* elegante,
* funcional.

## 16.2 Elementos a eliminar o reducir

* Lore del mundo.
* Narrativa fantástica innecesaria.
* Elementos decorativos que distraigan del objetivo analítico.
* Mensajería demasiado lúdica en el nuevo mundo.

## 16.3 Nuevo lenguaje visual propuesto

### Paleta

* fondos oscuros elegantes o claros neutros según pruebas de legibilidad,
* acentos azul eléctrico, cian, violeta suave o verde tecnológico,
* contraste alto para datos y textos.

### Materiales

* cristal semitransparente,
* metal limpio,
* superficies lisas,
* iluminación suave,
* sensación de sala tecnológica premium.

### Tipografía

* moderna,
* limpia,
* fácilmente legible a distancia,
* coherente con producto software/B2B.

### UI

* paneles flotantes minimalistas,
* bordes suaves,
* jerarquía tipográfica clara,
* microanimaciones sutiles.

## 16.4 Objetivo de percepción

La plataforma debe transmitir que no es un videojuego con gráficos, sino una **herramienta inmersiva avanzada de colaboración y visualización**.

---

## 17. Propuesta de componentes del nuevo mundo

## 17.1 Componentes de escena

### `babia-scene.js`

Responsable de:

* inicializar escena,
* registrar componentes propios,
* montar layout espacial,
* coordinar carga general del mundo.

### `babia-data-loader.js`

Responsable de:

* cargar JSON/CSV de ejemplo,
* parsear estructuras,
* validar formato básico,
* servir datos a visualizaciones.

### `babia-charts.js`

Responsable de:

* instanciar gráficos,
* configurar parámetros visuales,
* aplicar presets,
* actualizar la representación.

### `babia-interactions.js`

Responsable de:

* hover,
* click/select,
* tooltips,
* paneles emergentes,
* sincronía de eventos local.

### `babia-ui.js`

Responsable de:

* paneles de instrucciones,
* selector de datasets,
* navegación entre vistas,
* mensajes de estado.

### `babia-presets.js`

Responsable de:

* definir layouts o escenas de ejemplo,
* establecer configuraciones precargadas,
* facilitar demos rápidas.

---

## 18. Modelo de datos recomendado

## 18.1 Principio

Para una primera versión, se recomienda trabajar con datasets simples y muy visuales, con estructura clara.

## 18.2 Formato JSON orientativo

```json
{
  "title": "Quarterly Sales Overview",
  "description": "Comparative sales data by department and quarter.",
  "xLabel": "Department",
  "yLabel": "Sales",
  "zLabel": "Quarter",
  "series": [
    { "department": "Marketing", "quarter": "Q1", "value": 120 },
    { "department": "Marketing", "quarter": "Q2", "value": 150 },
    { "department": "Engineering", "quarter": "Q1", "value": 210 }
  ]
}
```

## 18.3 Datasets de demostración sugeridos

* Ventas por departamento y trimestre.
* Estado de proyectos por equipo.
* Ocupación o asistencia en reuniones/eventos.
* Comparativa de KPIs mensuales.
* Métricas académicas o docentes para demo universitaria.

---

## 19. Escenarios de visualización recomendados

## 19.1 Gráfico de barras 3D

Ideal para demostrar:

* comparativas claras,
* altura como variable principal,
* lectura intuitiva desde varios ángulos.

## 19.2 Gráfico comparativo por categorías

Permite mostrar:

* categorías en eje X,
* series en eje Z,
* valor en eje Y.

## 19.3 Panel de métricas clave

Un panel flotante con:

* KPI principal,
* tendencia,
* notas contextuales,
* color o iconografía de estado.

## 19.4 Visualización combinada

Una escena con:

* gráfico central grande,
* gráfico secundario lateral,
* panel textual explicativo,
* selector de preset.

---

## 20. Estrategia de sincronización multiusuario

## 20.1 Qué debe seguir sincronizado

Como mínimo:

* presencia de usuarios,
* posición y orientación,
* estado de avatares,
* voz/audio si está activo.

## 20.2 Qué puede empezar siendo local

Para controlar complejidad, inicialmente puede plantearse que ciertos elementos sean locales, por ejemplo:

* cambio de tooltip individual,
* resaltado visual al pasar el cursor,
* paneles informativos personales.

## 20.3 Qué podría sincronizarse en fases posteriores

* selección de preset global,
* cambio de dataset compartido,
* puntero del presentador,
* anotaciones comunes,
* foco compartido en un gráfico.

## 20.4 Recomendación de alcance técnico

Para la primera iteración del mundo BabiaXR, se recomienda:

* mantener la sincronización multiusuario del entorno y usuarios,
* limitar las interacciones complejas compartidas,
* priorizar una demo sólida antes que una colaboración analítica completa en tiempo real sobre los gráficos.

---

## 21. Compatibilidad desktop y VR

## 21.1 Objetivo

La experiencia debe poder demostrarse tanto sin visor como con visor, para maximizar accesibilidad y viabilidad de evaluación.

## 21.2 Requisitos de escritorio

* navegación estándar,
* puntero funcional,
* interacción con clic,
* acceso a paneles y selección.

## 21.3 Requisitos VR

* movimiento o teletransporte si procede,
* puntero por controlador o gaze,
* selección clara,
* UI legible en profundidad.

## 21.4 Riesgos a controlar

* textos demasiado pequeños,
* gráficos demasiado densos,
* paneles fuera del campo de visión,
* dependencia de controles complejos.

---

## 22. Riesgos del proyecto y mitigación

## 22.1 Riesgo: integración compleja de BabiaXR

**Mitigación:** aislar la integración en módulos específicos y empezar con un único gráfico funcional.

## 22.2 Riesgo: caída de rendimiento en VR

**Mitigación:** limitar cantidad de geometría, datasets pequeños en demo, optimizar escena y reducir efectos innecesarios.

## 22.3 Riesgo: romper el mundo anterior

**Mitigación:** separar HTML, CSS y JS; compartir solo el núcleo estable.

## 22.4 Riesgo: experiencia confusa para el usuario

**Mitigación:** diseñar una escena limpia, pocos elementos simultáneos y panel de instrucciones corto.

## 22.5 Riesgo: excesiva ambición funcional

**Mitigación:** definir un MVP claro y fases incrementales.

---

## 23. MVP propuesto

## 23.1 Objetivo del MVP

Demostrar que la plataforma puede reutilizar su núcleo multiusuario VR para ofrecer una **sala de datos inmersiva profesional** con gráficos 3D funcionales.

## 23.2 Contenido mínimo del MVP

* `index.html` con acceso a dos mundos.
* `babia.html` funcional.
* Conexión multiusuario operativa en el nuevo mundo.
* Un dataset de demostración.
* Un gráfico 3D principal con BabiaXR.
* Un panel contextual con título y descripción.
* Interacción básica hover/click.
* Estética profesional diferenciada.

## 23.3 Criterio de éxito del MVP

El usuario debe poder entrar a la sala de datos, ver a otros usuarios y comprender una visualización tridimensional de manera clara y convincente.

---

## 24. Fases de implementación recomendadas

## Fase 1. Reestructuración base

* Crear nueva rama conceptual del proyecto.
* Separar escena anterior y nueva escena.
* Adaptar `index.html` con selector de mundos.
* Extraer utilidades comunes si aún no lo están.

## Fase 2. Escena base `babia.html`

* Crear HTML base del nuevo mundo.
* Montar entorno profesional vacío.
* Conectar núcleo multiusuario.
* Verificar entrada simultánea de usuarios.

## Fase 3. Integración inicial BabiaXR

* Añadir un dataset fijo.
* Cargar una visualización sencilla.
* Ajustar tamaño, escala y posición en escena.

## Fase 4. Interacción y UI

* Hover/click.
* Tooltip o panel de detalle.
* Instrucciones mínimas.
* Selector de preset o dataset.

## Fase 5. Refinamiento visual

* Aplicar identidad profesional.
* Mejorar iluminación, paneles y layout.
* Revisar legibilidad y ergonomía VR.

## Fase 6. Validación y demo

* Comprobar compatibilidad desktop/VR.
* Medir estabilidad multiusuario.
* Preparar caso de uso demostrativo para defensa.

---

## 25. Criterios de calidad

La implementación final debe cumplir, como mínimo, los siguientes criterios:

* Separación limpia entre escenas.
* Ausencia de regresiones graves en el mundo anterior.
* Código modular y comprensible.
* Escena profesional y visualmente coherente.
* BabiaXR integrado de forma funcional.
* Multiusuario operativo.
* Interacciones básicas claras.
* Demo defendible desde el punto de vista académico y técnico.

---

## 26. Métricas de validación

## 26.1 Métricas técnicas

* La escena carga sin errores críticos.
* Dos o más usuarios pueden coincidir en la misma sala.
* El gráfico principal aparece correctamente.
* La interacción básica responde sin bloquear la escena.

## 26.2 Métricas UX

* El usuario entiende en pocos segundos qué representa el gráfico.
* El acceso desde `index.html` es claro.
* La diferencia entre mundos está bien comunicada.
* El entorno transmite profesionalidad.

## 26.3 Métricas de proyecto

* El nuevo enfoque se percibe como más coherente con el valor del TFG.
* La solución es más demostrable que el sistema de crafting incompleto.
* El resultado refuerza la originalidad del proyecto.

---

## 27. Recomendaciones de posicionamiento para memoria/defensa

Este cambio de rumbo puede presentarse como una decisión madura de ingeniería, no como un retroceso. El discurso recomendable es:

* se evaluó una línea lúdica avanzada,
* se detectó un coste técnico elevado y un retorno funcional limitado,
* se identificó una aplicación más sólida y alineada con el núcleo del proyecto,
* se reorientó el desarrollo hacia un caso de uso más claro, útil y profesional,
* se mantuvo y reutilizó el valor central ya construido: la comunicación inmersiva multiusuario.

Esto convierte la nueva línea en una **evolución estratégica del producto**, no en un abandono improvisado.

---

## 28. Conclusión

La nueva dirección del TFG mantiene intacto el elemento más valioso de la plataforma: la **comunicación en tiempo real en realidad virtual**. A partir de ese núcleo, se propone una expansión más coherente, viable y profesional mediante un nuevo mundo especializado en **visualización de datos 3D con BabiaXR**.

La decisión de construir esta nueva experiencia en paralelo, mediante una escena independiente como `babia.html`, permite proteger el trabajo previo, ordenar mejor la arquitectura y abrir una línea de proyecto con mayor potencial académico, demostrativo y profesional.

En términos de producto, la plataforma deja de orientarse únicamente a una experiencia interactiva de estilo sandbox y pasa a ofrecer una propuesta más madura: **espacios inmersivos multiusuario para colaboración y comprensión visual de información**.

---

## 29. Resumen ejecutivo de decisiones técnicas

* Se mantiene **A-Frame + Networked-Aframe** como base principal del proyecto.
* Se conserva el núcleo multiusuario y de comunicación en tiempo real.
* Se descarta la expansión por crafting como línea principal.
* Se crea un nuevo mundo independiente: `babia.html`.
* Se integra **BabiaXR** únicamente en este nuevo mundo.
* Se reorganiza el proyecto con separación por escenas, estilos y scripts.
* `index.html` actuará como selector de mundos.
* Se elimina el lore del nuevo enfoque y se adopta una estética profesional.
* El objetivo final pasa a ser una sala inmersiva multiusuario de visualización de datos para reuniones, presentaciones y análisis colaborativo.

---

## 30. Próximo paso recomendado

El siguiente paso de desarrollo debería ser la creación de una **versión base de `babia.html`**, conectada al sistema multiusuario existente, con una escena profesional mínima y un primer gráfico de demostración cargado con BabiaXR. A partir de ahí, conviene iterar sobre interacción, datasets y refinamiento visual sin tocar de forma agresiva el mundo ya existente.
