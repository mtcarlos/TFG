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

            console.log(`[CodeCity] City rendered: ${layout.stats.totalFiles} files, ${layout.stats.totalLOC} LOC`);
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
            bg.setAttribute('material', 'color: #0f172a; opacity: 0.95; transparent: true; side: double');
            this.tooltip.appendChild(bg);

            // Border glow
            const border = document.createElement('a-plane');
            border.setAttribute('width', '3.54');
            border.setAttribute('height', '1.24');
            border.setAttribute('position', '0 0 -0.002');
            border.setAttribute('material', 'color: #059669; opacity: 0.2; transparent: true; side: double');
            this.tooltip.appendChild(border);

            // Left accent bar
            const accent = document.createElement('a-plane');
            accent.setAttribute('width', '0.04');
            accent.setAttribute('height', '1.0');
            accent.setAttribute('position', '-1.7 0 0.003');
            accent.setAttribute('material', 'color: #34d399; opacity: 0.8; transparent: true');
            this.tooltip.appendChild(accent);

            // File name text
            const nameText = document.createElement('a-text');
            nameText.setAttribute('id', 'city-tooltip-name');
            nameText.setAttribute('value', '');
            nameText.setAttribute('position', '0 0.3 0.01');
            nameText.setAttribute('align', 'center');
            nameText.setAttribute('color', '#34d399');
            nameText.setAttribute('width', '3.2');
            nameText.setAttribute('font', 'https://cdn.aframe.io/fonts/Exo2Bold.fnt');
            this.tooltip.appendChild(nameText);

            // Details text (LOC, extension, directory)
            const detailText = document.createElement('a-text');
            detailText.setAttribute('id', 'city-tooltip-detail');
            detailText.setAttribute('value', '');
            detailText.setAttribute('position', '0 -0.15 0.01');
            detailText.setAttribute('align', 'center');
            detailText.setAttribute('color', '#94a3b8');
            detailText.setAttribute('width', '2.8');
            detailText.setAttribute('wrap-count', '40');
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
                    const el = document.createElement('a-plane');
                    el.setAttribute('class', 'city-district');
                    el.setAttribute('position', `${d.x} 0.02 ${d.z}`);
                    el.setAttribute('rotation', '-90 0 0');
                    el.setAttribute('width', d.width);
                    el.setAttribute('height', d.depth);
                    el.setAttribute('material', `color: ${d.color || '#1e293b'}; opacity: 0.4; transparent: true; side: double`);
                    container.appendChild(el);

                    // District label (only for larger districts)
                    if (d.width > 2 && d.depth > 2 && d.name !== 'root') {
                        const label = document.createElement('a-text');
                        label.setAttribute('value', d.name);
                        label.setAttribute('position', `${d.x} 0.05 ${d.z + d.depth / 2 + 0.2}`);
                        label.setAttribute('align', 'center');
                        label.setAttribute('color', '#475569');
                        label.setAttribute('width', Math.min(d.width * 1.5, 4));
                        label.setAttribute('side', 'double');
                        container.appendChild(label);
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
            el.setAttribute('material', 'emissive', buildingData.color);
            el.setAttribute('material', 'emissiveIntensity', 0.3);

            // Position tooltip above the building
            const pos = el.getAttribute('position');
            if (this.tooltip) {
                this.tooltip.setAttribute('position', {
                    x: pos.x,
                    y: pos.y + buildingData.height / 2 + 1.5,
                    z: pos.z
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
            el.setAttribute('material', 'emissive', '#34d399');
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
        }
    };

    // Expose globally for Oracle integration in future phases
    window.CodeCity = CodeCity;

})();
