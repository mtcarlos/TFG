/**
 * vr-haptics.js — Centralized VR Haptic Feedback System
 * Provides reusable haptic patterns for all VR components.
 * Uses the WebXR Gamepad hapticActuators API.
 */

(function () {
    'use strict';

    const VRHaptics = {
        /**
         * Get active XR gamepads from tracked controllers.
         * @returns {{ left: Gamepad|null, right: Gamepad|null }}
         */
        _getGamepads() {
            const result = { left: null, right: null };

            const leftCtrl = document.querySelector('#left-controller');
            const rightCtrl = document.querySelector('#right-controller');

            if (leftCtrl) {
                const tc = leftCtrl.components['tracked-controls'] ||
                           leftCtrl.components['oculus-touch-controls'] ||
                           leftCtrl.components['laser-controls'];
                if (tc && tc.controller && tc.controller.gamepad) {
                    result.left = tc.controller.gamepad;
                }
            }

            if (rightCtrl) {
                const tc = rightCtrl.components['tracked-controls'] ||
                           rightCtrl.components['oculus-touch-controls'] ||
                           rightCtrl.components['laser-controls'];
                if (tc && tc.controller && tc.controller.gamepad) {
                    result.right = tc.controller.gamepad;
                }
            }

            return result;
        },

        /**
         * Send a single haptic pulse.
         * @param {'left'|'right'|'both'} hand
         * @param {number} intensity - 0.0 to 1.0
         * @param {number} duration - milliseconds
         */
        pulse(hand, intensity = 0.4, duration = 80) {
            const gamepads = this._getGamepads();
            const targets = hand === 'both'
                ? [gamepads.left, gamepads.right]
                : [gamepads[hand]];

            targets.forEach(gp => {
                if (!gp) return;
                // Standard Gamepad hapticActuators
                if (gp.hapticActuators && gp.hapticActuators.length > 0) {
                    gp.hapticActuators[0].pulse(intensity, duration);
                }
                // WebXR vibrationActuator (newer API)
                if (gp.vibrationActuator) {
                    gp.vibrationActuator.playEffect('dual-rumble', {
                        duration: duration,
                        strongMagnitude: intensity,
                        weakMagnitude: intensity * 0.5
                    }).catch(() => { /* silent */ });
                }
            });
        },

        /**
         * Success pattern — two quick soft pulses.
         * @param {'left'|'right'|'both'} hand
         */
        success(hand = 'both') {
            this.pulse(hand, 0.3, 50);
            setTimeout(() => this.pulse(hand, 0.5, 80), 100);
        },

        /**
         * Error pattern — one strong buzz.
         * @param {'left'|'right'|'both'} hand
         */
        error(hand = 'both') {
            this.pulse(hand, 0.8, 200);
        },

        /**
         * Tick pattern — ultra-short micro-pulse for hover/selection.
         * @param {'left'|'right'|'both'} hand
         */
        tick(hand = 'right') {
            this.pulse(hand, 0.15, 30);
        },

        /**
         * Click pattern — medium snap for button press.
         * @param {'left'|'right'|'both'} hand
         */
        click(hand = 'right') {
            this.pulse(hand, 0.4, 50);
        },

        /**
         * Thinking pattern — gentle repeating pulse (call once, runs 3 times).
         * @param {'left'|'right'|'both'} hand
         */
        thinking(hand = 'both') {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => this.pulse(hand, 0.15, 40), i * 250);
            }
        }
    };

    // ── Procedural UI Sounds ──
    const VRSounds = {
        _ctx: null,

        _getCtx() {
            if (!this._ctx) {
                this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return this._ctx;
        },

        /**
         * Resume AudioContext (must be called after user gesture).
         */
        resume() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
        },

        /**
         * Soft "pop" for button click.
         */
        click() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        },

        /**
         * Rising chime for success / response received.
         */
        success() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        },

        /**
         * Low buzz for error.
         */
        error() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        },

        /**
         * Soft swoosh for panel open/close.
         */
        swoosh() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        },

        /**
         * Soft tick for hover.
         */
        hover() {
            const ctx = this._getCtx();
            if (ctx.state === 'suspended') return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        }
    };

    // Expose globally
    window.VRHaptics = VRHaptics;
    window.VRSounds = VRSounds;

})();
