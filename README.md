# VR Code City: Inmersive Code Analysis Environment

VR Code City is a multiplayer, shared virtual reality platform developed for the web (WebVR/WebXR). It transforms software analysis into a spatial experience by visualizing GitHub repositories as interactive 3D cities.

In this environment, users can connect together, share presence in real-time, navigate through their codebase, and interact with an advanced AI Agent (The Oracle) to understand, debug, and refactor code directly from virtual reality.

## Core Features

### 1. Code City Visualization
- **Spatial Repository Mapping:** Repositories are dynamically cloned and parsed in the backend. Directories become districts (city blocks), and files become buildings.
- **Visual Metrics:** The height of a building represents the Lines of Code (LOC) for that file.
- **X-Ray Vision Mode:** A temporal heatmap mode that alters building colors based on the recency of the last commit, allowing teams to instantly spot active development zones or legacy code.
- **Time Machine:** Travel back in time by checking out previous commits and watching the city restructure itself instantly.

### 2. The Oracle (Context-Aware AI Agent)
- **Gaze-Based RAG:** The Oracle is an intelligent floating interface that knows exactly what file you are pointing at in the VR world.
- **Code Explanation & Refactoring:** Ask the Oracle to explain the architecture of the project globally, or point to a specific building to find bugs, explain dependencies, or suggest refactors for that exact file.
- **Powered by OpenRouter:** The AI interactions are securely routed through OpenRouter's API, leveraging cutting-edge LLMs (like Gemma) for rapid, accurate code assistance.

### 3. Multiplayer Collaboration
- **Real-Time Presence:** Powered by WebRTC and Networked-Aframe, users can see each other's avatars (head and hand tracking) seamlessly.
- **Voice Chat & Interaction:** Collaborate with your team as if you were walking through the same physical city, discussing the codebase architecture naturally.

## Architecture and Technologies

- **Frontend (3D/VR):** A-Frame, Three.js, HTML5, Vanilla JavaScript, and CSS3.
- **Networking:** Networked-Aframe, Socket.io, and EasyRTC (P2P signaling for low-latency VR).
- **Backend:** Node.js, Express, and simple-git (for secure repository cloning and tree analysis).
- **AI Integration:** Direct HTTP integration with OpenRouter API for real-time LLM inference.

## Installation and Local Setup

Follow these steps to run the environment locally:

1. **Clone the repository** to your local machine.
2. **Configure your environment variables:** Create a `.env` file in the root directory and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   ```
3. **Install Node dependencies:**
   ```bash
   npm install
   ```
4. **Start the local server:**
   ```bash
   npm start
   ```
5. **Access the application:** Open a Chromium-based browser and navigate to `http://localhost:8080`.
   *(Note: To enter WebXR using headsets like Meta Quest, a secure HTTPS tunnel like NGROK is required, or you must configure a local SSL certificate).*

## Controls

### Desktop Mode (Keyboard and Mouse)
- **Movement:** `W`, `A`, `S`, `D` keys.
- **Look Around:** Mouse movement.
- **Toggle Oracle:** Press `O` on the keyboard.
- **Pause / Unfocus:** `ESC`.

### Virtual Reality Mode (HMD and VR Controllers)
- **Movement:** Left Joystick (Fly / Walk).
- **Camera Turn (Snap Turn):** Right Joystick.
- **Interact:** Use the laser pointer and right trigger to click on buildings or the Oracle interface.
- **Toggle Oracle:** Press `X`/`Y` (Left Controller) or `A`/`B` (Right Controller).

## Future Roadmap

The project is under active development. Future iterations aim to integrate deeper static analysis tools, support for larger monolithic repositories with optimized rendering techniques, and richer collaborative AI features for software development teams.
