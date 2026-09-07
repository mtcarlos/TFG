# Technical Specification & Agent Prompt: Decoupled Entry Flow & Standalone Offline Scene Ingestion for VR Code City

## 1. Project Context & Objectives

Currently, **VR Code City** requires every user to go through an entry flow in `lobby.html` and `scenenew.html` that strictly expects:

1. A live Node.js/Socket.io + EasyRTC signaling server running (typically on port `8080`).
2. An active backend microservice running (Node.js/Python FastAPI) to clone and parse GitHub repositories on demand.
3. Networked-Aframe (`networked-scene`) active on `<a-scene>`, which attempts an immediate WebRTC/WebSocket handshake.

### The Problem

- When testing standalone VR ergonomic improvements, grid alignment, or UI dashboards, having to run multiple backend servers is cumbersome.
- Deploying a live static demo on **GitLab Pages** or **GitHub Pages** is currently impossible because there is no persistent backend server active to manage rooms, socket connections, or live Git cloning.

### The Objective

Refactor and decouple the entry flow into an interactive **2-Step Setup Wizard** that allows:

1. **Offline Mode (Single-Player / Dev Mode):** Completely disables Networked-Aframe (NAF) and signaling so the 3D scene runs cleanly in any static environment without console errors or connection timeouts.
2. **Pre-packaged / Local JSON Ingestion:** Allows loading pre-generated repository metric JSON files (from `/data/demos/` or direct user file upload via `<input type="file">` / Drag-and-Drop) directly in the browser.
3. **Preserved Online / Live Git Mode:** Retains 100% backward compatibility for multi-user collaboration and live repository URL cloning when backend services are running.

---

## 2. Interaction Flow & State Machine

Before mounting the 3D scene or establishing network connections, the user must be presented with a modular modal or entry step.

```
                  ┌───────────────────────────────┐
                  │    Step 1: Network Mode       │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [ Offline / Dev Mode ]          [ Online / Multiplayer ]
       (Disable NAF / WebRTC)          (Require Signaling Server)
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                  ┌───────────────────────────────┐
                  │   Step 2: Scene Data Source   │
                  └──────────────┬────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
[ Preloaded Demo ]     [ Custom JSON Upload ]    [ Live GitHub URL ]
(Fetch from static)    (FileReader from disk)    (Call Backend API)
```

### Step 1: Mode Selection

* **Option 1A: Multiplayer (Online)**
  - Requires signaling backend (Socket.IO / Open-EasyRTC).
  - Prompts for Room ID and user avatar/nickname.
  - Injects `networked-scene` attributes into `<a-scene>`.
- **Option 1B: Solo / Dev (Offline)**
  - Zero server dependencies.
  - Completely omits/strips `networked-scene`.
  - Spawns a dedicated standalone player rig (WASD/camera/VR controllers) with no networking overhead.

### Step 2: Scene Ingestion Source

* **Option 2A: Preloaded Demo (Static JSON)**
  - Dropdown selector listing bundled datasets (e.g., `data/demos/opencode.json`, `data/demos/threejs.json`, etc.).
  - Fetched directly via `fetch()` without backend intervention.
- **Option 2B: Local JSON File Upload (Custom Dataset)**
  - File picker input (`.json`) with drag-and-drop support.
  - Parsed client-side via `FileReader.readAsText()` and loaded into scene builder memory.
- **Option 2C: Live GitHub Repository URL**
  - Retains the existing input field (`https://github.com/owner/repo`).
  - Triggers the backend ingestion pipeline (Node.js/FastAPI cloning and metric parsing).

---

## 3. Technical Requirements & Implementation Details

### 3.1. Conditional Networked-Aframe (NAF) Initialization

In `scenenew.html` (or your primary scene file), `<a-scene>` must not initialize `networked-scene` statically if offline mode is selected:

```javascript
// Example conditional bootstrapper
const urlParams = new URLSearchParams(window.location.search);
const launchMode = urlParams.get('mode') || sessionStorage.getItem('vrcity_mode') || 'offline';

const sceneEl = document.querySelector('a-scene');

if (launchMode === 'online') {
  const roomId = urlParams.get('room') || sessionStorage.getItem('vrcity_room') || 'default-room';
  sceneEl.setAttribute('networked-scene', {
    serverURL: '/',
    app: 'vr-code-city',
    room: roomId,
    connectOnLoad: true,
    adapter: 'easyrtc',
    audio: true
  });
  console.log(`[VR Code City] Initializing ONLINE mode in room: ${roomId}`);
} else {
  console.log('[VR Code City] Initializing OFFLINE mode. NAF disabled.');
  // Ensure the local player camera rig functions without networked templates
}
```

### 3.2. Unified Data Ingestion Service (`SceneDataLoader.js`)

Create a modular data loader utility to handle all data sources uniformly:

```javascript
export class SceneDataLoader {
  /**
   * Load scene from a static JSON file bundled with the repository
   */
  static async loadFromStaticDemo(demoPath) {
    const response = await fetch(demoPath);
    if (!response.ok) throw new Error(`Failed to load demo file: ${demoPath}`);
    return await response.json();
  }

  /**
   * Load scene from a local file selected by user
   */
  static async loadFromFileBlob(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Invalid JSON file format.'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading local file.'));
      reader.readAsText(file);
    });
  }

  /**
   * Load scene from legacy backend pipeline
   */
  static async loadFromBackend(repoUrl) {
    const response = await fetch(`/api/repo/clone?url=${encodeURIComponent(repoUrl)}`);
    if (!response.ok) throw new Error('Backend failed to analyze repository.');
    return await response.json();
  }
}
```

### 3.3. Deep Linking & Query Parameter Routing

Support URL parameters so that static demos can be directly linked on GitLab Pages, portfolios, or thesis documentation:
- **Offline Demo Link:**
  `https://<username>.gitlab.io/TFG/?mode=offline&source=demo&file=opencode.json`
- **Local Test Link:**
  `http://localhost:8080/scenenew.html?mode=offline&source=demo&file=data/demos/test.json`
- **Multiplayer Room Link:**
  `http://localhost:8080/scenenew.html?mode=online&room=thesis-eval&source=url&repo=mtcarlos/TFG`

If no query parameters are present, the interactive setup modal displays automatically.

### 3.4. Graceful Degradation for "The Oracle" AI Agent

When running in **Offline Mode with JSON data**:
- The Oracle interface (`O` key or VR controller toggle) must not trigger unhandled HTTP 500/404 fetch exceptions against `/api/oracle`.
- Render an informative state notice inside the Oracle UI:
  > *"The Oracle is running in Static/Offline Mode. File geometry and line metrics are available for inspection. Real-time AI code refactoring requires an active backend server or custom OpenRouter API Key."*
- (Optional) Provide a simple client-side settings input allowing the user to paste their own OpenRouter API key into `localStorage` to enable direct browser-to-OpenRouter inference if desired.

---

## 4. Deliverables Checklist

1. **Updated Launch Interface (`lobby.html` / Setup Modal):**
   - Clean UI implementing the 2-step choice (Online vs. Offline $\rightarrow$ Preloaded JSON / File Upload / Git URL).
2. **Conditional NAF & Rig Handler:**
   - Safe setup script that mounts either a standalone local rig or a networked player entity based on selected mode.
3. **Data Ingestion Module (`SceneDataLoader.js`):**
   - Unified interface returning standard city tree/metric payloads to `builder.html` or `scripts/city-builder.js`.
4. **Static Demo Directory (`/data/demos/`):**
   - Add at least one or two representative sample JSON files (e.g., `opencode.json`) to the static assets.
5. **Static Server Test Verification:**
   - Verify that running `npx serve .` or `python -m http.server` without any Node/FastAPI services running opens the city, allows full WASD and VR navigation, and handles building inspection cleanly.

---

Please provide the necessary code updates, HTML structure modifications, and integration instructions for `VR Code City`.
