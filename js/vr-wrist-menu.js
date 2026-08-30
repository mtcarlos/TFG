/**
 * vr-wrist-menu.js — A-Frame Component for the VR Wrist Menu
 * Concept B: Holographic Mini-Map
 * Projects a 3D interactive miniature of the Code City on the wrist.
 */

AFRAME.registerComponent('vr-wrist-menu', {
    init: function () {
        this.isVisible = true;

        // Visual settings state
        this._cityScale = 1.0;
        this._heightScale = 1.0;
        this._thicknessScale = 1.0;

        // Base container on the controller
        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', '0 0.16 0.06');
        this.container.setAttribute('rotation', '-45 0 0');
        this.el.appendChild(this.container);

        this._buildBaseUI();

        // Sync initial visual settings from desktop if available
        this._syncFromDesktop();

        // Attempt to load the hologram map once the city layout is ready
        var self = this;
        var attempts = 0;
        var mapInterval = setInterval(function() {
            if (window.CodeCity && window.CodeCity.layout && window.CodeCity.layout.buildings) {
                self._renderMiniMap();
                clearInterval(mapInterval);
            }
            attempts++;
            if (attempts > 20) clearInterval(mapInterval);
        }, 1000);
    },

    // ─────────────────────────────────────────────
    //  BUILD THE HOLOGRAPHIC MINI-MAP
    // ─────────────────────────────────────────────
    _renderMiniMap: function () {
        if (this.holoContainer) {
            this.container.removeChild(this.holoContainer);
        }

        this.holoContainer = document.createElement('a-entity');
        // Float the hologram above the wrist base
        this.holoContainer.setAttribute('position', '0 0.12 0');
        this.holoContainer.setAttribute('rotation', '20 0 0');
        this.container.appendChild(this.holoContainer);

        var buildings = window.CodeCity.layout.buildings;
        if (!buildings || buildings.length === 0) return;

        // Calculate city bounds to scale it into a 0.2m x 0.2m area
        var minX = Infinity, maxX = -Infinity;
        var minZ = Infinity, maxZ = -Infinity;

        buildings.forEach(function(b) {
            if (b.x < minX) minX = b.x;
            if (b.x > maxX) maxX = b.x;
            if (b.y < minZ) minZ = b.y; // layout 'y' is mapped to 3D 'Z'
            if (b.y > maxZ) maxZ = b.y;
        });

        var cityWidth = maxX - minX;
        var cityDepth = maxZ - minZ;
        var maxDim = Math.max(cityWidth, cityDepth, 1);
        
        var holoSize = 0.22; // Target hologram size in meters
        var scaleFactor = holoSize / maxDim;

        // Hologram base grid
        var grid = document.createElement('a-plane');
        grid.setAttribute('width', holoSize + 0.02);
        grid.setAttribute('height', holoSize + 0.02);
        grid.setAttribute('rotation', '-90 0 0');
        grid.setAttribute('material', 'color: #3b82f6; opacity: 0.1; transparent: true; wireframe: true');
        this.holoContainer.appendChild(grid);

        // Map label
        this.mapLabel = document.createElement('a-text');
        this.mapLabel.setAttribute('value', 'Mapa Holográfico');
        this.mapLabel.setAttribute('position', '0 0.08 0');
        this.mapLabel.setAttribute('align', 'center');
        this.mapLabel.setAttribute('color', '#60a5fa');
        this.mapLabel.setAttribute('scale', '0.07 0.07 0.07');
        this.holoContainer.appendChild(this.mapLabel);

        // Sort buildings to render top 100 biggest to prevent massive draw calls
        var renderBuildings = buildings.slice().sort(function(a, b) { return (b.loc || 0) - (a.loc || 0); }).slice(0, 100);

        var self = this;
        renderBuildings.forEach(function(b) {
            var normX = (b.x - minX - cityWidth / 2) * scaleFactor;
            var normZ = (b.y - minZ - cityDepth / 2) * scaleFactor;
            
            // Map lines of code to relative height for the miniature
            var loc = b.loc || 1;
            var h = Math.max(0.005, Math.min(0.06, loc * 0.0001));

            var box = document.createElement('a-box');
            box.setAttribute('position', normX + ' ' + (h / 2) + ' ' + normZ);
            box.setAttribute('width', Math.max(0.004, b.w * scaleFactor));
            box.setAttribute('depth', Math.max(0.004, b.h * scaleFactor));
            box.setAttribute('height', h);
            box.setAttribute('color', b.color || '#64748b');
            box.setAttribute('material', 'opacity: 0.7; transparent: true');
            box.setAttribute('class', 'sh-hitbox');

            // Interactivity
            box.addEventListener('mouseenter', function() {
                box.setAttribute('material', 'opacity: 1; wireframe: true');
                var shortName = b.fileName.length > 20 ? b.fileName.substring(0, 17) + '...' : b.fileName;
                self.mapLabel.setAttribute('value', shortName);
                self.mapLabel.setAttribute('color', '#ffffff');
                if (window.VRHaptics) VRHaptics.tick('left');
            });

            box.addEventListener('mouseleave', function() {
                box.setAttribute('material', 'opacity: 0.7; wireframe: false');
                self.mapLabel.setAttribute('value', 'Mapa Holográfico');
                self.mapLabel.setAttribute('color', '#60a5fa');
            });

            box.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.CodeCity) {
                    window.CodeCity.flyToBuilding(b);
                    if (window.VRHaptics) VRHaptics.success('left');
                    if (window.VRSounds) VRSounds.success();
                }
            });

            self.holoContainer.appendChild(box);
        });
    },

    // ─────────────────────────────────────────────
    //  BUILD THE BASE UI (Controls)
    // ─────────────────────────────────────────────
    _buildBaseUI: function () {
        // Base disc on the wrist
        var base = document.createElement('a-cylinder');
        base.setAttribute('radius', '0.14');
        base.setAttribute('height', '0.005');
        base.setAttribute('material', 'color: #161618; opacity: 0.85; transparent: true');
        this.container.appendChild(base);

        var ring = document.createElement('a-torus');
        ring.setAttribute('radius', '0.14');
        ring.setAttribute('radius-tubular', '0.002');
        ring.setAttribute('rotation', '90 0 0');
        ring.setAttribute('material', 'color: #3b82f6; opacity: 0.4; transparent: true');
        this.container.appendChild(ring);

        // Control Panel suspended slightly in front of the disc
        var cp = document.createElement('a-plane');
        cp.setAttribute('width', '0.24');
        cp.setAttribute('height', '0.14');
        cp.setAttribute('position', '0 0.02 0.05');
        cp.setAttribute('rotation', '-15 0 0');
        cp.setAttribute('material', 'color: #27272a; opacity: 0.9; transparent: true');
        this.container.appendChild(cp);

        var cpGlow = document.createElement('a-plane');
        cpGlow.setAttribute('width', '0.245');
        cpGlow.setAttribute('height', '0.145');
        cpGlow.setAttribute('position', '0 0.019 0.05');
        cpGlow.setAttribute('rotation', '-15 0 0');
        cpGlow.setAttribute('material', 'color: #ffffff; opacity: 0.05; transparent: true');
        this.container.appendChild(cpGlow);

        var curY = 0.04;
        
        // Compact Scale Settings
        this._addSettingsRow(cp, 'Escala', curY, 'cityScale', 0.2, 2.0, 0.2);
        curY -= 0.04;
        this._addSettingsRow(cp, 'Altura', curY, 'heightScale', 0.1, 2.0, 0.1);
        curY -= 0.04;
        this._addSettingsRow(cp, 'Ancho', curY, 'thicknessScale', 0.1, 2.0, 0.1);

        // Teleport Center button on the base edge
        var btnTeleport = document.createElement('a-plane');
        btnTeleport.setAttribute('width', '0.08');
        btnTeleport.setAttribute('height', '0.03');
        btnTeleport.setAttribute('position', '0 0.02 0.14');
        btnTeleport.setAttribute('class', 'sh-hitbox');
        btnTeleport.setAttribute('material', 'color: #3f3f46; opacity: 0.9');
        
        var telText = document.createElement('a-text');
        telText.setAttribute('value', 'Origen');
        telText.setAttribute('align', 'center');
        telText.setAttribute('scale', '0.06 0.06 0.06');
        telText.setAttribute('position', '0 0 0.002');
        telText.setAttribute('color', '#ffffff');
        btnTeleport.appendChild(telText);

        btnTeleport.addEventListener('mouseenter', function() {
            btnTeleport.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        btnTeleport.addEventListener('mouseleave', function() {
            btnTeleport.setAttribute('material', 'color', '#3f3f46');
        });
        btnTeleport.addEventListener('click', function(e) {
            e.stopPropagation();
            var rig = document.querySelector('#rig');
            if (rig) rig.setAttribute('position', '0 0 5');
            if (window.VRHaptics) VRHaptics.success('left');
        });
        this.container.appendChild(btnTeleport);
    },

    // ─────────────────────────────────────────────
    //  UI HELPERS
    // ─────────────────────────────────────────────
    _addSettingsRow: function (parent, label, y, prop, min, max, step) {
        var self = this;

        // Label
        var lbl = document.createElement('a-text');
        lbl.setAttribute('value', label);
        lbl.setAttribute('position', '-0.10 ' + y + ' 0.005');
        lbl.setAttribute('align', 'left');
        lbl.setAttribute('color', '#a1a1aa');
        lbl.setAttribute('scale', '0.06 0.06 0.06');
        parent.appendChild(lbl);

        // Value display
        var valLabel = document.createElement('a-text');
        valLabel.setAttribute('value', this['_' + prop].toFixed(1) + 'x');
        valLabel.setAttribute('position', '0.01 ' + y + ' 0.005');
        valLabel.setAttribute('align', 'center');
        valLabel.setAttribute('color', '#e2e8f0');
        valLabel.setAttribute('scale', '0.06 0.06 0.06');
        parent.appendChild(valLabel);
        this['_' + prop + 'Label'] = valLabel;

        // - button
        var minusBtn = this._createSmallActionBtn('-', 0.06, y);
        minusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self['_' + prop] = Math.max(min, parseFloat((self['_' + prop] - step).toFixed(2)));
            self._applyVisualSettings();
            if (window.VRHaptics) VRHaptics.tick('left');
            if (window.VRSounds) VRSounds.hover();
        });
        parent.appendChild(minusBtn);

        // + button
        var plusBtn = this._createSmallActionBtn('+', 0.095, y);
        plusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self['_' + prop] = Math.min(max, parseFloat((self['_' + prop] + step).toFixed(2)));
            self._applyVisualSettings();
            if (window.VRHaptics) VRHaptics.tick('left');
            if (window.VRSounds) VRSounds.hover();
        });
        parent.appendChild(plusBtn);
    },

    _createSmallActionBtn: function (label, x, y) {
        var btn = document.createElement('a-plane');
        btn.setAttribute('width', '0.025');
        btn.setAttribute('height', '0.025');
        btn.setAttribute('position', x + ' ' + y + ' 0.005');
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #3f3f46; opacity: 0.9');

        var text = document.createElement('a-text');
        text.setAttribute('value', label);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#ffffff');
        text.setAttribute('scale', '0.06 0.06 0.06');
        text.setAttribute('position', '0 0 0.002');
        btn.appendChild(text);

        btn.addEventListener('mouseenter', function () {
            btn.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        btn.addEventListener('mouseleave', function () {
            btn.setAttribute('material', 'color', '#3f3f46');
        });

        return btn;
    },

    // ─────────────────────────────────────────────
    //  SYNC WITH DESKTOP
    // ─────────────────────────────────────────────
    _syncFromDesktop: function () {
        var params = new URLSearchParams(window.location.search);
        var isVR = params.get('mode') === 'vr';
        if (!isVR) return;

        var self = this;
        var attempts = 0;
        var syncInterval = setInterval(function () {
            if (window._visualSettings) {
                var vs = window._visualSettings;
                self._cityScale = vs.cityScale || 1.0;
                self._heightScale = vs.heightScale || 1.0;
                self._thicknessScale = vs.thicknessScale || 1.0;

                if (self._cityScaleLabel) self._cityScaleLabel.setAttribute('value', self._cityScale.toFixed(1) + 'x');
                if (self._heightScaleLabel) self._heightScaleLabel.setAttribute('value', self._heightScale.toFixed(1) + 'x');
                if (self._thicknessScaleLabel) self._thicknessScaleLabel.setAttribute('value', self._thicknessScale.toFixed(1) + 'x');

                clearInterval(syncInterval);
            }
            attempts++;
            if (attempts > 10) clearInterval(syncInterval);
        }, 500);
    },

    _applyVisualSettings: function () {
        if (this._cityScaleLabel) this._cityScaleLabel.setAttribute('value', this._cityScale.toFixed(1) + 'x');
        if (this._heightScaleLabel) this._heightScaleLabel.setAttribute('value', this._heightScale.toFixed(1) + 'x');
        if (this._thicknessScaleLabel) this._thicknessScaleLabel.setAttribute('value', this._thicknessScale.toFixed(1) + 'x');

        var cityScaleSlider = document.getElementById('setting-city-scale');
        var heightScaleSlider = document.getElementById('setting-building-height');
        var thicknessScaleSlider = document.getElementById('setting-building-thickness');
        
        if (cityScaleSlider) cityScaleSlider.value = this._cityScale;
        if (heightScaleSlider) heightScaleSlider.value = this._heightScale;
        if (thicknessScaleSlider) thicknessScaleSlider.value = this._thicknessScale;

        if (typeof window.applyVisualSettings === 'function') {
            window.applyVisualSettings();
        }
    }
});
