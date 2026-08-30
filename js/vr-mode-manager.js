/**
 * vr-mode-manager.js — A-Frame Component for VR Mode Transitions
 * Handles enter-vr / exit-vr events, hides HTML overlays,
 * and emits a global 'vr-mode-changed' event for other components.
 * 
 * Only for the GitHub Scene.
 */

AFRAME.registerComponent('vr-mode-manager', {
    init: function () {
        this.isVR = false;

        // Collect all HTML overlays that should be hidden in VR
        this._overlayIds = [
            'loading-overlay',
            'repo-hud',
            'hud-toolbar',
            'data-dashboard',
            'file-search-panel',
            'oracle-input-overlay',
            'badge-bar'
        ];

        // Store original display values so we can restore them on exit
        this._originalDisplay = {};

        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
        this.el.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));

        // Resume AudioContext on first VR entry (user gesture)
        this._audioResumed = false;
    },

    onEnterVR: function () {
        this.isVR = true;

        // Hide all HTML overlays
        this._overlayIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                this._originalDisplay[id] = el.style.display;
                el.style.display = 'none';
            }
        });

        // Also hide any elements with class 'desktop-only'
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.dataset.vrHiddenDisplay = el.style.display;
            el.style.display = 'none';
        });

        // Resume AudioContext for procedural sounds
        if (!this._audioResumed && window.VRSounds) {
            window.VRSounds.resume();
            this._audioResumed = true;
        }

        // Emit global event
        document.dispatchEvent(new CustomEvent('vr-mode-changed', {
            detail: { isVR: true }
        }));

        console.log('[VRModeManager] Entered VR — overlays hidden');
    },

    onExitVR: function () {
        this.isVR = false;

        // Restore HTML overlays
        this._overlayIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Restore to original or remove inline display override
                if (this._originalDisplay[id] !== undefined && this._originalDisplay[id] !== 'none') {
                    el.style.display = this._originalDisplay[id];
                } else {
                    el.style.removeProperty('display');
                }
            }
        });

        // Restore desktop-only elements
        document.querySelectorAll('.desktop-only').forEach(el => {
            if (el.dataset.vrHiddenDisplay !== undefined) {
                el.style.display = el.dataset.vrHiddenDisplay;
                delete el.dataset.vrHiddenDisplay;
            } else {
                el.style.removeProperty('display');
            }
        });

        // Emit global event
        document.dispatchEvent(new CustomEvent('vr-mode-changed', {
            detail: { isVR: false }
        }));

        console.log('[VRModeManager] Exited VR — overlays restored');
    }
});
