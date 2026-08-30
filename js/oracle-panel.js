/**
 * oracle-panel.js — A-Frame Component for the AI Oracle Gadget
 * Premium floating UI panel for querying OpenCode AI about repository files.
 * Design: Clean, minimal, Apple/Google-inspired aesthetic.
 *
 * VR Features:
 *  - Voice input via Web Speech API (mic permission required)
 *  - Response pagination (scroll up/down) instead of truncation
 *  - Pulsing "thinking" animation
 *  - Haptic + sound feedback
 *  - Correct VR positioning via getWorldPosition/getWorldDirection
 *  - "Follow me" toggle to keep panel attached to headset
 *  - Expanded predefined questions (6 + voice button)
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
        this.isFollowing = false; // "Follow me" mode
        this.isListening = false; // Voice input active

        this.el.setAttribute('visible', this.isVisible);

        // ── Pagination state ──
        this._fullResponse = '';
        this._currentPage = 0;
        this._charsPerPage = 350;

        // Predefined questions
        this.questionsGlobal = [
            "Resumen del proyecto",
            "¿Cuál es la arquitectura?",
            "Buscar posibles bugs",
            "¿Por dónde empiezo?",
            "¿Qué tecnologías usa?",
            "Listar ficheros principales"
        ];
        this.questionsFile = [
            "Explica este fichero",
            "¿Qué dependencias tiene?",
            "Sugerir refactorización",
            "¿Qué hace cada función?",
            "Buscar problemas",
            "Volver a Global"
        ];

        // ── Speech Recognition setup ──
        this._setupSpeechRecognition();

        this._buildUI();
        this._bindEvents();
    },

    // ─────────────────────────────────────────────
    //  SPEECH RECOGNITION
    // ─────────────────────────────────────────────
    _setupSpeechRecognition: function () {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[Oracle] Speech Recognition not available in this browser');
            this.speechAvailable = false;
            return;
        }

        this.speechAvailable = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-ES';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('[Oracle] Voice input:', transcript);
            this._onVoiceStop();
            if (transcript.trim()) {
                this.askOracle(transcript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('[Oracle] Speech error:', event.error);
            this._onVoiceStop();
            if (event.error === 'not-allowed') {
                this._setResponse('⚠ Permiso de micrófono denegado.\nActiva el micrófono en los ajustes del navegador.', '#fbbf24');
            }
        };

        this.recognition.onend = () => {
            this._onVoiceStop();
        };
    },

    _startVoiceInput: function () {
        if (!this.speechAvailable || this.isThinking || this.isListening) return;

        this.isListening = true;

        // Visual feedback — mic button turns red
        if (this._micBtn) {
            this._micBtn.setAttribute('material', 'color', '#dc2626');
            this._micBtn.setAttribute('animation__mic', {
                property: 'scale',
                from: '1 1 1',
                to: '1.08 1.08 1',
                dur: 500,
                dir: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });
        }
        if (this._micLabel) {
            this._micLabel.setAttribute('value', '● Escuchando...');
            this._micLabel.setAttribute('color', '#fca5a5');
        }

        // Haptic + sound
        if (window.VRHaptics) VRHaptics.click('both');
        if (window.VRSounds) VRSounds.click();

        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[Oracle] Failed to start recognition:', e);
            this._onVoiceStop();
        }
    },

    _onVoiceStop: function () {
        this.isListening = false;
        if (this._micBtn) {
            this._micBtn.setAttribute('material', 'color', '#1e1b4b');
            this._micBtn.removeAttribute('animation__mic');
            this._micBtn.setAttribute('scale', '1 1 1');
        }
        if (this._micLabel) {
            this._micLabel.setAttribute('value', '🎤 Preguntar por voz');
            this._micLabel.setAttribute('color', '#a5b4fc');
        }
    },

    // ─────────────────────────────────────────────
    //  BUILD THE 3D UI
    // ─────────────────────────────────────────────
    _buildUI: function () {
        const W = 1.7;   // Panel width
        const H = 1.35;  // Panel height (taller for more questions + pagination)

        // ── Main Container ──
        this.container = document.createElement('a-entity');
        this.el.appendChild(this.container);

        // ── Background: dark frosted glass ──
        const bgPlane = document.createElement('a-plane');
        bgPlane.setAttribute('width', W);
        bgPlane.setAttribute('height', H);
        bgPlane.setAttribute('material', 'color: #0a0a0f; opacity: 0.92; transparent: true; side: double');
        this.container.appendChild(bgPlane);

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
        title.setAttribute('position', `${-W / 2 + 0.12} ${H / 2 - 0.09} 0.005`);
        title.setAttribute('align', 'left');
        title.setAttribute('color', '#e0e7ff');
        title.setAttribute('font', '/assets/fonts/custom-msdf.json');
        title.setAttribute('negate', false);
        title.setAttribute('scale', '0.35 0.35 0.35');
        this.container.appendChild(title);

        // ── Close Button (X) — top-right ──
        const closeBtn = document.createElement('a-plane');
        closeBtn.setAttribute('width', '0.12');
        closeBtn.setAttribute('height', '0.12');
        closeBtn.setAttribute('position', `${W / 2 - 0.1} ${H / 2 - 0.09} 0.005`);
        closeBtn.setAttribute('class', 'sh-hitbox');
        closeBtn.setAttribute('material', 'color: #1e1b4b; opacity: 0.6; transparent: true');
        const closeText = document.createElement('a-text');
        closeText.setAttribute('value', '✕');
        closeText.setAttribute('align', 'center');
        closeText.setAttribute('color', '#94a3b8');
        closeText.setAttribute('scale', '0.2 0.2 0.2');
        closeText.setAttribute('position', '0 0 0.003');
        closeBtn.appendChild(closeText);
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.setAttribute('material', 'color', '#ef4444');
            closeText.setAttribute('color', '#ffffff');
            if (window.VRHaptics) VRHaptics.tick();
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.setAttribute('material', 'color', '#1e1b4b');
            closeText.setAttribute('color', '#94a3b8');
        });
        closeBtn.addEventListener('click', () => {
            if (window.VRSounds) VRSounds.click();
            if (window.VRHaptics) VRHaptics.click();
            this.toggleVisibility();
        });
        this.container.appendChild(closeBtn);

        // ── Follow Me Toggle — next to close ──
        this._followBtn = document.createElement('a-plane');
        this._followBtn.setAttribute('width', '0.12');
        this._followBtn.setAttribute('height', '0.12');
        this._followBtn.setAttribute('position', `${W / 2 - 0.24} ${H / 2 - 0.09} 0.005`);
        this._followBtn.setAttribute('class', 'sh-hitbox');
        this._followBtn.setAttribute('material', 'color: #1e1b4b; opacity: 0.6; transparent: true');
        this._followLabel = document.createElement('a-text');
        this._followLabel.setAttribute('value', '📌');
        this._followLabel.setAttribute('align', 'center');
        this._followLabel.setAttribute('color', '#94a3b8');
        this._followLabel.setAttribute('scale', '0.18 0.18 0.18');
        this._followLabel.setAttribute('position', '0 0 0.003');
        this._followBtn.appendChild(this._followLabel);
        this._followBtn.addEventListener('mouseenter', () => {
            this._followBtn.setAttribute('material', 'color', '#312e81');
            if (window.VRHaptics) VRHaptics.tick();
        });
        this._followBtn.addEventListener('mouseleave', () => {
            this._followBtn.setAttribute('material', 'color', this.isFollowing ? '#4338ca' : '#1e1b4b');
        });
        this._followBtn.addEventListener('click', () => {
            this.isFollowing = !this.isFollowing;
            this._followBtn.setAttribute('material', 'color', this.isFollowing ? '#4338ca' : '#1e1b4b');
            this._followLabel.setAttribute('color', this.isFollowing ? '#e0e7ff' : '#94a3b8');
            if (window.VRSounds) VRSounds.click();
            if (window.VRHaptics) VRHaptics.click();
        });
        this.container.appendChild(this._followBtn);

        // ── Context pill (below title) ──
        this.contextPillBg = document.createElement('a-plane');
        this.contextPillBg.setAttribute('width', '0.5');
        this.contextPillBg.setAttribute('height', '0.05');
        this.contextPillBg.setAttribute('position', `0 ${H / 2 - 0.17} 0.004`);
        this.contextPillBg.setAttribute('material', 'color: #1e1b4b; opacity: 0.6; transparent: true');
        this.container.appendChild(this.contextPillBg);

        this.contextLabel = document.createElement('a-text');
        this.contextLabel.setAttribute('value', '● Global');
        this.contextLabel.setAttribute('position', `0 ${H / 2 - 0.17} 0.006`);
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
        sep1.setAttribute('position', `0 ${H / 2 - 0.22} 0.004`);
        sep1.setAttribute('material', 'color: #334155; opacity: 0.4; transparent: true');
        this.container.appendChild(sep1);

        // ── Response Area (center of panel) ──
        this.responseArea = document.createElement('a-text');
        this.responseArea.setAttribute('value', 'Selecciona una pregunta para comenzar.');
        this.responseArea.setAttribute('position', `${-W / 2 + 0.1} 0.18 0.005`);
        this.responseArea.setAttribute('align', 'left');
        this.responseArea.setAttribute('color', '#cbd5e1');
        this.responseArea.setAttribute('scale', '0.17 0.17 0.17');
        this.responseArea.setAttribute('width', (W - 0.2) / 0.17);
        this.responseArea.setAttribute('wrap-count', 72);
        this.responseArea.setAttribute('baseline', 'top');
        this.responseArea.setAttribute('anchor', 'left');
        this.responseArea.setAttribute('font', '/assets/fonts/custom-msdf.json');
        this.responseArea.setAttribute('negate', false);
        this.container.appendChild(this.responseArea);

        // ── Thinking indicator (hidden by default) ──
        this._thinkingDot = document.createElement('a-circle');
        this._thinkingDot.setAttribute('radius', '0.015');
        this._thinkingDot.setAttribute('position', `${W / 2 - 0.1} 0.18 0.005`);
        this._thinkingDot.setAttribute('material', 'color: #818cf8; opacity: 0; transparent: true');
        this._thinkingDot.setAttribute('visible', false);
        this.container.appendChild(this._thinkingDot);

        // ── Pagination buttons (▲ ▼) — right side of response area ──
        this._pageUpBtn = this._createSmallBtn('▲', W / 2 - 0.08, 0.08, () => this._pageUp());
        this._pageDownBtn = this._createSmallBtn('▼', W / 2 - 0.08, -0.06, () => this._pageDown());
        this.container.appendChild(this._pageUpBtn);
        this.container.appendChild(this._pageDownBtn);

        // ── Page indicator ──
        this._pageIndicator = document.createElement('a-text');
        this._pageIndicator.setAttribute('value', '');
        this._pageIndicator.setAttribute('position', `${W / 2 - 0.08} 0.01 0.005`);
        this._pageIndicator.setAttribute('align', 'center');
        this._pageIndicator.setAttribute('color', '#64748b');
        this._pageIndicator.setAttribute('scale', '0.12 0.12 0.12');
        this.container.appendChild(this._pageIndicator);

        // ── Separator line before buttons ──
        const sep2 = document.createElement('a-plane');
        sep2.setAttribute('width', W - 0.16);
        sep2.setAttribute('height', '0.001');
        sep2.setAttribute('position', `0 ${-H / 2 + 0.42} 0.004`);
        sep2.setAttribute('material', 'color: #334155; opacity: 0.4; transparent: true');
        this.container.appendChild(sep2);

        // ── Buttons Container (bottom of panel — 3 rows of 2) ──
        this.buttonsContainer = document.createElement('a-entity');
        this.buttonsContainer.setAttribute('position', `0 ${-H / 2 + 0.22} 0.005`);
        this.container.appendChild(this.buttonsContainer);

        this._renderButtons();
    },

    _createSmallBtn: function (label, x, y, onClick) {
        const btn = document.createElement('a-plane');
        btn.setAttribute('width', '0.1');
        btn.setAttribute('height', '0.08');
        btn.setAttribute('position', `${x} ${y} 0.005`);
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #1e1b4b; opacity: 0.7; transparent: true');

        const txt = document.createElement('a-text');
        txt.setAttribute('value', label);
        txt.setAttribute('align', 'center');
        txt.setAttribute('color', '#94a3b8');
        txt.setAttribute('scale', '0.18 0.18 0.18');
        txt.setAttribute('position', '0 0 0.003');
        btn.appendChild(txt);

        btn.addEventListener('mouseenter', () => {
            btn.setAttribute('material', 'color', '#312e81');
            if (window.VRHaptics) VRHaptics.tick();
        });
        btn.addEventListener('mouseleave', () => {
            btn.setAttribute('material', 'color', '#1e1b4b');
        });
        btn.addEventListener('click', () => {
            if (window.VRHaptics) VRHaptics.click();
            onClick();
        });

        return btn;
    },

    // ─────────────────────────────────────────────
    //  PAGINATION
    // ─────────────────────────────────────────────
    _getTotalPages: function () {
        if (!this._fullResponse) return 1;
        return Math.max(1, Math.ceil(this._fullResponse.length / this._charsPerPage));
    },

    _showPage: function (pageIndex) {
        const total = this._getTotalPages();
        this._currentPage = Math.max(0, Math.min(pageIndex, total - 1));

        const start = this._currentPage * this._charsPerPage;
        const end = start + this._charsPerPage;
        let pageText = this._fullResponse.substring(start, end);

        // Add ellipsis indicators
        if (this._currentPage > 0) pageText = '...' + pageText;
        if (end < this._fullResponse.length) pageText += '...';

        this.responseArea.setAttribute('value', pageText);

        // Update page indicator
        if (total > 1) {
            this._pageIndicator.setAttribute('value', `${this._currentPage + 1}/${total}`);
        } else {
            this._pageIndicator.setAttribute('value', '');
        }
    },

    _pageUp: function () {
        if (this._currentPage > 0) {
            this._showPage(this._currentPage - 1);
            if (window.VRSounds) VRSounds.hover();
        }
    },

    _pageDown: function () {
        if (this._currentPage < this._getTotalPages() - 1) {
            this._showPage(this._currentPage + 1);
            if (window.VRSounds) VRSounds.hover();
        }
    },

    _setResponse: function (text, color) {
        this._fullResponse = text;
        this._currentPage = 0;
        this.responseArea.setAttribute('color', color || '#e2e8f0');
        this._showPage(0);
    },

    // ─────────────────────────────────────────────
    //  RENDER QUESTION BUTTONS (3×2 Grid + Voice)
    // ─────────────────────────────────────────────
    _renderButtons: function () {
        while (this.buttonsContainer.firstChild) {
            this.buttonsContainer.removeChild(this.buttonsContainer.firstChild);
        }

        const questions = this.context.type === 'global' ? this.questionsGlobal : this.questionsFile;

        const btnW = 0.72;
        const btnH = 0.075;
        const gapX = 0.76;
        const gapY = 0.09;

        // 3 rows × 2 columns
        const positions = [
            { x: -gapX / 2, y: gapY },
            { x: gapX / 2, y: gapY },
            { x: -gapX / 2, y: 0 },
            { x: gapX / 2, y: 0 },
            { x: -gapX / 2, y: -gapY },
            { x: gapX / 2, y: -gapY }
        ];

        questions.forEach((qText, idx) => {
            if (idx >= positions.length) return;

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
            text.setAttribute('scale', '0.15 0.15 0.15');
            text.setAttribute('position', '0 0 0.003');
            text.setAttribute('font', '/assets/fonts/custom-msdf.json');
            text.setAttribute('negate', false);
            btn.appendChild(text);

            // Hover effects
            btn.addEventListener('mouseenter', () => {
                btn.setAttribute('material', 'color', hoverColor);
                btn.setAttribute('scale', '1.04 1.04 1');
                if (window.VRHaptics) VRHaptics.tick();
                if (window.VRSounds) VRSounds.hover();
            });
            btn.addEventListener('mouseleave', () => {
                btn.setAttribute('material', 'color', baseColor);
                btn.setAttribute('scale', '1 1 1');
            });

            // Click
            btn.addEventListener('click', () => {
                if (!this.isThinking) {
                    if (window.VRHaptics) VRHaptics.click();
                    if (window.VRSounds) VRSounds.click();

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

        // ── Voice Input Button (below the grid) ──
        if (this.speechAvailable) {
            this._micBtn = document.createElement('a-plane');
            this._micBtn.setAttribute('position', `0 ${-gapY - 0.09} 0`);
            this._micBtn.setAttribute('class', 'sh-hitbox');
            this._micBtn.setAttribute('width', btnW * 2 + 0.04);
            this._micBtn.setAttribute('height', btnH);
            this._micBtn.setAttribute('material', 'color: #1e1b4b; opacity: 0.85; transparent: true');

            this._micLabel = document.createElement('a-text');
            this._micLabel.setAttribute('value', '🎤 Preguntar por voz');
            this._micLabel.setAttribute('align', 'center');
            this._micLabel.setAttribute('color', '#a5b4fc');
            this._micLabel.setAttribute('scale', '0.15 0.15 0.15');
            this._micLabel.setAttribute('position', '0 0 0.003');
            this._micLabel.setAttribute('font', '/assets/fonts/custom-msdf.json');
            this._micLabel.setAttribute('negate', false);
            this._micBtn.appendChild(this._micLabel);

            this._micBtn.addEventListener('mouseenter', () => {
                if (!this.isListening) {
                    this._micBtn.setAttribute('material', 'color', '#312e81');
                }
                if (window.VRHaptics) VRHaptics.tick();
            });
            this._micBtn.addEventListener('mouseleave', () => {
                if (!this.isListening) {
                    this._micBtn.setAttribute('material', 'color', '#1e1b4b');
                }
            });
            this._micBtn.addEventListener('click', () => {
                if (this.isListening) {
                    // Stop listening
                    try { this.recognition.stop(); } catch (e) { /* silent */ }
                    this._onVoiceStop();
                } else {
                    this._startVoiceInput();
                }
            });

            this.buttonsContainer.appendChild(this._micBtn);
        }
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

        // Toggle visibility with VR controllers
        const toggle = () => this.toggleVisibility();
        
        const bindControllers = () => {
            const leftController = document.querySelector('#left-controller');
            const rightController = document.querySelector('#right-controller');
            
            // Y button on left controller toggles Oracle
            if (leftController) {
                leftController.addEventListener('ybuttondown', toggle);
            }
            // X button on left controller activates voice input
            if (leftController) {
                leftController.addEventListener('xbuttondown', () => {
                    if (this.isVisible) {
                        if (this.isListening) {
                            try { this.recognition.stop(); } catch (e) { /* silent */ }
                            this._onVoiceStop();
                        } else {
                            this._startVoiceInput();
                        }
                    }
                });
            }
        };

        if (this.el.sceneEl.hasLoaded) {
            bindControllers();
        } else {
            this.el.sceneEl.addEventListener('loaded', bindControllers);
        }
    },

    // ─────────────────────────────────────────────
    //  FOLLOW MODE (tick)
    // ─────────────────────────────────────────────
    tick: function () {
        if (!this.isVisible || !this.isFollowing) return;

        const cameraEl = document.querySelector('#player');
        if (!cameraEl || !AFRAME || !AFRAME.THREE) return;

        const THREE = AFRAME.THREE;
        const cam3D = cameraEl.object3D;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();

        cam3D.getWorldPosition(pos);
        cam3D.getWorldDirection(dir);

        // Position 1.5m in front of the headset
        const panelPos = pos.clone().add(dir.multiplyScalar(1.5));
        panelPos.y -= 0.1; // Slightly below eye level

        // Convert world position to local space of the rig
        this.el.parentEl.object3D.worldToLocal(panelPos);

        // Smooth lerp toward target position
        const current = this.el.object3D.position;
        current.lerp(panelPos, 0.08);

        // Face the user
        this.el.object3D.lookAt(pos);
    },

    // ─────────────────────────────────────────────
    //  TOGGLE VISIBILITY
    // ─────────────────────────────────────────────
    toggleVisibility: function () {
        this.isVisible = !this.isVisible;
        this.el.setAttribute('visible', this.isVisible);

        // Sound + haptic
        if (window.VRSounds) VRSounds.swoosh();
        if (window.VRHaptics) VRHaptics.click('both');

        // Show/hide HTML overlay input (only works on desktop, hidden by vr-mode-manager in VR)
        if (this._overlayEl) {
            if (this.isVisible) {
                this._overlayEl.classList.remove('hidden');
            } else {
                this._overlayEl.classList.add('hidden');
            }
        }

        if (this.isVisible) {
            // Position panel in front of the user using correct world transforms
            const cameraEl = document.querySelector('#player');
            if (cameraEl && AFRAME && AFRAME.THREE) {
                const THREE = AFRAME.THREE;
                const cam3D = cameraEl.object3D;
                const pos = new THREE.Vector3();
                const dir = new THREE.Vector3();

                cam3D.getWorldPosition(pos);
                cam3D.getWorldDirection(dir);

                // Place 1.5m in front of the camera
                const panelPos = pos.clone().add(dir.multiplyScalar(1.5));
                panelPos.y -= 0.1; // Slightly below eye level

                // Convert world position to local space of the rig
                this.el.parentEl.object3D.worldToLocal(panelPos);

                this.el.setAttribute('position', panelPos);
                this.el.object3D.lookAt(pos);
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
        } else {
            // Stop listening if we're closing the panel
            if (this.isListening) {
                try { this.recognition.stop(); } catch (e) { /* silent */ }
                this._onVoiceStop();
            }
        }
    },

    // ─────────────────────────────────────────────
    //  THINKING ANIMATION
    // ─────────────────────────────────────────────
    _startThinking: function () {
        this._thinkingDot.setAttribute('visible', true);
        this._thinkingDot.setAttribute('animation__pulse', {
            property: 'material.opacity',
            from: 0.3,
            to: 1.0,
            dur: 600,
            dir: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });
        if (window.VRHaptics) VRHaptics.thinking('both');
    },

    _stopThinking: function () {
        this._thinkingDot.setAttribute('visible', false);
        this._thinkingDot.removeAttribute('animation__pulse');
        this._thinkingDot.setAttribute('material', 'opacity', 0);
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

        return clean;
    },

    // ─────────────────────────────────────────────
    //  ASK THE ORACLE
    // ─────────────────────────────────────────────
    askOracle: async function (question) {
        if (!this.roomId) {
            this._setResponse('Error: No estás en una sala.', '#f87171');
            return;
        }

        this.isThinking = true;
        this._setResponse('Consultando al Oráculo...', '#94a3b8');
        this._startThinking();

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
                this._setResponse(answer, '#e2e8f0');
                // Success feedback
                if (window.VRHaptics) VRHaptics.success('both');
                if (window.VRSounds) VRSounds.success();
            } else {
                this._setResponse('Error: ' + (data.error || 'Fallo desconocido'), '#f87171');
                if (window.VRHaptics) VRHaptics.error('both');
                if (window.VRSounds) VRSounds.error();
            }
        } catch (err) {
            console.error('[Oracle] Fetch error:', err);
            this._setResponse('Error de conexión con el Oráculo.', '#f87171');
            if (window.VRHaptics) VRHaptics.error('both');
            if (window.VRSounds) VRSounds.error();
        } finally {
            this.isThinking = false;
            this._stopThinking();
        }
    }
});
