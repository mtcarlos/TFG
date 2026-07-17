/**
 * vr-wrist-menu.js — A-Frame Component for the VR Wrist Menu
 * Attaches to the left controller and displays a quick-access menu
 * for toggling the Dashboard and Oracle.
 */

AFRAME.registerComponent('vr-wrist-menu', {
    init: function () {
        this.isVisible = true;

        // Container attached to the controller
        // Positioned slightly above and tilted towards the user
        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', '0 0.15 0.05');
        this.container.setAttribute('rotation', '-45 0 0');
        this.el.appendChild(this.container);

        // Background
        const bg = document.createElement('a-plane');
        bg.setAttribute('width', '0.4');
        bg.setAttribute('height', '0.25');
        bg.setAttribute('material', 'color: #1e293b; opacity: 0.9; transparent: true');
        this.container.appendChild(bg);

        // Title
        const title = document.createElement('a-text');
        title.setAttribute('value', 'VR Tools');
        title.setAttribute('position', '0 0.08 0.01');
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#38bdf8');
        title.setAttribute('scale', '0.12 0.12 0.12');
        this.container.appendChild(title);

        // Button 1: Toggle Dashboard
        this.btnDash = this._createButton('Dashboard', '0', '0.01', '#10b981');
        this.btnDash.addEventListener('click', () => {
            const dash = document.querySelector('[vr-dashboard-panel]');
            if (dash) {
                dash.components['vr-dashboard-panel'].toggleVisibility();
            }
        });
        this.container.appendChild(this.btnDash);

        // Button 2: Toggle Oracle
        this.btnOracle = this._createButton('Oraculo', '0', '-0.06', '#8b5cf6');
        this.btnOracle.addEventListener('click', () => {
            const oracle = document.querySelector('[oracle-panel]');
            if (oracle) {
                oracle.components['oracle-panel'].toggleVisibility();
            }
        });
        this.container.appendChild(this.btnOracle);
    },

    _createButton: function(textVal, x, y, hoverColor) {
        const btn = document.createElement('a-plane');
        btn.setAttribute('width', '0.32');
        btn.setAttribute('height', '0.05');
        btn.setAttribute('position', `${x} ${y} 0.01`);
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #334155; opacity: 0.9');

        const text = document.createElement('a-text');
        text.setAttribute('value', textVal);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#f8fafc');
        text.setAttribute('scale', '0.09 0.09 0.09');
        text.setAttribute('position', '0 0 0.01');
        btn.appendChild(text);

        btn.addEventListener('mouseenter', () => {
            btn.setAttribute('material', 'color', hoverColor);
            btn.setAttribute('scale', '1.05 1.05 1');
        });
        btn.addEventListener('mouseleave', () => {
            btn.setAttribute('material', 'color', '#334155');
            btn.setAttribute('scale', '1 1 1');
        });

        return btn;
    }
});
