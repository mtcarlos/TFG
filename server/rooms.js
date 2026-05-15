/**
 * rooms.js — In-memory Room management
 * Each Room has: roomId, hostToken, repo (owner/repo), repoData, createdAt
 * Designed for easy future migration to a persistent store.
 */

const crypto = require("crypto");

// In-memory store
const rooms = new Map();

/**
 * Generate a short random ID (6 alphanumeric chars)
 */
function generateId(length = 6) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

/**
 * Create a new Room.
 * @returns {{ roomId: string, hostToken: string }}
 */
function createRoom() {
  const roomId = generateId(6);
  const hostToken = crypto.randomUUID();

  rooms.set(roomId, {
    roomId,
    hostToken,
    repo: null,       // "owner/repo" string
    repoData: null,    // Processed GitHub data
    createdAt: new Date().toISOString(),
  });

  return { roomId, hostToken };
}

/**
 * Get public info for a Room (excludes hostToken).
 * @param {string} roomId
 * @returns {object|null}
 */
function getRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    roomId: room.roomId,
    repo: room.repo,
    hasRepo: !!room.repo,
    createdAt: room.createdAt,
  };
}

/**
 * Set the repository for a Room (host-only action).
 * @param {string} roomId
 * @param {string} hostToken
 * @param {string} repo — "owner/repo" format
 * @returns {{ success: boolean, error?: string }}
 */
function setRepo(roomId, hostToken, repo) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "Room not found" };
  if (room.hostToken !== hostToken) return { success: false, error: "Unauthorized: invalid host token" };

  room.repo = repo;
  room.repoData = null; // Clear stale data when repo changes
  return { success: true };
}

/**
 * Store processed repository data for a Room.
 * @param {string} roomId
 * @param {object} data — Processed GitHub data
 */
function setRepoData(roomId, data) {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.repoData = data;
  return true;
}

/**
 * Get the processed repo data for a Room.
 * @param {string} roomId
 * @returns {object|null}
 */
function getRepoData(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return room.repoData;
}

/**
 * Check if a token matches the host of a Room.
 */
function isHost(roomId, hostToken) {
  const room = rooms.get(roomId);
  return room && room.hostToken === hostToken;
}

module.exports = {
  createRoom,
  getRoom,
  setRepo,
  setRepoData,
  getRepoData,
  isHost,
};
