/**
 * SceneDataLoader.js — Unified Data Ingestion Service for VR Code City
 * 
 * Handles all data sources uniformly:
 *   - Static JSON demos (bundled with the repository)
 *   - Local file uploads (user-selected .json files)
 *   - Backend API (live GitHub repository cloning)
 * 
 * All methods return a normalized city layout object compatible with
 * CodeCity.initWithData() and the scene HUD/dashboard systems.
 */

(function () {
    'use strict';

    const SceneDataLoader = {

        /**
         * Load scene from a static JSON file bundled with the repository.
         * Supports both the flat-array format [{filename, folder, loc, ext}]
         * and the full layout format {buildings, stats}.
         * @param {string} demoPath — relative or absolute path to the JSON file
         * @returns {Promise<Object>} normalized layout object
         */
        async loadFromStaticDemo(demoPath) {
            const response = await fetch(demoPath);
            if (!response.ok) throw new Error(`Failed to load demo file: ${demoPath} (${response.status})`);
            const raw = await response.json();
            return this._normalizeLayout(raw, demoPath);
        },

        /**
         * Load scene from a local file selected by user (File input / drag-drop).
         * Parsed client-side via FileReader.readAsText().
         * @param {File} file — the File object from <input type="file"> or DataTransfer
         * @returns {Promise<Object>} normalized layout object
         */
        async loadFromFileBlob(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const raw = JSON.parse(e.target.result);
                        resolve(this._normalizeLayout(raw, file.name));
                    } catch (err) {
                        reject(new Error('Invalid JSON file format: ' + err.message));
                    }
                };
                reader.onerror = () => reject(new Error('Error reading local file.'));
                reader.readAsText(file);
            });
        },

        /**
         * Load scene from the backend pipeline (existing online flow).
         * @param {string} roomId — the room identifier
         * @returns {Promise<Object>} repo data from the server
         */
        async loadFromBackend(roomId) {
            const response = await fetch(`/api/rooms/${roomId}/repo-data`);
            if (!response.ok) throw new Error('Backend failed to fetch repository data.');
            return await response.json();
        },

        /**
         * Normalize raw JSON data into the layout format expected by CodeCity.
         * 
         * The flat demo format is: [{filename, folder, loc, ext}, ...]
         * The full server format is: {buildings: [...], stats: {totalFiles, totalLOC, ...}}
         * 
         * This method detects the format and converts flat arrays into full layout.
         * @param {Array|Object} raw — the raw parsed JSON
         * @param {string} sourceName — display name for logging
         * @returns {Object} normalized layout {buildings, stats, districts}
         */
        _normalizeLayout(raw, sourceName = 'unknown') {
            // Already a full layout object
            if (raw && raw.buildings && raw.stats) {
                console.log(`[SceneDataLoader] Loaded full layout from: ${sourceName}`);
                return raw;
            }

            // Flat array format — convert to full layout
            if (Array.isArray(raw)) {
                return this._flatArrayToLayout(raw, sourceName);
            }

            // Unknown format — try to use as-is
            console.warn(`[SceneDataLoader] Unknown format from: ${sourceName}, passing through`);
            return raw;
        },

        /**
         * Convert flat array [{filename, folder, loc, ext}] to CodeCity layout format.
         * Generates districts (grouped by folder), buildings, and aggregate stats.
         */
        _flatArrayToLayout(files, sourceName) {
            // Group files by folder (district)
            const districtMap = {};
            let totalLOC = 0;
            const extCounts = {};

            files.forEach(file => {
                const district = file.folder || 'root';
                if (!districtMap[district]) {
                    districtMap[district] = [];
                }
                districtMap[district].push(file);
                totalLOC += (file.loc || 0);

                const ext = file.ext || 'unknown';
                extCounts[ext] = (extCounts[ext] || 0) + 1;
            });

            // Build district grid layout
            const districtNames = Object.keys(districtMap);
            const gridCols = Math.ceil(Math.sqrt(districtNames.length));
            const DISTRICT_SPACING = 12;

            const buildings = [];
            const districts = [];

            districtNames.forEach((distName, distIdx) => {
                const distFiles = districtMap[distName];
                const distRow = Math.floor(distIdx / gridCols);
                const distCol = distIdx % gridCols;

                // Center the grid
                const distOffsetX = (distCol - (gridCols - 1) / 2) * DISTRICT_SPACING;
                const distOffsetZ = (distRow - (Math.ceil(districtNames.length / gridCols) - 1) / 2) * DISTRICT_SPACING;

                // Lay out buildings within district
                const innerCols = Math.ceil(Math.sqrt(distFiles.length));
                const innerRows = Math.ceil(distFiles.length / innerCols);
                const BUILDING_SPACING = 1.6;

                // District dimensions based on the grid + padding
                const distWidth = innerCols * BUILDING_SPACING + 1;
                const distDepth = innerRows * BUILDING_SPACING + 1;

                districts.push({
                    name: distName,
                    x: distOffsetX,
                    z: distOffsetZ,
                    width: distWidth,
                    depth: distDepth,
                    districtDepth: 0, // flat array doesn't have deep nesting
                    fileCount: distFiles.length,
                    totalLOC: distFiles.reduce((s, f) => s + (f.loc || 0), 0),
                    color: '#c9b99a'
                });

                distFiles.forEach((file, fileIdx) => {
                    const row = Math.floor(fileIdx / innerCols);
                    const col = fileIdx % innerCols;

                    const bx = distOffsetX + (col - (innerCols - 1) / 2) * BUILDING_SPACING;
                    const bz = distOffsetZ + (row - (innerRows - 1) / 2) * BUILDING_SPACING;

                    // Height based on LOC (log scale for visual balance)
                    const loc = file.loc || 1;
                    const height = Math.max(0.3, Math.log2(loc + 1) * 0.5);

                    // Color based on extension
                    const color = SceneDataLoader._extColor(file.ext);

                    buildings.push({
                        fileName: file.filename,
                        directory: file.folder || 'root',
                        extension: file.ext || '',
                        loc: loc,
                        height: height,
                        width: 0.8,
                        depth: 0.8,
                        x: bx,
                        y: height / 2, // A-Frame boxes are centered, so y must be half-height
                        z: bz,
                        color: color,
                        lastModified: 0
                    });
                });
            });

            const layout = {
                buildings: buildings,
                districts: districts,
                stats: {
                    totalFiles: files.length,
                    totalLOC: totalLOC,
                    totalDirectories: districtNames.length,
                    extensions: extCounts
                },
                _source: sourceName,
                _isOfflineDemo: true
            };

            console.log(`[SceneDataLoader] Converted flat array → layout: ${files.length} files, ${totalLOC} LOC, ${districtNames.length} districts from: ${sourceName}`);
            return layout;
        },

        /**
         * Extension → color mapping (matches GitHub/VS Code conventions).
         */
        _extColor(ext) {
            const COLORS = {
                'js': '#f1e05a',
                'ts': '#3178c6',
                'jsx': '#f1e05a',
                'tsx': '#3178c6',
                'py': '#3572A5',
                'java': '#b07219',
                'html': '#e34c26',
                'css': '#563d7c',
                'scss': '#c6538c',
                'json': '#292929',
                'md': '#083fa1',
                'yml': '#cb171e',
                'yaml': '#cb171e',
                'xml': '#0060ac',
                'sh': '#89e051',
                'bash': '#89e051',
                'go': '#00ADD8',
                'rs': '#dea584',
                'rb': '#701516',
                'php': '#4F5D95',
                'c': '#555555',
                'cpp': '#f34b7d',
                'h': '#555555',
                'cs': '#178600',
                'swift': '#F05138',
                'kt': '#A97BFF',
                'vue': '#41b883',
                'svelte': '#ff3e00'
            };
            return COLORS[ext] || '#64748b';
        }
    };

    // Expose globally
    window.SceneDataLoader = SceneDataLoader;

})();
