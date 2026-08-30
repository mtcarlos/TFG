/**
 * vr-wrist-menu.js — A-Frame Component for the VR Wrist Menu
 * Attaches to the left controller and displays a quick-access menu
 * for toggling the Oracle, Dashboard, and X-Ray mode.
 */

AFRAME.registerComponent('vr-wrist-menu', {
    init: function () {
        this.isVisible = true;

        // Container attached to the controller
        // Positioned slightly above and tilted towards the user
        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', '0 0.16 0.06');
        this.container.setAttribute('rotation', '-45 0 0');
        this.el.appendChild(this.container);

        const W = 0.44;
        const H = 0.38;

        // Background (frosted dark panel with glow border)
        const bg = document.createElement('a-plane');
        bg.setAttribute('width', W);
        bg.setAttribute('height', H);
        bg.setAttribute('material', 'color: #0f172a; opacity: 0.94; transparent: true; side: double');
        this.container.appendChild(bg);

        const border = document.createElement('a-plane');
        border.setAttribute('width', W + 0.01);
        border.setAttribute('height', H + 0.01);
        border.setAttribute('position', '0 0 -0.002');
        border.setAttribute('material', 'color: #38bdf8; opacity: 0.25; transparent: true; side: double');
        this.container.appendChild(border);

        // Title
        const title = document.createElement('a-text');
        title.setAttribute('value', 'VR Tools');
        title.setAttribute('position', `0 ${H / 2 - 0.045} 0.01`);
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#38bdf8');
        title.setAttribute('scale', '0.13 0.13 0.13');
        this.container.appendChild(title);

        // Button 1: Toggle Oracle
        this.btnOracle = this._createButton('🔮 Oráculo', 0, 0.075, '#8b5cf6', '#6d28d9');
        this.btnOracle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (window.VRHaptics) VRHaptics.click('left');
            if (window.VRSounds) VRSounds.click();
            const oracle = document.querySelector('[oracle-panel]');
            if (oracle) {
                oracle.components['oracle-panel'].toggleVisibility();
            }
        });
        this.container.appendChild(this.btnOracle);

        // Button 2: Toggle Dashboard
        this.btnDash = this._createButton('📊 Dashboard', 0, 0.005, '#10b981', '#059669');
        this.btnDash.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (window.VRHaptics) VRHaptics.click('left');
            if (window.VRSounds) VRSounds.click();
            const dash = document.querySelector('[vr-dashboard-panel]');
            if (dash) {
                dash.components['vr-dashboard-panel'].toggleVisibility();
            }
        });
        this.container.appendChild(this.btnDash);

        // Button 3: Toggle X-Ray
        this.btnXRay = this._createButton('👁 X-Ray: OFF', 0, -0.065, '#ef4444', '#dc2626');
        this.btnXRay.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (window.VRHaptics) VRHaptics.click('left');
            if (window.VRSounds) VRSounds.click();
            if (window.CodeCity) {
                const isXRay = window.CodeCity.toggleXRayMode();
                const label = this.btnXRay.querySelector('a-text');
                if (label) label.setAttribute('value', isXRay ? '👁 X-Ray: ON' : '👁 X-Ray: OFF');
                this.btnXRay.setAttribute('material', 'color', isXRay ? '#dc2626' : '#1e293b');
            }
        });
        this.container.appendChild(this.btnXRay);

        // Button 4: Teleport Center
        this.btnTeleport = this._createButton('📍 Teleport Centro', 0, -0.135, '#3b82f6', '#2563eb');
        this.btnTeleport.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (window.VRHaptics) VRHaptics.success('left');
            if (window.VRSounds) VRSounds.success();
            const rig = document.querySelector('#rig');
            if (rig) {
                rig.setAttribute('position', '0 0 5');
            }
        });
        this.container.appendChild(this.btnTeleport);
    },

    _createButton: function (textVal, x, y, hoverColor, activeColor) {
        const btn = document.createElement('a-plane');
        btn.setAttribute('width', '0.36');
        btn.setAttribute('height', '0.055');
        btn.setAttribute('position', `${x} ${y} 0.01`);
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #1e293b; opacity: 0.9');

        const text = document.createElement('a-text');
        text.setAttribute('value', textVal);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#f8fafc');
        text.setAttribute('scale', '0.1 0.1 0.1');
        text.setAttribute('position', '0 0 0.005');
        btn.appendChild(text);

        btn.addEventListener('mouseenter', () => {
            btn.setAttribute('material', 'color', hoverColor);
            btn.setAttribute('scale', '1.04 1.04 1');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        btn.addEventListener('mouseleave', () => {
            btn.setAttribute('material', 'color', '#1e293b');
            btn.setAttribute('scale', '1 1 1');
        });

        return btn;
    }
});
