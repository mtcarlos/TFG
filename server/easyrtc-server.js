// Load required modules
const http = require("http");                 // http server core module
const path = require("path");
const express = require("express");           // web framework external module
const socketIo = require("socket.io");        // web socket external module
const easyrtc = require("open-easyrtc");      // EasyRTC external module
// To generate a certificate for local development with https, you can use
// npx webpack serve --server-type https
// and stop it with ctrl+c, it will generate the file node_modules/.cache/webpack-dev-server/server.pem
// Then to enable https on the node server, uncomment the next lines
// and the webServer line down below.
// const https = require("https");
// const fs = require("fs");
// const privateKey = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const certificate = fs.readFileSync("node_modules/.cache/webpack-dev-server/server.pem", "utf8");
// const credentials = { key: privateKey, cert: certificate };

// Set process name
process.title = "networked-aframe-server";

// Get port or default to 8080
const port = process.env.PORT || 8080;

// Setup and configure Express http server.
const app = express();

// Serve the bundle in-memory in development (needs to be before the express.static)
if (process.env.NODE_ENV === "development") {
  const webpackMiddleware = require("webpack-dev-middleware");
  const webpack = require("webpack");
  const config = require("../webpack.config");

  app.use(
    webpackMiddleware(webpack(config), {
      publicPath: "/dist/"
    })
  );
}

// JSON body parser for API endpoints
app.use(express.json());

// Room & GitHub modules
const rooms = require("./rooms");
const githubClient = require("./githubClient");
const githubDataMapper = require("./githubDataMapper");
const repoAnalyzer = require("./repoAnalyzer");
const cityLayoutGenerator = require("./cityLayoutGenerator");

// Global state to track active users per room for the Presence API
const activeRoomsTracker = {}; // easyrtcid -> { username, roomName }

// API Endpoint for dynamic Lobby Presence
app.get("/api/status", (req, res) => {
  const counts = { "basic-room": { count: 0, users: [] }, "babia-data-room": { count: 0, users: [] } };
  for (const [id, conn] of Object.entries(activeRoomsTracker)) {
    if (!counts[conn.roomName]) counts[conn.roomName] = { count: 0, users: [] };
    counts[conn.roomName].count++;
    if (conn.username) counts[conn.roomName].users.push(conn.username);
  }
  res.json(counts);
});

// ─── Room Management API ─────────────────────────────────────

// POST /api/rooms — Create a new Room
app.post("/api/rooms", (req, res) => {
  const result = rooms.createRoom();
  console.log(`[Rooms] Created room: ${result.roomId}`);
  res.json(result);
});

// GET /api/rooms/:roomId — Get Room info (public, no hostToken)
app.get("/api/rooms/:roomId", (req, res) => {
  const room = rooms.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

// POST /api/rooms/:roomId/repo — Set repo for a Room (host only)
app.post("/api/rooms/:roomId/repo", async (req, res) => {
  const { repo, hostToken } = req.body;
  if (!repo || !hostToken) {
    return res.status(400).json({ error: "Missing repo or hostToken" });
  }

  // Parse and validate the repo identifier
  const parsed = githubClient.parseRepoInput(repo);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid repository format. Use 'owner/repo' or a GitHub URL." });
  }

  // Verify host authorization
  const setResult = rooms.setRepo(req.params.roomId, hostToken, `${parsed.owner}/${parsed.repo}`);
  if (!setResult.success) {
    const status = setResult.error.includes("not found") ? 404 : 403;
    return res.status(status).json({ error: setResult.error });
  }

  // Fetch data from GitHub API
  try {
    const rawData = await githubClient.fetchAllRepoData(parsed.owner, parsed.repo);
    const processedData = githubDataMapper.mapRepoData(rawData);
    const babiaDatasets = githubDataMapper.toBabiaDatasets(processedData);

    // Store both processed data and BabiaXR datasets
    rooms.setRepoData(req.params.roomId, {
      ...processedData,
      babiaDatasets,
    });

    console.log(`[Rooms] Room ${req.params.roomId} → repo set to ${parsed.owner}/${parsed.repo}`);
    res.json({ success: true, repo: `${parsed.owner}/${parsed.repo}` });

    // ── Trigger Code City cloning in background ──
    (async () => {
      try {
        const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
        rooms.setCloneStatus(req.params.roomId, "cloning");
        console.log(`[CodeCity] Auto-cloning ${repoUrl} for room ${req.params.roomId}...`);

        const clonePath = await repoAnalyzer.cloneRepo(repoUrl, req.params.roomId);
        rooms.setClonePath(req.params.roomId, clonePath);
        rooms.setCloneStatus(req.params.roomId, "analyzing");

        const fileTree = repoAnalyzer.analyzeFileTree(clonePath);
        const layout = cityLayoutGenerator.generateCityLayout(fileTree);
        rooms.setCityLayout(req.params.roomId, layout);
        rooms.setCloneStatus(req.params.roomId, "ready");

        console.log(`[CodeCity] Room ${req.params.roomId} → city ready (${layout.stats.totalFiles} files, ${layout.stats.totalLOC} LOC)`);
      } catch (err) {
        console.error(`[CodeCity] Auto-clone error:`, err.message || err);
        rooms.setCloneStatus(req.params.roomId, "error");
      }
    })();

  } catch (err) {
    console.error(`[GitHub API Error]`, err.message || err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Failed to fetch repository data" });
  }
});

// GET /api/rooms/:roomId/repo-data — Get processed repo data
app.get("/api/rooms/:roomId/repo-data", (req, res) => {
  const room = rooms.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.hasRepo) return res.status(404).json({ error: "No repository selected for this room" });

  const data = rooms.getRepoData(req.params.roomId);
  if (!data) return res.status(404).json({ error: "Repository data not available yet" });

  res.json(data);
});

// ─── Individual BabiaXR Dataset Endpoints ───────────────────
// These serve each dataset array directly so babia-queryjson can fetch them.

app.get("/api/rooms/:roomId/dataset/:datasetName", (req, res) => {
  const room = rooms.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.hasRepo) return res.status(404).json({ error: "No repository selected" });

  const data = rooms.getRepoData(req.params.roomId);
  if (!data || !data.babiaDatasets) return res.status(404).json({ error: "Dataset not available yet" });

  const datasetMap = {
    languages: data.babiaDatasets.languagesDataset,
    contributors: data.babiaDatasets.contributorsDataset,
    summary: data.babiaDatasets.summaryDataset,
  };

  const dataset = datasetMap[req.params.datasetName];
  if (!dataset) return res.status(404).json({ error: `Unknown dataset: ${req.params.datasetName}` });

  res.json(dataset);
});

// ─── Code City API ──────────────────────────────────────────

// POST /api/rooms/:roomId/repo-clone — Clone repo & generate Code City layout
app.post("/api/rooms/:roomId/repo-clone", async (req, res) => {
  const { repo, hostToken } = req.body;
  if (!repo || !hostToken) {
    return res.status(400).json({ error: "Missing repo or hostToken" });
  }

  const parsed = githubClient.parseRepoInput(repo);
  if (!parsed) {
    return res.status(400).json({ error: "Invalid repository format." });
  }

  if (!rooms.isHost(req.params.roomId, hostToken)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Respond immediately — cloning happens in background
  rooms.setCloneStatus(req.params.roomId, "cloning");
  res.json({ success: true, status: "cloning" });

  // Background: clone → analyze → generate layout
  try {
    const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
    console.log(`[CodeCity] Cloning ${repoUrl} for room ${req.params.roomId}...`);

    const clonePath = await repoAnalyzer.cloneRepo(repoUrl, req.params.roomId);
    rooms.setClonePath(req.params.roomId, clonePath);
    rooms.setCloneStatus(req.params.roomId, "analyzing");

    console.log(`[CodeCity] Analyzing file tree...`);
    const fileTree = repoAnalyzer.analyzeFileTree(clonePath);

    console.log(`[CodeCity] Generating city layout...`);
    const layout = cityLayoutGenerator.generateCityLayout(fileTree);
    rooms.setCityLayout(req.params.roomId, layout);
    rooms.setCloneStatus(req.params.roomId, "ready");

    console.log(`[CodeCity] Room ${req.params.roomId} → city ready (${layout.stats.totalFiles} files, ${layout.stats.totalLOC} LOC)`);
  } catch (err) {
    console.error(`[CodeCity] Error:`, err.message || err);
    rooms.setCloneStatus(req.params.roomId, "error");
  }
});

// GET /api/rooms/:roomId/city-layout — Get the Code City layout JSON
app.get("/api/rooms/:roomId/city-layout", (req, res) => {
  const room = rooms.getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const status = rooms.getCloneStatus(req.params.roomId);
  if (!status) return res.status(404).json({ error: "No clone initiated" });
  if (status === "cloning" || status === "analyzing") {
    return res.status(202).json({ status });
  }
  if (status === "error") {
    return res.status(500).json({ error: "Clone or analysis failed" });
  }

  const layout = rooms.getCityLayout(req.params.roomId);
  if (!layout) return res.status(404).json({ error: "Layout not available" });

  res.json(layout);
});

// Serve the files from the project root
app.use(express.static(path.resolve(__dirname, "..")));

// Start Express http server
const webServer = http.createServer(app);
// To enable https on the node server, comment the line above and uncomment the line below
// const webServer = https.createServer(credentials, app);

// Start Socket.io so it attaches itself to Express server
const socketServer = socketIo(webServer, { "log level": 1 });
const myIceServers = [
  { "urls": "stun:stun1.l.google.com:19302" },
  { "urls": "stun:stun2.l.google.com:19302" },
  // {
  //   "urls":"turn:[ADDRESS]:[PORT]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // },
  // {
  //   "urls":"turn:[ADDRESS]:[PORT][?transport=tcp]",
  //   "username":"[USERNAME]",
  //   "credential":"[CREDENTIAL]"
  // }
];
easyrtc.setOption("appIceServers", myIceServers);
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("demosEnable", false);

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", (socket, easyrtcid, msg, socketCallback, callback) => {
  easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, (err, connectionObj) => {
    if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
      callback(err, connectionObj);
      return;
    }

    connectionObj.setField("credential", msg.msgData.credential, { "isShared": false });

    console.log("[" + easyrtcid + "] Credential saved!", connectionObj.getFieldValueSync("credential"));

    callback(err, connectionObj);
  });
});

// Intercept Room Join to maintain Presence Tracker
easyrtc.events.on("roomJoin", (connectionObj, roomName, roomParameter, callback) => {
  const cred = connectionObj.getFieldValueSync("credential");
  const username = (cred && cred.username) ? cred.username : "Explorer";
  activeRoomsTracker[connectionObj.getEasyrtcid()] = { roomName, username };
  
  console.log(`[${connectionObj.getEasyrtcid()}] ${username} joined ${roomName}`);
  easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Intercept Room Leave to update Presence Tracker
easyrtc.events.on("roomLeave", (connectionObj, roomName, callback) => {
  delete activeRoomsTracker[connectionObj.getEasyrtcid()];
  console.log(`[${connectionObj.getEasyrtcid()}] left ${roomName}`);
  easyrtc.events.defaultListeners.roomLeave(connectionObj, roomName, callback);
});

// Intercept Disconnect cleans up Presence Tracker
easyrtc.events.on("disconnect", (connectionObj, next) => {
  delete activeRoomsTracker[connectionObj.getEasyrtcid()];
  easyrtc.events.defaultListeners.disconnect(connectionObj, next);
});

// Start EasyRTC server
easyrtc.listen(app, socketServer, null, (err, rtcRef) => {
  console.log("Initiated");

  rtcRef.events.on("roomCreate", (appObj, creatorConnectionObj, roomName, roomOptions, callback) => {
    console.log("roomCreate fired! Trying to create: " + roomName);

    appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
  });
});

// Listen on port
webServer.listen(port, () => {
  console.log("listening on http://localhost:" + port);
});
