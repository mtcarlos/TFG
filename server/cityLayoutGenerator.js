/**
 * cityLayoutGenerator.js — Squarified Treemap City Layout
 * Transforms a hierarchical file tree (from repoAnalyzer.js) into a flat
 * array of 3D 'building' and 'district' objects positioned via a squarified
 * treemap algorithm, ready for A-Frame rendering.
 */

const path = require("path");

// ---------------------------------------------------------------------------
// Color palette — maps file extensions to hex colors
// ---------------------------------------------------------------------------

const EXT_COLORS = {
  ".js": "#f1e05a",
  ".ts": "#3178c6",
  ".jsx": "#f1e05a",
  ".tsx": "#3178c6",
  ".py": "#3572A5",
  ".java": "#b07219",
  ".cs": "#178600",
  ".cpp": "#f34b7d",
  ".c": "#555555",
  ".go": "#00ADD8",
  ".rs": "#dea584",
  ".rb": "#701516",
  ".php": "#4F5D95",
  ".swift": "#F05138",
  ".kt": "#A97BFF",
  ".html": "#e34c26",
  ".css": "#563d7c",
  ".scss": "#c6538c",
  ".json": "#94a3b8",
  ".md": "#083fa1",
  ".yaml": "#cb171e",
  ".yml": "#cb171e",
  ".sh": "#89e051",
  ".sql": "#e38c00",
};

const DEFAULT_COLOR = "#64748b";

/** District ground-plane color (semi-transparent dark grey) */
const DISTRICT_COLOR = "rgba(30, 30, 46, 0.35)";

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

/** @type {CityLayoutOptions} */
const DEFAULT_OPTIONS = {
  maxHeight: 15,
  minHeight: 0.3,
  padding: 0.3,
  totalSize: 40,
};

// ---------------------------------------------------------------------------
// Type definitions (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} CityLayoutOptions
 * @property {number} maxHeight  — Maximum building height in A-Frame units
 * @property {number} minHeight  — Minimum building height
 * @property {number} padding    — Gap between buildings / districts
 * @property {number} totalSize  — Total width & depth of the city area
 */

/**
 * A file node inside the hierarchical tree produced by repoAnalyzer.
 * @typedef {object} FileNode
 * @property {string}     name       — File or directory name
 * @property {string}     path       — Relative path from repo root
 * @property {'file'|'directory'} type
 * @property {number}     [loc]      — Lines of code (files only)
 * @property {string}     [extension] — e.g. ".js"
 * @property {FileNode[]} [children] — Sub-entries (directories only)
 */

/**
 * @typedef {object} Building
 * @property {'building'}  type
 * @property {string}      fileName
 * @property {string}      filePath
 * @property {string}      directory
 * @property {string}      extension
 * @property {number}      loc
 * @property {number}      x
 * @property {number}      y
 * @property {number}      z
 * @property {number}      width
 * @property {number}      depth
 * @property {number}      height
 * @property {string}      color
 */

/**
 * @typedef {object} District
 * @property {'district'}  type
 * @property {string}      name
 * @property {number}      x
 * @property {number}      z
 * @property {number}      width
 * @property {number}      depth
 * @property {string}      color
 */

/**
 * @typedef {object} CityLayoutResult
 * @property {Building[]} buildings
 * @property {District[]} districts
 * @property {{ totalFiles: number, totalLOC: number, totalDirs: number }} stats
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively compute the total LOC of a tree node.
 * Directories aggregate the LOC of all descendants.
 * @param {FileNode} node
 * @returns {number}
 */
function computeLOC(node) {
  if (node.type === "file") {
    return node.loc || 0;
  }
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce((sum, child) => sum + computeLOC(child), 0);
}

/**
 * Flatten the tree and count files, directories, and total LOC.
 * @param {FileNode} root
 * @returns {{ totalFiles: number, totalLOC: number, totalDirs: number }}
 */
function computeStats(root) {
  let totalFiles = 0;
  let totalLOC = 0;
  let totalDirs = 0;

  function walk(node) {
    if (node.type === "file") {
      totalFiles++;
      totalLOC += node.loc || 0;
    } else {
      totalDirs++;
      if (node.children) node.children.forEach(walk);
    }
  }

  // The root itself is a directory; count its children but not the root
  if (root.children) {
    root.children.forEach(walk);
  }
  // Count root as a dir only if it has children
  if (root.type === "directory") totalDirs++;

  return { totalFiles, totalLOC, totalDirs };
}

/**
 * Return the color for a given file extension.
 * @param {string} ext
 * @returns {string}
 */
function colorForExtension(ext) {
  return EXT_COLORS[ext] || DEFAULT_COLOR;
}

/**
 * Map a LOC value to a building height within [minHeight, maxHeight].
 * Uses a square-root scale so very large files don't dominate visually.
 * @param {number} loc
 * @param {number} maxLOC
 * @param {number} minHeight
 * @param {number} maxHeight
 * @returns {number}
 */
function locToHeight(loc, maxLOC, minHeight, maxHeight) {
  if (maxLOC <= 0) return minHeight;
  const normalized = Math.sqrt(loc) / Math.sqrt(maxLOC); // sqrt scale
  return minHeight + normalized * (maxHeight - minHeight);
}

// ---------------------------------------------------------------------------
// Squarified Treemap Algorithm
// ---------------------------------------------------------------------------

/**
 * Rectangle representing a layout area.
 * @typedef {object} Rect
 * @property {number} x
 * @property {number} z
 * @property {number} w
 * @property {number} h
 */

/**
 * Return the shorter side of a rectangle.
 * @param {Rect} rect
 * @returns {number}
 */
function shortSide(rect) {
  return Math.min(rect.w, rect.h);
}

/**
 * Compute the worst (highest) aspect ratio of a row of areas laid out
 * along the shorter side of the rectangle.
 *
 * In the squarified algorithm, "worst" means the maximum aspect ratio
 * among the rectangles produced if we lay out `row` along `sideLength`.
 *
 * @param {number[]} row    — Array of area values currently in the row
 * @param {number} sideLen  — Length of the side we are filling along
 * @returns {number}         — Worst aspect ratio (≥ 1)
 */
function worstRatio(row, sideLen) {
  if (row.length === 0 || sideLen <= 0) return Infinity;

  const rowSum = row.reduce((a, b) => a + b, 0);
  const rowMax = Math.max(...row);
  const rowMin = Math.min(...row);

  // Aspect ratio formula from Bruls, Huizing & van Wijk (2000)
  const s2 = sideLen * sideLen;
  const worst = Math.max(
    (s2 * rowMax) / (rowSum * rowSum),
    (rowSum * rowSum) / (s2 * rowMin),
  );

  return worst;
}

/**
 * Lay out a single row of items along the shorter side of `rect`.
 * Returns the remaining (unused) rectangle.
 *
 * @param {Rect}     rect      — Available area
 * @param {number[]} rowAreas  — Area values that will fill one strip
 * @returns {Rect}              — Remaining rectangle after the strip is placed
 */
function layoutRow(rect, rowAreas) {
  const s = shortSide(rect);
  const rowSum = rowAreas.reduce((a, b) => a + b, 0);

  // Strip thickness along the longer side
  const stripThickness = s > 0 ? rowSum / s : 0;

  if (rect.w <= rect.h) {
    // Lay strip horizontally across the top
    // Remaining rect is below the strip
    return {
      x: rect.x,
      z: rect.z + stripThickness,
      w: rect.w,
      h: rect.h - stripThickness,
    };
  }

  // Lay strip vertically along the left
  // Remaining rect is to the right
  return {
    x: rect.x + stripThickness,
    z: rect.z,
    w: rect.w - stripThickness,
    h: rect.h,
  };
}

/**
 * Compute the actual pixel coordinates for each item in a row laid out
 * along the shorter side of `rect`.
 *
 * @param {Rect}     rect
 * @param {number[]} rowAreas
 * @returns {Rect[]}           — One positioned rect per item in the row
 */
function positionsForRow(rect, rowAreas) {
  const s = shortSide(rect);
  const rowSum = rowAreas.reduce((a, b) => a + b, 0);
  const stripThickness = s > 0 ? rowSum / s : 0;

  const rects = [];
  let offset = 0;

  for (const area of rowAreas) {
    const itemLen = s > 0 ? area / stripThickness : 0;

    if (rect.w <= rect.h) {
      // Horizontal strip across the top
      rects.push({
        x: rect.x + offset,
        z: rect.z,
        w: itemLen,
        h: stripThickness,
      });
    } else {
      // Vertical strip along the left
      rects.push({
        x: rect.x,
        z: rect.z + offset,
        w: stripThickness,
        h: itemLen,
      });
    }

    offset += itemLen;
  }

  return rects;
}

/**
 * Squarified treemap: lay out `items` within `rect`.
 * Each item must have an `.area` property (normalised to fill `rect`).
 *
 * Returns an array of positioned items with `.rect` added.
 *
 * @param {{ area: number, node: FileNode }[]} items
 * @param {Rect} rect
 * @returns {{ node: FileNode, rect: Rect }[]}
 */
function squarify(items, rect) {
  // Filter out zero-area items and sort descending by area
  const sorted = items
    .filter((it) => it.area > 0)
    .sort((a, b) => b.area - a.area);

  if (sorted.length === 0) return [];

  /** @type {{ node: FileNode, rect: Rect }[]} */
  const result = [];

  let remaining = { ...rect };
  let currentRow = [];
  let currentNodes = [];
  let idx = 0;

  while (idx < sorted.length) {
    const side = shortSide(remaining);

    // If the remaining area is essentially zero, bail out
    if (remaining.w <= 0.001 || remaining.h <= 0.001) break;

    const candidate = sorted[idx].area;
    const extended = [...currentRow, candidate];

    if (
      currentRow.length === 0 ||
      worstRatio(extended, side) <= worstRatio(currentRow, side)
    ) {
      // Adding this item improves (or maintains) the aspect ratio — accept it
      currentRow.push(candidate);
      currentNodes.push(sorted[idx]);
      idx++;
    } else {
      // Finalize the current row — lay it out and get remaining rect
      const positions = positionsForRow(remaining, currentRow);
      for (let i = 0; i < currentNodes.length; i++) {
        result.push({ node: currentNodes[i].node, rect: positions[i] });
      }
      remaining = layoutRow(remaining, currentRow);
      currentRow = [];
      currentNodes = [];
    }
  }

  // Flush last row
  if (currentRow.length > 0) {
    const positions = positionsForRow(remaining, currentRow);
    for (let i = 0; i < currentNodes.length; i++) {
      result.push({ node: currentNodes[i].node, rect: positions[i] });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a city layout from a hierarchical file tree.
 *
 * @param {FileNode}          fileTree — Root node of the repo file tree
 * @param {CityLayoutOptions} [opts]   — Layout options (all optional)
 * @returns {CityLayoutResult}
 */
function generateCityLayout(fileTree, opts) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const { maxHeight, minHeight, padding, totalSize } = options;

  /** @type {Building[]} */
  const buildings = [];
  /** @type {District[]} */
  const districts = [];

  // 1. Compute stats for normalization
  const stats = computeStats(fileTree);
  const maxLOC = findMaxLOC(fileTree);

  // 2. Recursively lay out the tree using squarified treemap
  const rootRect = { x: 0, z: 0, w: totalSize, h: totalSize };

  layoutNode(fileTree, rootRect);

  return { buildings, districts, stats };

  // -----------------------------------------------------------------------
  // Inner helpers (closed over buildings, districts, options)
  // -----------------------------------------------------------------------

  /**
   * Find the maximum LOC of any single file in the tree (for height scaling).
   * @param {FileNode} node
   * @returns {number}
   */
  function findMaxLOC(node) {
    if (node.type === "file") return node.loc || 0;
    if (!node.children) return 0;
    return node.children.reduce(
      (mx, child) => Math.max(mx, findMaxLOC(child)),
      0,
    );
  }

  /**
   * Recursively lay out a node and its children within the given rect.
   * @param {FileNode} node
   * @param {Rect}     rect
   */
  function layoutNode(node, rect) {
    if (node.type === "file") {
      addBuilding(node, rect);
      return;
    }

    // Node is a directory — emit a district
    addDistrict(node, rect);

    const children = node.children || [];
    if (children.length === 0) return;

    // Apply padding inside the district
    const inner = applyPadding(rect, padding);
    if (inner.w <= 0 || inner.h <= 0) return;

    // Compute total LOC of all children for proportional area allocation
    const totalChildLOC = children.reduce(
      (sum, child) => sum + computeLOC(child),
      0,
    );

    if (totalChildLOC <= 0) {
      // Every child has 0 LOC — divide space equally
      const equalArea = (inner.w * inner.h) / children.length;
      const items = children.map((child) => ({
        node: child,
        area: equalArea,
      }));
      const positioned = squarify(items, inner);
      for (const { node: childNode, rect: childRect } of positioned) {
        layoutNode(childNode, childRect);
      }
      return;
    }

    // Normal case: allocate area proportional to LOC
    const totalArea = inner.w * inner.h;
    const items = children.map((child) => {
      const childLOC = computeLOC(child);
      // Ensure every child gets at least a tiny sliver so it's visible
      const area =
        childLOC > 0
          ? (childLOC / totalChildLOC) * totalArea
          : (0.5 / totalChildLOC) * totalArea;
      return { node: child, area };
    });

    const positioned = squarify(items, inner);
    for (const { node: childNode, rect: childRect } of positioned) {
      layoutNode(childNode, childRect);
    }
  }

  /**
   * Register a building entry for a file node.
   * @param {FileNode} node
   * @param {Rect}     rect
   */
  function addBuilding(node, rect) {
    // Apply a small internal padding so buildings don't touch each other
    const inner = applyPadding(rect, padding * 0.25);
    const loc = node.loc || 0;
    const ext = node.extension || path.extname(node.name) || "";
    const height = locToHeight(loc, maxLOC, minHeight, maxHeight);

    buildings.push({
      type: "building",
      fileName: node.name,
      filePath: node.fullPath || node.path || "",
      directory: (node.fullPath || node.path) ? path.dirname(node.fullPath || node.path) : "",
      extension: ext,
      loc,
      x: inner.x + inner.w / 2,
      y: height / 2,
      z: inner.z + inner.h / 2,
      width: Math.max(inner.w, 0.05),
      depth: Math.max(inner.h, 0.05),
      height,
      color: colorForExtension(ext),
    });
  }

  /**
   * Register a district (ground plane) entry for a directory node.
   * @param {FileNode} node
   * @param {Rect}     rect
   */
  function addDistrict(node, rect) {
    districts.push({
      type: "district",
      name: node.name || "",
      x: rect.x + rect.w / 2,
      z: rect.z + rect.h / 2,
      width: rect.w,
      depth: rect.h,
      color: DISTRICT_COLOR,
    });
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Shrink a rectangle by `pad` on every side.
 * @param {Rect}   rect
 * @param {number} pad
 * @returns {Rect}
 */
function applyPadding(rect, pad) {
  return {
    x: rect.x + pad,
    z: rect.z + pad,
    w: Math.max(rect.w - pad * 2, 0),
    h: Math.max(rect.h - pad * 2, 0),
  };
}

module.exports = {
  generateCityLayout,
};
