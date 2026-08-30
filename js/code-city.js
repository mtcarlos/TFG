/**
 * code-city.js — A-Frame Code City Renderer
 * Fetches the city layout from the server and renders buildings (files)
 * and districts (directories) as 3D entities in the VR scene.
 * Includes hover tooltips showing file name and LOC.
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // CODE CITY RENDERER
    // ─────────────────────────────────────────────
    const CodeCity = {
        layout: null,
        selectedBuilding: null,
        tooltip: null,
        isXRayMode: false,

        /**
         * Toggls X-Ray Vision (Heatmap based on commit dates)
         */
        toggleXRayMode() {
            this.isXRayMode = !this.isXRayMode;
            const buildings = document.querySelectorAll('.code-building');
            
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;

            buildings.forEach(el => {
                if (!this.isXRayMode) {
                    // Restore original color safely
                    try {
                        const origColor = el.getAttribute('data-original-color') || '#64748b';
                        if (origColor !== 'undefined' && origColor !== 'null') {
                            el.setAttribute('material', 'color', origColor);
                        } else {
                            el.setAttribute('material', 'color', '#64748b');
                        }
                    } catch (e) {
                        console.warn('[CodeCity] Failed to restore color for building', e);
                    }
                } else {
                    // X-Ray Mode: Color by recency
                    const lastModified = parseInt(el.getAttribute('data-last-modified') || '0', 10);
                    
                    if (lastModified === 0) {
                        el.setAttribute('material', 'color', '#4a5568'); // Gray for unknown
                        return;
                    }
                    
                    const ageInDays = (now - lastModified) / ONE_DAY;
                    
                    // Heatmap color logic (Red -> Yellow -> Blue)
                    let newColor = '#0000ff'; // Blue for > 365 days
                    
                    if (ageInDays <= 7) {
                        newColor = '#ff0000'; // Red (hot!)
                    } else if (ageInDays <= 30) {
                        newColor = '#ff6600'; // Orange
                    } else if (ageInDays <= 90) {
                        newColor = '#ffcc00'; // Yellow
                    } else if (ageInDays <= 180) {
                        newColor = '#33cc33'; // Green
                    } else if (ageInDays <= 365) {
                        newColor = '#0099ff'; // Light Blue
                    }

                    el.setAttribute('material', 'color', newColor);
                }
            });
            
            console.log(`[CodeCity] X-Ray Mode: ${this.isXRayMode ? 'ON' : 'OFF'}`);
            return this.isXRayMode;
        },

        /**
         * Fetch the city layout from the server and render it.
         * @param {string} roomId
         */
        async init(roomId) {
            if (!roomId) {
                console.warn('[CodeCity] No roomId — cannot render city');
                return;
            }

            // Poll until layout is available (cloning may take time)
            const layout = await this._fetchLayout(roomId);
            if (!layout) {
                console.error('[CodeCity] Failed to fetch city layout');
                return;
            }

            this.layout = layout;
            this._createTooltip();
            this._renderCity();
            this._updateRaycasters();

            // Apply active visual settings scales to the newly rendered city
            if (typeof window.applyVisualSettings === 'function') {
                window.applyVisualSettings();
            }

            if (typeof window.populateFileTypesDashboard === 'function') {
                window.populateFileTypesDashboard(layout.buildings, layout.stats.totalLOC);
            }

            // Initialize Time Machine
            this._initTimeMachine(roomId);

            console.log(`[CodeCity] City rendered: ${layout.stats.totalFiles} files, ${layout.stats.totalLOC} LOC`);
        },

        /**
         * Initialize Time Machine: fetch commits and wire up UI
         */
        async _initTimeMachine(roomId) {
            const selectEl = document.getElementById('time-machine-select');
            const goBtn = document.getElementById('time-machine-go');
            if (!selectEl || !goBtn) return;

            try {
                const res = await fetch(`/api/rooms/${roomId}/commits`);
                const data = await res.json();
                if (data.commits && data.commits.length > 0) {
                    selectEl.innerHTML = ''; // Clear loading
                    data.commits.forEach(commit => {
                        const opt = document.createElement('option');
                        opt.value = commit.hash;
                        // Format: "YYYY-MM-DD - message (hash)"
                        opt.textContent = `${commit.date} - ${commit.message} (${commit.hash})`;
                        selectEl.appendChild(opt);
                    });

                    goBtn.onclick = async () => {
                        const sha = selectEl.value;
                        if (!sha) return;

                        // Give UI feedback
                        const originalText = goBtn.textContent;
                        goBtn.textContent = 'Traveling...';
                        goBtn.disabled = true;

                        try {
                            const postRes = await fetch(`/api/rooms/${roomId}/checkout`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ commitSha: sha })
                            });

                            if (!postRes.ok) throw new Error('Checkout failed');
                            const postData = await postRes.json();
                            
                            if (postData.success && postData.layout) {
                                // 1. Clean up old city elements
                                const container = document.getElementById('code-city');
                                if (container) {
                                    // Remove all children except tooltip/beacons if any (just clearing is easier)
                                    container.innerHTML = '';
                                }

                                // 2. Set new layout and re-render
                                this.layout = postData.layout;
                                this._renderCity();
                                this._updateRaycasters();
                                
                                // Re-apply X-Ray if it was on
                                if (this.isXRayMode) {
                                    this.isXRayMode = false; // toggle forces recalculation
                                    this.toggleXRayMode();
                                }
                            }
                        } catch (err) {
                            console.error('[CodeCity] Time Travel error:', err);
                        } finally {
                            goBtn.textContent = originalText;
                            goBtn.disabled = false;
                        }
                    };
                } else {
                    selectEl.innerHTML = '<option value="">No history available</option>';
                    goBtn.disabled = true;
                }
            } catch (err) {
                console.error('[CodeCity] Failed to fetch commit history:', err);
                selectEl.innerHTML = '<option value="">Error fetching history</option>';
            }
        },

        /**
         * Poll the server until the city layout is ready.
         */
        async _fetchLayout(roomId) {
            const MAX_RETRIES = 30;
            const RETRY_DELAY = 2000;

            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    const res = await fetch(`/api/rooms/${roomId}/city-layout`);
                    if (res.status === 202) {
                        // Clone/analysis still in progress
                        console.log('[CodeCity] Cloning in progress, retrying...');
                        await new Promise(r => setTimeout(r, RETRY_DELAY));
                        continue;
                    }
                    if (res.ok) {
                        return await res.json();
                    }
                    if (res.status === 404) {
                        // No repo selected yet, wait
                        await new Promise(r => setTimeout(r, RETRY_DELAY * 2));
                        continue;
                    }
                } catch (err) {
                    console.warn('[CodeCity] Fetch error, retrying...', err);
                }
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }
            return null;
        },

        /**
         * Create the 3D tooltip entity (hidden by default).
         */
        _createTooltip() {
            const scene = document.querySelector('a-scene');
            if (!scene) return;

            // Container
            this.tooltip = document.createElement('a-entity');
            this.tooltip.setAttribute('id', 'city-tooltip');
            this.tooltip.setAttribute('visible', false);
            this.tooltip.setAttribute('look-at', '[camera]');

            // Background plane
            const bg = document.createElement('a-plane');
            bg.setAttribute('width', '3.5');
            bg.setAttribute('height', '1.2');
            bg.setAttribute('material', 'color: #f5f0e6; opacity: 0.95; transparent: true; side: double');
            this.tooltip.appendChild(bg);

            // Border glow
            const border = document.createElement('a-plane');
            border.setAttribute('width', '3.54');
            border.setAttribute('height', '1.24');
            border.setAttribute('position', '0 0 -0.002');
            border.setAttribute('material', 'color: #d4a853; opacity: 0.2; transparent: true; side: double');
            this.tooltip.appendChild(border);

            // Left accent bar
            const accent = document.createElement('a-plane');
            accent.setAttribute('width', '0.04');
            accent.setAttribute('height', '1.0');
            accent.setAttribute('position', '-1.7 0 0.003');
            accent.setAttribute('material', 'color: #8b6914; opacity: 0.8; transparent: true');
            this.tooltip.appendChild(accent);

            // File name text
            const nameText = document.createElement('a-text');
            nameText.setAttribute('id', 'city-tooltip-name');
            nameText.setAttribute('value', '');
            nameText.setAttribute('position', '0 0.3 0.01');
            nameText.setAttribute('align', 'center');
            nameText.setAttribute('color', '#8b6914');
            nameText.setAttribute('width', '3.2');
            nameText.setAttribute('font', '/assets/fonts/custom-msdf.json');
            nameText.setAttribute('negate', false);
            this.tooltip.appendChild(nameText);

            // Details text (LOC, extension, directory)
            const detailText = document.createElement('a-text');
            detailText.setAttribute('id', 'city-tooltip-detail');
            detailText.setAttribute('value', '');
            detailText.setAttribute('position', '0 -0.15 0.01');
            detailText.setAttribute('align', 'center');
            detailText.setAttribute('color', '#5a6b5c');
            detailText.setAttribute('width', '2.8');
            detailText.setAttribute('wrap-count', '40');
            detailText.setAttribute('font', '/assets/fonts/custom-msdf.json');
            detailText.setAttribute('negate', false);
            this.tooltip.appendChild(detailText);

            scene.appendChild(this.tooltip);
        },

        /**
         * Render all buildings and districts in the A-Frame scene.
         */
        _renderCity() {
            const container = document.getElementById('code-city');
            if (!container) {
                console.error('[CodeCity] No #code-city container found in scene');
                return;
            }

            const { buildings, districts } = this.layout;

            // Render districts (ground planes for directories)
            if (districts) {
                districts.forEach((d, idx) => {
                    const distDepth = d.districtDepth || 0;
                    // Raise districts slightly off the ground, with deeper districts slightly higher
                    const yOffset = 0.06 + distDepth * 0.01;

                    // Main district ground plane — solid colored, slightly raised
                    const el = document.createElement('a-plane');
                    el.setAttribute('class', 'city-district');
                    el.setAttribute('position', `${d.x} ${yOffset} ${d.z}`);
                    el.setAttribute('rotation', '-90 0 0');
                    el.setAttribute('width', d.width);
                    el.setAttribute('height', d.depth);
                    el.setAttribute('material', `color: ${d.color || '#c9b99a'}; opacity: 0.6; transparent: true; side: double`);
                    container.appendChild(el);

                    // District border outline — slightly larger, darker tint
                    if (d.width > 1.5 && d.depth > 1.5) {
                        const border = document.createElement('a-plane');
                        border.setAttribute('class', 'city-district-border');
                        border.setAttribute('position', `${d.x} ${yOffset - 0.003} ${d.z}`);
                        border.setAttribute('rotation', '-90 0 0');
                        border.setAttribute('width', d.width + 0.12);
                        border.setAttribute('height', d.depth + 0.12);
                        border.setAttribute('material', `color: #5a5040; opacity: 0.25; transparent: true; side: double`);
                        container.appendChild(border);
                    }

                    // District label — floating above the district with background
                    if (d.width > 2 && d.depth > 2 && d.name !== 'root') {
                        const labelY = 0.35 + distDepth * 0.05;
                        const labelGroup = document.createElement('a-entity');
                        labelGroup.setAttribute('position', `${d.x} ${labelY} ${d.z + d.depth / 2 + 0.3}`);
                        labelGroup.setAttribute('look-at', '[camera]');

                        // Background plane for readability
                        const labelBg = document.createElement('a-plane');
                        const labelWidth = Math.min(d.name.length * 0.22 + 0.6, 3.5);
                        labelBg.setAttribute('width', labelWidth);
                        labelBg.setAttribute('height', '0.35');
                        labelBg.setAttribute('material', `color: ${d.color || '#f5f0e6'}; opacity: 0.85; transparent: true; side: double`);
                        labelGroup.appendChild(labelBg);

                        // Border for label background
                        const labelBorder = document.createElement('a-plane');
                        labelBorder.setAttribute('width', labelWidth + 0.04);
                        labelBorder.setAttribute('height', '0.39');
                        labelBorder.setAttribute('position', '0 0 -0.002');
                        labelBorder.setAttribute('material', `color: #5a5040; opacity: 0.2; transparent: true; side: double`);
                        labelGroup.appendChild(labelBorder);

                        // Text label
                        const label = document.createElement('a-text');
                        label.setAttribute('value', d.name);
                        label.setAttribute('position', '0 0 0.01');
                        label.setAttribute('align', 'center');
                        label.setAttribute('color', '#3a2e1a');
                        label.setAttribute('width', Math.min(d.width * 1.8, 5));
                        label.setAttribute('font', '/assets/fonts/custom-msdf.json');
                        label.setAttribute('negate', false);
                        label.setAttribute('side', 'double');
                        labelGroup.appendChild(label);

                        container.appendChild(labelGroup);
                    }
                });
            }

            // Render buildings (files as boxes)
            buildings.forEach((b, idx) => {
                const el = document.createElement('a-box');
                el.setAttribute('class', 'code-building sh-hitbox');
                el.setAttribute('position', `${b.x} ${b.y} ${b.z}`);
                el.setAttribute('width', b.width);
                el.setAttribute('height', b.height);
                el.setAttribute('depth', b.depth);
                el.setAttribute('material', `color: ${b.color}; metalness: 0.1; roughness: 0.7`);
                el.setAttribute('data-filepath', b.filePath);
                el.setAttribute('data-filename', b.fileName);
                el.setAttribute('data-loc', b.loc);
                el.setAttribute('data-extension', b.extension);
                el.setAttribute('data-directory', b.directory || '');
                el.setAttribute('data-original-color', b.color);
                el.setAttribute('data-last-modified', b.lastModified || 0);

                // Entrance animation: buildings grow from ground
                el.setAttribute('animation__grow', {
                    property: 'scale',
                    from: '1 0 1',
                    to: '1 1 1',
                    dur: 800 + Math.random() * 600,
                    delay: 200 + idx * 15,
                    easing: 'easeOutElastic'
                });

                // Hover and click events
                el.addEventListener('mouseenter', () => this._onBuildingHover(el, b));
                el.addEventListener('mouseleave', () => this._onBuildingLeave(el, b));
                el.addEventListener('click', () => this._onBuildingClick(el, b));

                container.appendChild(el);
            });
        },

        /**
         * Show tooltip when hovering a building.
         */
        _onBuildingHover(el, buildingData) {
            // Highlight the building
            const currentColor = el.components.material.data.color;
            el.setAttribute('material', 'emissive', currentColor);
            el.setAttribute('material', 'emissiveIntensity', 0.3);

            // Position tooltip above the building (local → world space)
            const pos = el.getAttribute('position');
            if (this.tooltip) {
                const cityEl = document.getElementById('code-city');
                let scaleX = 1, scaleY = 1, scaleZ = 1;
                let offsetX = 0, offsetY = 0, offsetZ = 0;
                if (cityEl) {
                    const scale = cityEl.getAttribute('scale') || { x: 1, y: 1, z: 1 };
                    scaleX = scale.x;
                    scaleY = scale.y;
                    scaleZ = scale.z;
                    const cityPos = cityEl.getAttribute('position') || { x: 0, y: 0, z: 0 };
                    offsetX = cityPos.x;
                    offsetY = cityPos.y;
                    offsetZ = cityPos.z;
                }

                this.tooltip.setAttribute('position', {
                    x: pos.x * scaleX + offsetX,
                    y: (pos.y + buildingData.height / 2) * scaleY + offsetY + 1.5,
                    z: pos.z * scaleZ + offsetZ
                });

                const nameEl = this.tooltip.querySelector('#city-tooltip-name');
                const detailEl = this.tooltip.querySelector('#city-tooltip-detail');

                if (nameEl) nameEl.setAttribute('value', buildingData.fileName);
                if (detailEl) detailEl.setAttribute('value',
                    `${buildingData.loc} líneas | ${buildingData.extension}\n${buildingData.directory || 'root'}`
                );

                this.tooltip.setAttribute('visible', true);
            }
        },

        /**
         * Hide tooltip when leaving a building.
         */
        _onBuildingLeave(el, buildingData) {
            el.setAttribute('material', 'emissive', '#000000');
            el.setAttribute('material', 'emissiveIntensity', 0);

            if (this.tooltip) {
                this.tooltip.setAttribute('visible', false);
            }
        },

        /**
         * Handle building click — select and store for Oracle context.
         */
        _onBuildingClick(el, buildingData) {
            // Deselect previous
            if (this.selectedBuilding && this.selectedBuilding !== el) {
                this.selectedBuilding.setAttribute('material', 'emissive', '#000000');
                this.selectedBuilding.setAttribute('material', 'emissiveIntensity', 0);
            }

            // Select new building
            this.selectedBuilding = el;
            el.setAttribute('material', 'emissive', '#d4a853');
            el.setAttribute('material', 'emissiveIntensity', 0.5);

            // Dispatch custom event for Oracle or other systems to pick up
            document.dispatchEvent(new CustomEvent('building-selected', {
                detail: {
                    filePath: buildingData.filePath,
                    fileName: buildingData.fileName,
                    loc: buildingData.loc,
                    extension: buildingData.extension,
                    directory: buildingData.directory
                }
            }));

            console.log(`[CodeCity] Selected: ${buildingData.filePath} (${buildingData.loc} LOC)`);
        },

        /**
         * Update raycasters to detect code-building entities.
         */
        _updateRaycasters() {
            // Desktop cursor already uses .sh-hitbox which includes .code-building
            // VR controllers also already target .sh-hitbox
            // No changes needed if we use class "sh-hitbox" on buildings
        },

        /**
         * Get the currently selected building data (for Oracle integration).
         * @returns {object|null}
         */
        getSelectedFile() {
            if (!this.selectedBuilding) return null;
            return {
                filePath: this.selectedBuilding.getAttribute('data-filepath'),
                fileName: this.selectedBuilding.getAttribute('data-filename'),
                loc: parseInt(this.selectedBuilding.getAttribute('data-loc'), 10),
                extension: this.selectedBuilding.getAttribute('data-extension'),
                directory: this.selectedBuilding.getAttribute('data-directory')
            };
        },

        /**
         * Get all buildings data for search functionality.
         * @returns {Array} Array of building objects from the layout
         */
        getBuildings() {
            return this.layout ? this.layout.buildings : [];
        },

        /**
         * Search buildings by file name (case-insensitive partial match).
         * @param {string} query
         * @returns {Array} Matching building objects sorted by relevance
         */
        searchBuildings(query) {
            if (!this.layout || !query) return [];
            const q = query.toLowerCase().trim();
            if (!q) return [];

            return this.layout.buildings
                .filter(b => {
                    const name = b.fileName.toLowerCase();
                    const path = (b.filePath || '').toLowerCase();
                    return name.includes(q) || path.includes(q);
                })
                .sort((a, b) => {
                    const aName = a.fileName.toLowerCase();
                    const bName = b.fileName.toLowerCase();
                    // Prioritize exact name start matches
                    const aStarts = aName.startsWith(q) ? 0 : 1;
                    const bStarts = bName.startsWith(q) ? 0 : 1;
                    if (aStarts !== bStarts) return aStarts - bStarts;
                    // Then by name length (shorter = more relevant)
                    return aName.length - bName.length;
                })
                .slice(0, 20); // Limit results
        },

        /**
         * Fly the camera to a specific building, with smooth animation.
         * @param {object} building - Building object from the layout
         */
        flyToBuilding(building) {
            if (!building) return;

            const rig = document.getElementById('rig');
            const cityEl = document.getElementById('code-city');
            if (!rig || !cityEl) return;

            // Get city container transform
            const cityPos = cityEl.getAttribute('position') || { x: 0, y: 0, z: 0 };
            const cityScale = cityEl.getAttribute('scale') || { x: 1, y: 1, z: 1 };

            // Compute world position of the building
            const worldX = building.x * cityScale.x + cityPos.x;
            const worldZ = building.z * cityScale.z + cityPos.z;
            const worldY = 0; // Ground level for the rig

            // Position the rig 3 units in front of the building (toward negative Z)
            const targetPos = {
                x: worldX,
                y: worldY,
                z: worldZ + 4
            };

            // Animate the rig to the target position
            rig.setAttribute('animation__flyto', {
                property: 'position',
                to: `${targetPos.x} ${targetPos.y} ${targetPos.z}`,
                dur: 1200,
                easing: 'easeInOutCubic'
            });

            // Highlight the target building
            this._highlightBuilding(building);

            console.log(`[CodeCity] Flying to: ${building.fileName} at (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`);
        },

        /**
         * Highlight a building with a pulsing golden glow.
         * @param {object} building - Building object from the layout
         */
        _highlightBuilding(building) {
            const container = document.getElementById('code-city');
            if (!container) return;

            // Find the matching DOM element
            const buildings = container.querySelectorAll('.code-building');
            let targetEl = null;

            buildings.forEach(el => {
                if (el.getAttribute('data-filepath') === building.filePath) {
                    targetEl = el;
                }
            });

            if (!targetEl) return;

            // Clear previous highlight
            if (this._highlightedEl && this._highlightedEl !== targetEl) {
                this._highlightedEl.setAttribute('material', 'emissive', '#000000');
                this._highlightedEl.setAttribute('material', 'emissiveIntensity', 0);
                if (this._highlightBeacon) {
                    this._highlightBeacon.parentNode.removeChild(this._highlightBeacon);
                    this._highlightBeacon = null;
                }
            }

            this._highlightedEl = targetEl;

            // Set golden emissive glow with pulsing animation
            targetEl.setAttribute('material', 'emissive', '#d4a853');
            targetEl.setAttribute('material', 'emissiveIntensity', 0.6);
            targetEl.setAttribute('animation__glow', {
                property: 'material.emissiveIntensity',
                from: 0.3,
                to: 0.8,
                dur: 800,
                dir: 'alternate',
                loop: 6,
                easing: 'easeInOutSine'
            });

            // Add a vertical beacon above the building
            if (this._highlightBeacon) {
                this._highlightBeacon.parentNode.removeChild(this._highlightBeacon);
            }

            const beacon = document.createElement('a-cylinder');
            beacon.setAttribute('radius', '0.06');
            beacon.setAttribute('height', '5');
            beacon.setAttribute('position', `${building.x} ${building.y + building.height / 2 + 2.5} ${building.z}`);
            beacon.setAttribute('material', 'color: #d4a853; emissive: #d4a853; emissiveIntensity: 0.8; opacity: 0.4; transparent: true');
            beacon.setAttribute('animation__fade', {
                property: 'material.opacity',
                from: 0.5,
                to: 0.1,
                dur: 3000,
                easing: 'easeOutCubic'
            });
            container.appendChild(beacon);
            this._highlightBeacon = beacon;

            // Clean up beacon after animation
            setTimeout(() => {
                if (this._highlightBeacon === beacon && beacon.parentNode) {
                    beacon.parentNode.removeChild(beacon);
                    this._highlightBeacon = null;
                }
            }, 3500);

            // Also trigger the building-selected event for Oracle integration
            this.selectedBuilding = targetEl;
            document.dispatchEvent(new CustomEvent('building-selected', {
                detail: {
                    filePath: building.filePath,
                    fileName: building.fileName,
                    loc: building.loc,
                    extension: building.extension,
                    directory: building.directory
                }
            }));
        }
    };

    // Expose globally for Oracle integration in future phases
    window.CodeCity = CodeCity;

})();
