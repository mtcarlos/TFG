/**
 * vr-right-wrist-menu.js — A-Frame Component for the VR Right Wrist Menu
 * Concept B: Environmental Settings (Scale Controls)
 * Floating control panel attached to the right wrist.
 */

AFRAME.registerComponent('vr-right-wrist-menu', {
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

        this._buildUI();

        // Sync initial visual settings from desktop if available
        this._syncFromDesktop();
    },

    // ─────────────────────────────────────────────
    //  BUILD THE UI
    // ─────────────────────────────────────────────
    _buildUI: function () {
        // Control Panel suspended directly in front of the wrist
        var cp = document.createElement('a-plane');
        cp.setAttribute('width', '0.24');
        cp.setAttribute('height', '0.14');
        cp.setAttribute('position', '0 0.04 0');
        cp.setAttribute('rotation', '-15 0 0');
        cp.setAttribute('material', 'color: #27272a; opacity: 0.9; transparent: true');
        this.container.appendChild(cp);

        var cpGlow = document.createElement('a-plane');
        cpGlow.setAttribute('width', '0.245');
        cpGlow.setAttribute('height', '0.145');
        cpGlow.setAttribute('position', '0 0.039 0');
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
            if (window.VRHaptics) VRHaptics.tick('right');
            if (window.VRSounds) VRSounds.hover();
        });
        parent.appendChild(minusBtn);

        // + button
        var plusBtn = this._createSmallActionBtn('+', 0.095, y);
        plusBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self['_' + prop] = Math.min(max, parseFloat((self['_' + prop] + step).toFixed(2)));
            self._applyVisualSettings();
            if (window.VRHaptics) VRHaptics.tick('right');
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
            btn.setAttribute('material', 'color', '#10b981'); // Greenish highlight
            if (window.VRHaptics) VRHaptics.tick('right');
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
