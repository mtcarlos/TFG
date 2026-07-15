/**
 * oracle-panel.js — A-Frame Component for the AI Oracle Gadget
 * Premium floating UI panel for querying OpenCode AI about repository files.
 * Design: Clean, minimal, Apple/Google-inspired aesthetic.
 */

AFRAME.registerComponent('oracle-panel', {
    schema: {
        roomId: { type: 'string', default: '' }
    },

    init: function () {
        this.context = {
            type: 'global',
            filePath: null,
            fileName: null
        };

        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = this.data.roomId || urlParams.get('room');

        this.isVisible = false;
        this.isThinking = false;

        this.el.setAttribute('visible', this.isVisible);

        // Predefined questions
        this.questionsGlobal = [
            "Resumen del proyecto",
            "¿Cuál es la arquitectura?",
            "Buscar posibles bugs",
            "¿Por dónde empiezo?"
        ];
        this.questionsFile = [
            "Explica este fichero",
            "¿Qué dependencias tiene?",
            "Sugerir refactorización",
            "Volver a Global"
        ];

        this._buildUI();
        this._bindEvents();
    },

    // ─────────────────────────────────────────────
    //  BUILD THE 3D UI
    // ─────────────────────────────────────────────
    _buildUI: function () {
        const W = 1.6;   // Panel width
        const H = 1.1;   // Panel height

        // ── Main Container ──
        this.container = document.createElement('a-entity');
        this.el.appendChild(this.container);

        // ── Background: dark frosted glass ──
        const bg = document.createElement('a-rounded');
        // Fallback to a-plane if a-rounded is not registered
        if (!AFRAME.components['rounded']) {
            const bgPlane = document.createElement('a-plane');
            bgPlane.setAttribute('width', W);
            bgPlane.setAttribute('height', H);
            bgPlane.setAttribute('material', 'color: #0a0a0f; opacity: 0.92; transparent: true; side: double');
            this.container.appendChild(bgPlane);
        } else {
            bg.setAttribute('width', W);
            bg.setAttribute('height', H);
            bg.setAttribute('radius', '0.03');
            bg.setAttribute('material', 'color: #0a0a0f; opacity: 0.92; transparent: true; side: double');
            this.container.appendChild(bg);
        }

        // ── Subtle border glow ──
        const borderPlane = document.createElement('a-plane');
        borderPlane.setAttribute('width', W + 0.02);
        borderPlane.setAttribute('height', H + 0.02);
        borderPlane.setAttribute('position', '0 0 -0.003');
        borderPlane.setAttribute('material', 'color: #6366f1; opacity: 0.15; transparent: true; side: double');
        this.container.appendChild(borderPlane);

        // ── Top accent line ──
        const accentLine = document.createElement('a-plane');
        accentLine.setAttribute('width', W * 0.4);
        accentLine.setAttribute('height', '0.004');
        accentLine.setAttribute('position', `0 ${H / 2 - 0.04} 0.002`);
        accentLine.setAttribute('material', 'color: #818cf8; opacity: 0.7; transparent: true');
        this.container.appendChild(accentLine);

        // ── Title: "Oráculo" ──
        const title = document.createElement('a-text');
        title.setAttribute('value', 'Oráculo');
        title.setAttribute('position', `0 ${H / 2 - 0.09} 0.005`);
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#e0e7ff');
        title.setAttribute('font', '/assets/fonts/custom-msdf.json');
        title.setAttribute('negate', false);
        title.setAttribute('scale', '0.35 0.35 0.35');
        this.container.appendChild(title);

        // ── Context pill (below title) ──
        this.contextPillBg = document.createElement('a-plane');
        this.contextPillBg.setAttribute('width', '0.5');
        this.contextPillBg.setAttribute('height', '0.05');
        this.contextPillBg.setAttribute('position', `0 ${H / 2 - 0.15} 0.004`);
        this.contextPillBg.setAttribute('material', 'color: #1e1b4b; opacity: 0.6; transparent: true');
        this.container.appendChild(this.contextPillBg);

        this.contextLabel = document.createElement('a-text');
        this.contextLabel.setAttribute('value', '● Global');
        this.contextLabel.setAttribute('position', `0 ${H / 2 - 0.15} 0.006`);
        this.contextLabel.setAttribute('align', 'center');
        this.contextLabel.setAttribute('color', '#34d399');
        this.contextLabel.setAttribute('scale', '0.18 0.18 0.18');
        this.contextLabel.setAttribute('font', '/assets/fonts/custom-msdf.json');
        this.contextLabel.setAttribute('negate', false);
        this.container.appendChild(this.contextLabel);

        // ── Separator line ──
        const sep1 = document.createElement('a-plane');
        sep1.setAttribute('width', W - 0.16);
        sep1.setAttribute('height', '0.001');
        sep1.setAttribute('position', `0 ${H / 2 - 0.2} 0.004`);
        sep1.setAttribute('material', 'color: #334155; opacity: 0.4; transparent: true');
        this.container.appendChild(sep1);

        // ── Response Area (center of panel) ──
        this.responseArea = document.createElement('a-text');
        this.responseArea.setAttribute('value', 'Selecciona una pregunta para comenzar.');
        this.responseArea.setAttribute('position', `${-W / 2 + 0.1} 0.07 0.005`);
        this.responseArea.setAttribute('align', 'left');
        this.responseArea.setAttribute('color', '#cbd5e1');
        this.responseArea.setAttribute('scale', '0.18 0.18 0.18');
        this.responseArea.setAttribute('width', (W - 0.2) / 0.18);
        this.responseArea.setAttribute('wrap-count', 70);
        this.responseArea.setAttribute('baseline', 'top');
        this.responseArea.setAttribute('anchor', 'left');
        this.responseArea.setAttribute('font', '/assets/fonts/custom-msdf.json');
        this.responseArea.setAttribute('negate', false);
        this.container.appendChild(this.responseArea);

        // ── Separator line before buttons ──
        const sep2 = document.createElement('a-plane');
        sep2.setAttribute('width', W - 0.16);
        sep2.setAttribute('height', '0.001');
        sep2.setAttribute('position', `0 ${-H / 2 + 0.28} 0.004`);
        sep2.setAttribute('material', 'color: #334155; opacity: 0.4; transparent: true');
        this.container.appendChild(sep2);

        // ── Buttons Container (bottom of panel) ──
        this.buttonsContainer = document.createElement('a-entity');
        this.buttonsContainer.setAttribute('position', `0 ${-H / 2 + 0.14} 0.005`);
        this.container.appendChild(this.buttonsContainer);

        this._renderButtons();
    },

    // ─────────────────────────────────────────────
    //  RENDER QUESTION BUTTONS (2×2 Grid)
    // ─────────────────────────────────────────────
    _renderButtons: function () {
        while (this.buttonsContainer.firstChild) {
            this.buttonsContainer.removeChild(this.buttonsContainer.firstChild);
        }

        const questions = this.context.type === 'global' ? this.questionsGlobal : this.questionsFile;

        const btnW = 0.68;
        const btnH = 0.08;
        const gapX = 0.72;
        const gapY = 0.1;

        const positions = [
            { x: -gapX / 2, y: gapY / 2 },
            { x: gapX / 2, y: gapY / 2 },
            { x: -gapX / 2, y: -gapY / 2 },
            { x: gapX / 2, y: -gapY / 2 }
        ];

        questions.forEach((qText, idx) => {
            // Determine button style
            const isBack = qText === 'Volver a Global';
            const baseColor = isBack ? '#1e1b4b' : '#312e81';
            const hoverColor = isBack ? '#312e81' : '#4338ca';
            const textColor = isBack ? '#a5b4fc' : '#e0e7ff';

            const btn = document.createElement('a-plane');
            btn.setAttribute('position', `${positions[idx].x} ${positions[idx].y} 0`);
            btn.setAttribute('class', 'sh-hitbox');
            btn.setAttribute('width', btnW);
            btn.setAttribute('height', btnH);
            btn.setAttribute('material', `color: ${baseColor}; opacity: 0.85; transparent: true`);

            const text = document.createElement('a-text');
            text.setAttribute('value', qText);
            text.setAttribute('align', 'center');
            text.setAttribute('color', textColor);
            text.setAttribute('scale', '0.16 0.16 0.16');
            text.setAttribute('position', '0 0 0.003');
            text.setAttribute('font', '/assets/fonts/custom-msdf.json');
            text.setAttribute('negate', false);
            btn.appendChild(text);

            // Hover effects
            btn.addEventListener('mouseenter', () => {
                btn.setAttribute('material', 'color', hoverColor);
                btn.setAttribute('scale', '1.04 1.04 1');
            });
            btn.addEventListener('mouseleave', () => {
                btn.setAttribute('material', 'color', baseColor);
                btn.setAttribute('scale', '1 1 1');
            });

            // Click
            btn.addEventListener('click', () => {
                if (!this.isThinking) {
                    if (isBack) {
                        this.context = { type: 'global', filePath: null, fileName: null };
                        this.contextLabel.setAttribute('value', '● Global');
                        this.contextLabel.setAttribute('color', '#34d399');
                        this.contextPillBg.setAttribute('material', 'color', '#1e1b4b');
                        this._renderButtons();
                        // Reset HTML overlay context hint
                        if (this._contextHint) {
                            this._contextHint.textContent = 'Global';
                            this._contextHint.style.color = '#34d399';
                        }
                    } else {
                        this.askOracle(qText);
                    }
                }
            });

            this.buttonsContainer.appendChild(btn);
        });
    },

    // ─────────────────────────────────────────────
    //  BIND EVENTS
    // ─────────────────────────────────────────────
    _bindEvents: function () {
        // ── HTML overlay input references ──
        this._overlayEl = document.getElementById('oracle-input-overlay');
        this._freeInput = document.getElementById('oracle-free-input');
        this._sendBtn = document.getElementById('oracle-send-btn');
        this._contextHint = document.getElementById('oracle-input-context');

        // ── Wire up free-text input ──
        if (this._freeInput) {
            this._freeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const q = this._freeInput.value.trim();
                    if (q && !this.isThinking) {
                        this.askOracle(q);
                        this._freeInput.value = '';
                    }
                }
                // Prevent Escape from also toggling the oracle off
                if (e.key === 'Escape') {
                    this._freeInput.blur();
                    e.stopPropagation();
                }
            });
        }
        if (this._sendBtn) {
            this._sendBtn.addEventListener('click', () => {
                const q = this._freeInput ? this._freeInput.value.trim() : '';
                if (q && !this.isThinking) {
                    this.askOracle(q);
                    this._freeInput.value = '';
                }
            });
        }

        // Listen for Code City building selection
        document.addEventListener('building-selected', (e) => {
            const data = e.detail;
            this.context = {
                type: 'file',
                filePath: data.filePath,
                fileName: data.fileName
            };

            // Truncate long file names
            const displayName = data.fileName.length > 30 ? data.fileName.substring(0, 27) + '...' : data.fileName;
            this.contextLabel.setAttribute('value', `◆ ${displayName}`);
            this.contextLabel.setAttribute('color', '#fbbf24');
            this.contextPillBg.setAttribute('material', 'color', '#422006');
            this._renderButtons();

            // Update HTML overlay context hint
            if (this._contextHint) {
                this._contextHint.textContent = displayName;
                this._contextHint.style.color = '#fbbf24';
            }

            if (!this.isVisible) this.toggleVisibility();
        });

        // Toggle visibility with 'O' key on keyboard (skip if typing in an input)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'o' || e.key === 'O') {
                this.toggleVisibility();
            }
        });

        // Toggle visibility with VR controllers (A, B, X, Y buttons)
        const toggle = () => this.toggleVisibility();
        
        const bindControllers = () => {
            const leftController = document.querySelector('#left-controller');
            const rightController = document.querySelector('#right-controller');
            
            if (leftController) {
                leftController.addEventListener('xbuttondown', toggle);
                leftController.addEventListener('ybuttondown', toggle);
            }
            if (rightController) {
                rightController.addEventListener('abuttondown', toggle);
                rightController.addEventListener('bbuttondown', toggle);
            }
        };

        if (this.el.sceneEl.hasLoaded) {
            bindControllers();
        } else {
            this.el.sceneEl.addEventListener('loaded', bindControllers);
        }
    },

    // ─────────────────────────────────────────────
    //  TOGGLE VISIBILITY
    // ─────────────────────────────────────────────
    toggleVisibility: function () {
        this.isVisible = !this.isVisible;
        this.el.setAttribute('visible', this.isVisible);

        // Show/hide HTML overlay input
        if (this._overlayEl) {
            if (this.isVisible) {
                this._overlayEl.classList.remove('hidden');
            } else {
                this._overlayEl.classList.add('hidden');
            }
        }

        if (this.isVisible) {
            const cameraEl = document.querySelector('#player');
            if (cameraEl && AFRAME && AFRAME.THREE) {
                const THREE = AFRAME.THREE;
                const camPos = cameraEl.object3D.position;
                const camRot = cameraEl.object3D.rotation;

                const forward = new THREE.Vector3(0, 0, -1.5);
                const euler = new THREE.Euler(0, camRot.y, 0, 'YXZ');
                forward.applyEuler(euler);

                this.el.setAttribute('position', {
                    x: camPos.x + forward.x,
                    y: camPos.y - 0.1,
                    z: camPos.z + forward.z
                });
                this.el.setAttribute('rotation', { x: 0, y: THREE.MathUtils.radToDeg(camRot.y), z: 0 });
            }

            this.el.setAttribute('animation__pop', {
                property: 'scale',
                from: '0.5 0.5 0.5',
                to: '1 1 1',
                dur: 250,
                easing: 'easeOutCubic'
            });

            // Update context hint on the HTML overlay
            if (this._contextHint) {
                if (this.context.type === 'file' && this.context.fileName) {
                    const displayName = this.context.fileName.length > 30
                        ? this.context.fileName.substring(0, 27) + '...'
                        : this.context.fileName;
                    this._contextHint.textContent = displayName;
                    this._contextHint.style.color = '#fbbf24';
                } else {
                    this._contextHint.textContent = 'Global';
                    this._contextHint.style.color = '#34d399';
                }
            }
        }
    },

    // ─────────────────────────────────────────────
    //  CLEAN RESPONSE TEXT
    // ─────────────────────────────────────────────
    _cleanResponse: function (text) {
        // Strip markdown formatting
        let clean = text
            .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
            .replace(/\*(.+?)\*/g, '$1')          // *italic*
            .replace(/__(.+?)__/g, '$1')          // __underline__
            .replace(/_(.+?)_/g, '$1')            // _italic_
            .replace(/`{3}[\s\S]*?`{3}/g, '')     // ```code blocks```
            .replace(/`(.+?)`/g, '$1')            // `inline code`
            .replace(/^#{1,6}\s+/gm, '')          // # headings
            .replace(/^[-*+]\s+/gm, '• ')         // bullet lists
            .replace(/^\d+\.\s+/gm, '• ')         // numbered lists → bullets
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [links](url)
            .replace(/\n{3,}/g, '\n\n')           // collapse multiple newlines
            .trim();

        // Truncate for readability in VR (max ~400 chars)
        if (clean.length > 400) {
            clean = clean.substring(0, 397) + '...';
        }

        return clean;
    },

    // ─────────────────────────────────────────────
    //  ASK THE ORACLE
    // ─────────────────────────────────────────────
    askOracle: async function (question) {
        if (!this.roomId) {
            this.responseArea.setAttribute('value', 'Error: No estás en una sala.');
            return;
        }

        this.isThinking = true;
        this.responseArea.setAttribute('value', 'Consultando al Oráculo...');
        this.responseArea.setAttribute('color', '#94a3b8');

        const payload = {
            question: question,
            filePath: this.context.type === 'file' ? this.context.filePath : null
        };

        try {
            const res = await fetch(`/api/rooms/${this.roomId}/oracle/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                const answer = this._cleanResponse(data.answer || '');
                this.responseArea.setAttribute('value', answer);
                this.responseArea.setAttribute('color', '#e2e8f0');
            } else {
                this.responseArea.setAttribute('value', 'Error: ' + (data.error || 'Fallo desconocido'));
                this.responseArea.setAttribute('color', '#f87171');
            }
        } catch (err) {
            console.error('[Oracle] Fetch error:', err);
            this.responseArea.setAttribute('value', 'Error de conexión con el Oráculo.');
            this.responseArea.setAttribute('color', '#f87171');
        } finally {
            this.isThinking = false;
        }
    }
});
