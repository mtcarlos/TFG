/**
 * repoAnalyzer.js
 *
 * Handles cloning a GitHub repository into a temporary directory
 * and analyzing its file-tree structure (lines of code, extensions, etc.).
 *
 * @module repoAnalyzer
 */

const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

// ── Directories / files to skip while walking the tree ──────────────────────
const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '__pycache__',
  'vendor',
  '.venv',
  'target',
]);

// ── Binary extensions we never want to count as "code" ──────────────────────
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4',
  '.zip', '.tar', '.gz',
  '.pdf',
  '.exe', '.dll', '.so', '.dylib',
]);

/**
 * Build the absolute path to the temporary clone directory for a given room.
 *
 * @param {string} roomId - Unique room identifier.
 * @returns {string} Absolute path  →  <project_root>/tmp/<roomId>
 */
function getTmpDir(roomId) {
  return path.resolve(__dirname, '..', 'tmp', roomId);
}

/**
 * Clone a GitHub repository (shallow, depth 1) into `./tmp/<roomId>/`.
 *
 * If the target directory already exists it is removed first so that
 * successive clones for the same room always start fresh.
 *
 * @param {string} repoUrl - HTTPS URL of the repository to clone.
 * @param {string} roomId  - Unique room identifier used as sub-folder name.
 * @returns {Promise<string>} The absolute path to the cloned repository.
 * @throws Will throw an error if the clone operation fails.
 */
async function cloneRepo(repoUrl, roomId) {
  const targetDir = getTmpDir(roomId);

  try {
    // Remove previous clone if it exists
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Ensure the parent tmp/ folder exists
    fs.mkdirSync(targetDir, { recursive: true });

    // Shallow clone for speed
    const git = simpleGit();
    await git.clone(repoUrl, targetDir, ['--depth', '1']);

    console.log(`[repoAnalyzer] Cloned ${repoUrl} → ${targetDir}`);
    return targetDir;
  } catch (err) {
    console.error(`[repoAnalyzer] Error cloning repo: ${err.message}`);
    throw err;
  }
}

/**
 * Count the number of non-empty lines in a file.
 *
 * @param {string} filePath - Absolute path to the file.
 * @returns {number} Lines of code (non-empty lines).
 */
function countLinesOfCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.filter((line) => line.trim().length > 0).length;
  } catch {
    // Unreadable file – treat as 0 lines
    return 0;
  }
}

/**
 * Recursively walk a directory and build a hierarchical tree of its contents.
 *
 * Directories and files listed in {@link IGNORED_DIRS} or starting with a dot
 * are skipped.  Binary files (matched by {@link BINARY_EXTENSIONS}) are also
 * excluded.
 *
 * @param {string} dirPath      - Absolute path to the directory to walk.
 * @param {string} [relativeTo] - Base path used to compute `fullPath` values
 *                                 (defaults to `dirPath` on the first call).
 * @returns {Object[]} Array of tree nodes – each node is either a directory
 *   (`{ name, type: 'directory', children }`) or a file
 *   (`{ name, type: 'file', loc, extension, fullPath }`).
 */
function walkDirectory(dirPath, relativeTo) {
  // On the first (top-level) call, relativeTo is the repo root itself
  if (!relativeTo) {
    relativeTo = dirPath;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    const entryName = entry.name;

    // Skip hidden entries (names starting with '.')
    if (entryName.startsWith('.')) continue;

    const fullAbsPath = path.join(dirPath, entryName);

    if (entry.isDirectory()) {
      // Skip ignored directories
      if (IGNORED_DIRS.has(entryName)) continue;

      const subChildren = walkDirectory(fullAbsPath, relativeTo);
      children.push({
        name: entryName,
        type: 'directory',
        children: subChildren,
      });
    } else if (entry.isFile()) {
      const ext = path.extname(entryName).toLowerCase();

      // Skip binary files
      if (BINARY_EXTENSIONS.has(ext)) continue;

      const relativePath = path.relative(relativeTo, fullAbsPath)
        .split(path.sep)
        .join('/'); // normalise to forward slashes

      children.push({
        name: entryName,
        type: 'file',
        loc: countLinesOfCode(fullAbsPath),
        extension: ext || '',
        fullPath: relativePath,
      });
    }
  }

  return children;
}

/**
 * Analyze the file tree of a cloned repository.
 *
 * Returns a hierarchical JSON structure with a virtual `root` node at the top
 * level, mirroring the directory layout while ignoring non-source artefacts.
 *
 * @param {string} repoPath - Absolute path to the repository root.
 * @returns {Object} Tree object:
 *   `{ name: 'root', type: 'directory', children: [...] }`
 * @throws Will throw if the directory cannot be read.
 */
function analyzeFileTree(repoPath) {
  try {
    const children = walkDirectory(repoPath);

    return {
      name: 'root',
      type: 'directory',
      children,
    };
  } catch (err) {
    console.error(`[repoAnalyzer] Error analyzing file tree: ${err.message}`);
    throw err;
  }
}

/**
 * Remove the temporary clone directory for a given room.
 *
 * @param {string} roomId - Unique room identifier whose temp folder to delete.
 */
function cleanupRepo(roomId) {
  const targetDir = getTmpDir(roomId);

  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`[repoAnalyzer] Cleaned up ${targetDir}`);
    }
  } catch (err) {
    console.error(`[repoAnalyzer] Error cleaning up repo: ${err.message}`);
    throw err;
  }
}

module.exports = { cloneRepo, analyzeFileTree, cleanupRepo };
