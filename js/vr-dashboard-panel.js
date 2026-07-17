/**
 * vr-dashboard-panel.js — A-Frame Component for the VR Dashboard Gadget
 * A floating UI panel for toggling X-Ray and using the Time Machine in VR.
 */

AFRAME.registerComponent('vr-dashboard-panel', {
    schema: {
        roomId: { type: 'string', default: '' }
    },

    init: function () {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = this.data.roomId || urlParams.get('room');

        this.isVisible = false;
        this.el.setAttribute('visible', this.isVisible);

        this.commits = [];

        this._buildUI();
        this._fetchCommits();
        this._bindEvents();
    },

    // ─────────────────────────────────────────────
    //  BUILD THE 3D UI
    // ─────────────────────────────────────────────
    _buildUI: function () {
        const W = 1.2;
        const H = 0.8;

        this.container = document.createElement('a-entity');
        this.el.appendChild(this.container);

        // Background
        const bg = document.createElement('a-plane');
        bg.setAttribute('width', W);
        bg.setAttribute('height', H);
        bg.setAttribute('material', 'color: #0f172a; opacity: 0.95; transparent: true; side: double');
        this.container.appendChild(bg);

        // Title
        const title = document.createElement('a-text');
        title.setAttribute('value', 'VR Dashboard');
        title.setAttribute('position', `0 ${H / 2 - 0.1} 0.01`);
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#e2e8f0');
        title.setAttribute('scale', '0.2 0.2 0.2');
        this.container.appendChild(title);

        // ── X-RAY TOGGLE ──
        this.xrayBtn = this._createButton('Toggle X-Ray', 0, 0.1, '#ef4444', 0.8, 0.1);
        this.xrayBtn.addEventListener('click', () => {
            if (window.CodeCity) {
                const isXRay = window.CodeCity.toggleXRayMode();
                this.xrayBtn.querySelector('a-text').setAttribute('value', isXRay ? 'X-Ray: ON' : 'X-Ray: OFF');
                this.xrayBtn.setAttribute('material', 'color', isXRay ? '#dc2626' : '#334155');
            }
        });
        this.container.appendChild(this.xrayBtn);

        // ── TIME MACHINE SECTION ──
        const tmTitle = document.createElement('a-text');
        tmTitle.setAttribute('value', 'Time Machine');
        tmTitle.setAttribute('position', `0 -0.05 0.01`);
        tmTitle.setAttribute('align', 'center');
        tmTitle.setAttribute('color', '#94a3b8');
        tmTitle.setAttribute('scale', '0.15 0.15 0.15');
        this.container.appendChild(tmTitle);

        this.commitLabel = document.createElement('a-text');
        this.commitLabel.setAttribute('value', 'Cargando historia...');
        this.commitLabel.setAttribute('position', `0 -0.15 0.01`);
        this.commitLabel.setAttribute('align', 'center');
        this.commitLabel.setAttribute('color', '#cbd5e1');
        this.commitLabel.setAttribute('scale', '0.1 0.1 0.1');
        this.commitLabel.setAttribute('width', '10'); // Fixes wrap issues
        this.container.appendChild(this.commitLabel);

        this.btnPrev = this._createButton('< Prev', -0.3, -0.25, '#3b82f6', 0.3, 0.08);
        this.btnNext = this._createButton('Next >', 0.3, -0.25, '#3b82f6', 0.3, 0.08);
        this.btnGo = this._createButton('Time Travel', 0, -0.25, '#10b981', 0.25, 0.08);

        this.container.appendChild(this.btnPrev);
        this.container.appendChild(this.btnNext);
        this.container.appendChild(this.btnGo);

        this.currentCommitIndex = 0;

        this.btnPrev.addEventListener('click', () => {
            if (this.currentCommitIndex < this.commits.length - 1) {
                this.currentCommitIndex++;
                this._updateCommitLabel();
            }
        });

        this.btnNext.addEventListener('click', () => {
            if (this.currentCommitIndex > 0) {
                this.currentCommitIndex--;
                this._updateCommitLabel();
            }
        });

        this.btnGo.addEventListener('click', () => {
            if (this.commits.length > 0) {
                const commit = this.commits[this.currentCommitIndex];
                this._timeTravel(commit.hash);
            }
        });
    },

    _createButton: function(textVal, x, y, hoverColor, w, h) {
        const btn = document.createElement('a-plane');
        btn.setAttribute('width', w);
        btn.setAttribute('height', h);
        btn.setAttribute('position', `${x} ${y} 0.01`);
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #334155; opacity: 0.9');

        const text = document.createElement('a-text');
        text.setAttribute('value', textVal);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#f8fafc');
        text.setAttribute('scale', '0.12 0.12 0.12');
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
    },

    _updateCommitLabel: function() {
        if (this.commits.length === 0) {
            this.commitLabel.setAttribute('value', 'No hay commits disponibles');
            return;
        }
        const commit = this.commits[this.currentCommitIndex];
        const msg = commit.message.length > 40 ? commit.message.substring(0, 37) + '...' : commit.message;
        this.commitLabel.setAttribute('value', `${commit.date}\n${msg}`);
    },

    _fetchCommits: async function() {
        if (!this.roomId) return;
        try {
            const res = await fetch(`/api/rooms/${this.roomId}/commits`);
            const data = await res.json();
            if (data.commits && data.commits.length > 0) {
                this.commits = data.commits;
                this.currentCommitIndex = 0;
                this._updateCommitLabel();
            } else {
                this.commitLabel.setAttribute('value', 'No history');
            }
        } catch (err) {
            console.error('[VRDashboard] Failed to fetch commits', err);
            this.commitLabel.setAttribute('value', 'Error loading history');
        }
    },

    _timeTravel: async function(sha) {
        this.btnGo.querySelector('a-text').setAttribute('value', '...');
        try {
            const postRes = await fetch(`/api/rooms/${this.roomId}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commitSha: sha })
            });

            if (!postRes.ok) throw new Error('Checkout failed');
            const postData = await postRes.json();
            
            if (postData.success && postData.layout && window.CodeCity) {
                const container = document.getElementById('code-city');
                if (container) container.innerHTML = '';
                
                window.CodeCity.layout = postData.layout;
                window.CodeCity._renderCity();
                window.CodeCity._updateRaycasters();
                
                if (window.CodeCity.isXRayMode) {
                    window.CodeCity.isXRayMode = false;
                    window.CodeCity.toggleXRayMode();
                }
            }
        } catch (err) {
            console.error('[VRDashboard] Time Travel error:', err);
        } finally {
            this.btnGo.querySelector('a-text').setAttribute('value', 'Time Travel');
        }
    },

    _bindEvents: function () {
        // Toggle visibility with VR controllers (Grip or Trigger)
        const toggle = () => this.toggleVisibility();
        
        const bindControllers = () => {
            const leftController = document.querySelector('#left-controller');
            
            if (leftController) {
                // We'll map the Grip button on the left controller to open the dashboard as requested
                leftController.addEventListener('gripdown', toggle);
            }
        };

        if (this.el.sceneEl.hasLoaded) {
            bindControllers();
        } else {
            this.el.sceneEl.addEventListener('loaded', bindControllers);
        }
    },

    toggleVisibility: function () {
        this.isVisible = !this.isVisible;
        this.el.setAttribute('visible', this.isVisible);

        if (this.isVisible) {
            const cameraEl = document.querySelector('#player');
            if (cameraEl && AFRAME && AFRAME.THREE) {
                const cam3D = cameraEl.object3D;
                const pos = new AFRAME.THREE.Vector3();
                const dir = new AFRAME.THREE.Vector3();

                cam3D.getWorldPosition(pos);
                cam3D.getWorldDirection(dir);

                // Spawn the panel 1.5m in front of the user
                const panelPos = pos.clone().add(dir.multiplyScalar(1.5));
                panelPos.y += 0.2; // Slightly above eye level
                this.el.setAttribute('position', panelPos);
                this.el.object3D.lookAt(pos);
            }
        }
    }
});
