/**
 * babia-scene.js
 * Logic for the BabiaXR data visualization world.
 * Premium Apple Keynote aesthetic + Superhands VR Interactivity.
 *
 * Handles: dataset panel, preset dock, username, clock display,
 *          metric cards, session timer, VR locomotion, superhands
 *          interaction feedback, NAF chart sync, pointer sync.
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // SESSION START TIME
    // ─────────────────────────────────────────────
    const SESSION_START = Date.now();

    // ─────────────────────────────────────────────
    // NAF SCHEMA REGISTRATION
    // ─────────────────────────────────────────────
    NAF.schemas.getComponentsOriginal = NAF.schemas.getComponentsOriginal || NAF.schemas.getComponents;
    NAF.schemas.getComponents = (template) => {
        if (!NAF.schemas.hasTemplate('#avatar-template')) {
            NAF.schemas.add({
                template: '#avatar-template',
                components: [
                    {
                        component: 'position',
                        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.001)
                    },
                    {
                        component: 'rotation',
                        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.5)
                    },
                    {
                        selector: '.player-cam',
                        component: 'position',
                        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.001)
                    },
                    {
                        selector: '.player-cam',
                        component: 'rotation',
                        requiresNetworkUpdate: NAF.utils.vectorRequiresUpdate(0.5)
                    },
                    {
                        selector: '.head',
                        component: 'material',
                        property: 'color'
                    },
                    {
                        selector: '.nametag',
                        component: 'text',
                        property: 'value'
                    }
                ]
            });
        }
        const components = NAF.schemas.getComponentsOriginal(template);
        return components;
    };

    // ─────────────────────────────────────────────
    // DOM REFERENCES
    // ─────────────────────────────────────────────
    const datasetPanel = document.getElementById('dataset-panel');
    const datasetTitle = document.getElementById('dataset-title');
    const datasetDesc  = document.getElementById('dataset-desc');
    const badgeTime    = document.getElementById('badge-time');
    const badgeDate    = document.getElementById('badge-date');
    const badgeSession = document.getElementById('badge-session');

    // ─────────────────────────────────────────────
    // PRESET DEFINITIONS
    // ─────────────────────────────────────────────
    const PRESETS = {
        sales: {
            title: 'Quarterly Sales Overview',
            description: 'Comparative sales data by department across Q1–Q4. Walk around the 3D bar chart to compare performance from every angle.'
        },
        attendance: {
            title: 'Meeting Attendance Report',
            description: 'Distribution of attendees across different event types. The pie chart shows relative proportions at a glance.'
        },
        kpis: {
            title: 'Monthly Revenue KPIs',
            description: 'Monthly revenue figures for the current fiscal year. The bar chart highlights seasonal trends and growth patterns.'
        }
    };

    let currentPreset = 'sales';

    // ─────────────────────────────────────────────
    // USERNAME FROM URL
    // ─────────────────────────────────────────────
    function getUsernameFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('username') || 'Anonymous';
    }

    // ─────────────────────────────────────────────
    // PRESET SWITCHING WITH TRANSITION
    // ─────────────────────────────────────────────
    function updatePreset(presetKey) {
        if (!PRESETS[presetKey] || presetKey === currentPreset) return;
        currentPreset = presetKey;

        const preset = PRESETS[presetKey];

        datasetPanel.classList.add('fade-out');
        datasetPanel.classList.remove('fade-in');

        setTimeout(() => {
            datasetTitle.textContent = preset.title;
            datasetDesc.textContent = preset.description;
            datasetPanel.classList.remove('fade-out');
            datasetPanel.classList.add('fade-in');
        }, 280);

        document.querySelectorAll('.dock-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetKey);
        });
    }

    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            updatePreset(this.dataset.preset);
        });
    });

    // ─────────────────────────────────────────────
    // CLOCK & SESSION TIMER (HUD)
    // ─────────────────────────────────────────────
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    function updateClockHUD() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        badgeTime.textContent = `${h}:${m}`;

        const day = DAYS[now.getDay()];
        const month = MONTHS[now.getMonth()];
        const date = now.getDate();
        badgeDate.textContent = `${day}, ${month} ${date}`;

        const elapsed = Math.floor((Date.now() - SESSION_START) / 1000);
        const sMin = Math.floor(elapsed / 60);
        const sSec = String(elapsed % 60).padStart(2, '0');
        badgeSession.textContent = `${sMin}:${sSec}`;
    }

    updateClockHUD();
    setInterval(updateClockHUD, 1000);

    // ─────────────────────────────────────────────
    // METRIC CARDS — Calculate KPIs from data
    // ─────────────────────────────────────────────
    function formatNumber(n) {
        if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
        if (n >= 1000) return n.toLocaleString('en-US');
        return String(n);
    }

    function calculateMetrics() {
        fetch('../data/demo/sales.json')
            .then(r => r.json())
            .then(data => {
                const total = data.reduce((sum, d) => sum + d.sales, 0);
                const el = document.getElementById('metric-sales-value');
                if (el) el.setAttribute('text', 'value', formatNumber(total));
            })
            .catch(err => console.warn('[Metrics] Sales fetch error:', err));

        fetch('../data/demo/attendance.json')
            .then(r => r.json())
            .then(data => {
                const total = data.reduce((sum, d) => sum + d.attendees, 0);
                const el = document.getElementById('metric-attendance-value');
                if (el) el.setAttribute('text', 'value', formatNumber(total));
            })
            .catch(err => console.warn('[Metrics] Attendance fetch error:', err));

        fetch('../data/demo/kpis.json')
            .then(r => r.json())
            .then(data => {
                const total = data.reduce((sum, d) => sum + d.revenue, 0);
                const el = document.getElementById('metric-revenue-value');
                if (el) el.setAttribute('text', 'value', formatNumber(total));
            })
            .catch(err => console.warn('[Metrics] KPIs fetch error:', err));
    }

    // ─────────────────────────────────────────────
    // SCENE LOADED
    // ─────────────────────────────────────────────
    const scene = document.querySelector('a-scene');
    scene.addEventListener('loaded', function () {
        console.log('[BabiaXR] Scene loaded — Iron Man Holographic Room ✨');

        const username = getUsernameFromURL();
        const nametag = document.querySelector('#rig .nametag');
        if (nametag) {
            nametag.setAttribute('text', 'value', username);
        }

        const head = document.querySelector('#rig .head');
        if (head) {
            const hue = Math.floor(Math.random() * 360);
            head.setAttribute('material', 'color', `hsl(${hue}, 70%, 60%)`);
        }

        datasetTitle.textContent = PRESETS.sales.title;
        datasetDesc.textContent = PRESETS.sales.description;
        calculateMetrics();
    });

    // ═════════════════════════════════════════════
    //  A-FRAME COMPONENTS
    // ═════════════════════════════════════════════

    // ─── clock-display ───────────────────────────
    if (!AFRAME.components['clock-display']) {
        AFRAME.registerComponent('clock-display', {
            init: function () {
                this.clockText = this.el.querySelector('#clock-time');
                this.dateText  = this.el.querySelector('#clock-date');
                this.updateClock();
            },
            tick: function (time) {
                if (Math.floor(time / 10000) !== this._lastTick) {
                    this._lastTick = Math.floor(time / 10000);
                    this.updateClock();
                }
            },
            updateClock: function () {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                if (this.clockText) {
                    this.clockText.setAttribute('text', 'value', `${h}:${m}`);
                }
                if (this.dateText) {
                    const day = DAYS[now.getDay()];
                    const month = MONTHS[now.getMonth()];
                    const date = now.getDate();
                    this.dateText.setAttribute('text', 'value', `${day}, ${month} ${date}`);
                }
            }
        });
    }

    // ─── player-info ─────────────────────────────
    if (!AFRAME.components['player-info']) {
        AFRAME.registerComponent('player-info', {
            schema: {
                name:  { type: 'string', default: 'Anonymous' },
                color: { type: 'color', default: '#ffffff' }
            },
            init: function () {
                const username = getUsernameFromURL();
                this.el.setAttribute('player-info', 'name', username);
                const hue = Math.floor(Math.random() * 360);
                const color = `hsl(${hue}, 70%, 60%)`;
                this.el.setAttribute('player-info', 'color', color);
            },
            update: function () {
                const nametag = this.el.querySelector('.nametag');
                const head = this.el.querySelector('.head');
                if (nametag) nametag.setAttribute('text', 'value', this.data.name);
                if (head) head.setAttribute('material', 'color', this.data.color);
            }
        });
    }

    // ─── spawn-in-circle ─────────────────────────
    if (!AFRAME.components['spawn-in-circle']) {
        AFRAME.registerComponent('spawn-in-circle', {
            schema: { radius: { type: 'number', default: 3 } },
            init: function () {
                const el = this.el;
                const center = el.getAttribute('position');
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * this.data.radius;
                el.setAttribute('position', {
                    x: center.x + r * Math.cos(angle),
                    y: center.y,
                    z: center.z + r * Math.sin(angle)
                });
            }
        });
    }

    // ─── face-camera (legacy alias) ──────────────
    if (!AFRAME.components['face-camera']) {
        AFRAME.registerComponent('face-camera', {
            init: function () {
                this.el.setAttribute('look-at', '[camera]');
            }
        });
    }

    // ═════════════════════════════════════════════
    //  SUPERHANDS INTERACTION COMPONENTS
    // ═════════════════════════════════════════════

    // ─── THUMBSTICK LOCOMOTION (Left Controller) ─
    if (!AFRAME.components['thumbstick-move']) {
        AFRAME.registerComponent('thumbstick-move', {
            schema: {
                speed: { type: 'number', default: 2.5 },
                deadzone: { type: 'number', default: 0.15 }
            },
            init: function () {
                this.inputVec = { x: 0, y: 0 };
                this.direction = new THREE.Vector3();
                this.forward = new THREE.Vector3();
                this.right = new THREE.Vector3();

                const onMove = (x, y) => {
                    this.inputVec.x = x;
                    this.inputVec.y = y;
                };

                this.el.addEventListener('thumbstickmoved', (evt) => {
                    onMove(evt.detail.x, evt.detail.y);
                });

                this.el.addEventListener('axismove', (evt) => {
                    if (evt.detail.axis && evt.detail.axis.length >= 4) {
                        onMove(evt.detail.axis[2], evt.detail.axis[3]);
                    } else if (evt.detail.axis && evt.detail.axis.length >= 2) {
                        onMove(evt.detail.axis[0], evt.detail.axis[1]);
                    }
                });
            },
            tick: function (time, delta) {
                if (!delta) return;
                const dz = this.data.deadzone;
                if (Math.abs(this.inputVec.x) < dz && Math.abs(this.inputVec.y) < dz) return;

                const rig = document.getElementById('rig');
                const cam = document.getElementById('player');
                if (!rig || !cam) return;

                const speed = this.data.speed * (delta / 1000);

                // Camera forward/right in world space (horizontal only)
                this.forward.set(0, 0, -1).applyQuaternion(cam.object3D.quaternion);
                this.forward.y = 0;
                this.forward.normalize();

                this.right.set(1, 0, 0).applyQuaternion(cam.object3D.quaternion);
                this.right.y = 0;
                this.right.normalize();

                this.direction.set(0, 0, 0);
                this.direction.addScaledVector(this.forward, -this.inputVec.y * speed);
                this.direction.addScaledVector(this.right, this.inputVec.x * speed);

                rig.object3D.position.add(this.direction);
            }
        });
    }

    // ─── THUMBSTICK SNAP TURN (Right Controller) ─
    if (!AFRAME.components['thumbstick-turn']) {
        AFRAME.registerComponent('thumbstick-turn', {
            schema: {
                snapAngle: { type: 'number', default: 45 },
                deadzone: { type: 'number', default: 0.65 }
            },
            init: function () {
                this.canTurn = true;

                const onMove = (x) => {
                    if (Math.abs(x) > this.data.deadzone && this.canTurn) {
                        const rig = document.getElementById('rig');
                        if (!rig) return;
                        const rot = rig.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                        const dir = x > 0 ? -1 : 1;
                        rig.setAttribute('rotation', {
                            x: rot.x,
                            y: rot.y + (this.data.snapAngle * dir),
                            z: rot.z
                        });
                        this.canTurn = false;
                    }
                    if (Math.abs(x) < 0.3) {
                        this.canTurn = true;
                    }
                };

                this.el.addEventListener('thumbstickmoved', (evt) => {
                    onMove(evt.detail.x);
                });

                this.el.addEventListener('axismove', (evt) => {
                    if (evt.detail.axis && evt.detail.axis.length >= 4) {
                        onMove(evt.detail.axis[2]);
                    } else if (evt.detail.axis && evt.detail.axis.length >= 2) {
                        onMove(evt.detail.axis[0]);
                    }
                });
            }
        });
    }

    // ─── HOVER GLOW — Subtle Apple-style feedback ─
    if (!AFRAME.components['hover-glow']) {
        AFRAME.registerComponent('hover-glow', {
            init: function () {
                this.originalScale = null;
                this.glowRing = null;

                this.el.addEventListener('hover-start', this.onHoverStart.bind(this));
                this.el.addEventListener('hover-end', this.onHoverEnd.bind(this));
            },
            onHoverStart: function () {
                // Store original scale once
                if (!this.originalScale) {
                    const s = this.el.object3D.scale;
                    this.originalScale = { x: s.x, y: s.y, z: s.z };
                }

                // Subtle scale bump
                const os = this.originalScale;
                this.el.setAttribute('animation__hover', {
                    property: 'scale',
                    to: `${os.x * 1.04} ${os.y * 1.04} ${os.z * 1.04}`,
                    dur: 250,
                    easing: 'easeOutQuad'
                });

                // Create glow ring if not exists
                if (!this.glowRing) {
                    this.glowRing = document.createElement('a-ring');
                    this.glowRing.setAttribute('radius-inner', '1.8');
                    this.glowRing.setAttribute('radius-outer', '2.2');
                    this.glowRing.setAttribute('rotation', '-90 0 0');
                    this.glowRing.setAttribute('position', '0 -0.05 0');
                    this.glowRing.setAttribute('material', {
                        color: '#2997ff',
                        emissive: '#2997ff',
                        emissiveIntensity: 0.4,
                        opacity: 0,
                        transparent: true,
                        side: 'double'
                    });
                    this.el.appendChild(this.glowRing);
                }

                this.glowRing.setAttribute('animation__fadein', {
                    property: 'material.opacity',
                    to: 0.15,
                    dur: 300,
                    easing: 'easeOutQuad'
                });
            },
            onHoverEnd: function () {
                if (this.originalScale) {
                    const os = this.originalScale;
                    this.el.setAttribute('animation__hover', {
                        property: 'scale',
                        to: `${os.x} ${os.y} ${os.z}`,
                        dur: 350,
                        easing: 'easeOutQuad'
                    });
                }
                if (this.glowRing) {
                    this.glowRing.setAttribute('animation__fadeout', {
                        property: 'material.opacity',
                        to: 0,
                        dur: 300,
                        easing: 'easeOutQuad'
                    });
                }
            }
        });
    }

    // ─── GRAB VISUAL — Feedback during grab ──────
    if (!AFRAME.components['grab-visual']) {
        AFRAME.registerComponent('grab-visual', {
            init: function () {
                this.grabIndicator = null;

                this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
                this.el.addEventListener('grab-end', this.onGrabEnd.bind(this));
            },
            onGrabStart: function () {
                // Add a subtle bottom glow plane
                if (!this.grabIndicator) {
                    this.grabIndicator = document.createElement('a-plane');
                    this.grabIndicator.setAttribute('width', '3');
                    this.grabIndicator.setAttribute('height', '3');
                    this.grabIndicator.setAttribute('rotation', '-90 0 0');
                    this.grabIndicator.setAttribute('position', '0 -0.1 0');
                    this.grabIndicator.setAttribute('material', {
                        color: '#2997ff',
                        emissive: '#2997ff',
                        emissiveIntensity: 0.5,
                        opacity: 0,
                        transparent: true,
                        side: 'double'
                    });
                    this.el.appendChild(this.grabIndicator);
                }

                this.grabIndicator.setAttribute('animation__grabin', {
                    property: 'material.opacity',
                    to: 0.08,
                    dur: 200,
                    easing: 'easeOutQuad'
                });
            },
            onGrabEnd: function () {
                if (this.grabIndicator) {
                    this.grabIndicator.setAttribute('animation__grabout', {
                        property: 'material.opacity',
                        to: 0,
                        dur: 400,
                        easing: 'easeOutQuad'
                    });
                }
            }
        });
    }

    // ─── OWNERSHIP LOCK — First come, first served ─
    if (!AFRAME.components['ownership-lock']) {
        AFRAME.registerComponent('ownership-lock', {
            init: function () {
                this.lockedBy = null;
                this.lockId = this.el.id || ('lock-' + Math.random().toString(36).substr(2, 9));

                this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
                this.el.addEventListener('grab-end', this.onGrabEnd.bind(this));

                // Listen for remote lock/unlock
                document.body.addEventListener('ownership-update', (evt) => {
                    if (evt.detail.lockId === this.lockId) {
                        this.lockedBy = evt.detail.owner;
                    }
                });
            },
            onGrabStart: function (evt) {
                const myId = NAF.clientId || 'local';
                if (this.lockedBy && this.lockedBy !== myId) {
                    // Someone else has it — reject the grab
                    evt.preventDefault();
                    return;
                }
                this.lockedBy = myId;
                this._broadcastOwnership(myId);
            },
            onGrabEnd: function () {
                this.lockedBy = null;
                this._broadcastOwnership(null);
            },
            _broadcastOwnership: function (owner) {
                if (!NAF.connection || !NAF.connection.isConnected()) return;
                try {
                    NAF.connection.broadcastData('ownership-update', {
                        lockId: this.lockId,
                        owner: owner
                    });
                } catch (e) {
                    console.warn('[OwnershipLock] Broadcast failed:', e);
                }
            }
        });
    }

    // ─── CHART SYNC — NAF position broadcast ─────
    if (!AFRAME.components['chart-sync']) {
        AFRAME.registerComponent('chart-sync', {
            schema: {
                syncId: { type: 'string', default: '' }
            },
            init: function () {
                this.lastBroadcast = 0;
                this.isGrabbed = false;
                this.lastPos = new THREE.Vector3();
                this.lastRot = new THREE.Euler();
                this.lastScale = new THREE.Vector3(1, 1, 1);

                this.el.addEventListener('grab-start', () => { this.isGrabbed = true; });
                this.el.addEventListener('grab-end', () => {
                    this.isGrabbed = false;
                    this._broadcast(); // Final position
                });

                // Listen for remote chart updates
                this._onRemoteUpdate = (evt) => {
                    const d = evt.detail;
                    if (d.syncId !== this.data.syncId) return;
                    if (d.sender === (NAF.clientId || 'local')) return;
                    this.el.object3D.position.set(d.position.x, d.position.y, d.position.z);
                    this.el.object3D.rotation.set(d.rotation.x, d.rotation.y, d.rotation.z);
                    this.el.object3D.scale.set(d.scale.x, d.scale.y, d.scale.z);
                };
                document.body.addEventListener('chart-sync-data', this._onRemoteUpdate);
            },
            tick: function (time) {
                if (!this.isGrabbed) return;
                if (time - this.lastBroadcast < 80) return; // ~12fps
                this.lastBroadcast = time;
                this._broadcast();
            },
            _broadcast: function () {
                if (!NAF.connection || !NAF.connection.isConnected()) return;

                const p = this.el.object3D.position;
                const r = this.el.object3D.rotation;
                const s = this.el.object3D.scale;

                // Only send if changed
                if (p.distanceTo(this.lastPos) < 0.005 &&
                    s.distanceTo(this.lastScale) < 0.005) return;

                this.lastPos.copy(p);
                this.lastScale.copy(s);

                try {
                    NAF.connection.broadcastData('chart-sync', {
                        syncId: this.data.syncId,
                        sender: NAF.clientId,
                        position: { x: p.x, y: p.y, z: p.z },
                        rotation: { x: r.x, y: r.y, z: r.z },
                        scale: { x: s.x, y: s.y, z: s.z }
                    });
                } catch (e) {
                    console.warn('[ChartSync] Broadcast failed:', e);
                }
            }
        });
    }

    // ─── POINTER SYNC — Show other users' lasers ─
    if (!AFRAME.components['pointer-sync']) {
        AFRAME.registerComponent('pointer-sync', {
            init: function () {
                this.lastBroadcast = 0;
                this.remotePointers = {};
                this._subscribed = false;
            },
            tick: function (time) {
                // Subscribe once connected
                if (!this._subscribed && NAF.connection && NAF.connection.isConnected()) {
                    this._subscribe();
                    this._subscribed = true;
                }

                if (time - this.lastBroadcast < 100) return; // 10fps
                this.lastBroadcast = time;
                this._broadcastPointer();
            },
            _subscribe: function () {
                try {
                    NAF.connection.subscribeToDataChannel('pointer-sync', (senderId, dataType, data) => {
                        this._handleRemotePointer(senderId, data);
                    });
                    NAF.connection.subscribeToDataChannel('ownership-update', (senderId, dataType, data) => {
                        document.body.dispatchEvent(new CustomEvent('ownership-update', { detail: data }));
                    });
                    NAF.connection.subscribeToDataChannel('chart-sync', (senderId, dataType, data) => {
                        document.body.dispatchEvent(new CustomEvent('chart-sync-data', { detail: data }));
                    });
                } catch (e) {
                    console.warn('[PointerSync] Subscribe failed:', e);
                }
            },
            _broadcastPointer: function () {
                if (!NAF.connection || !NAF.connection.isConnected()) return;

                // Get right controller raycaster intersection
                const rightCtrl = document.getElementById('right-controller');
                if (!rightCtrl) return;

                const raycaster = rightCtrl.components.raycaster;
                if (!raycaster) return;

                const intersections = raycaster.intersections;
                if (intersections && intersections.length > 0) {
                    const pt = intersections[0].point;
                    const head = document.querySelector('#rig .head');
                    const color = head ? head.getAttribute('material').color : '#2997ff';

                    try {
                        NAF.connection.broadcastData('pointer-sync', {
                            position: { x: pt.x, y: pt.y, z: pt.z },
                            color: color,
                            active: true
                        });
                    } catch (e) { /* silent */ }
                } else {
                    try {
                        NAF.connection.broadcastData('pointer-sync', { active: false });
                    } catch (e) { /* silent */ }
                }
            },
            _handleRemotePointer: function (senderId, data) {
                if (!this.remotePointers[senderId]) {
                    // Create a small glowing sphere for remote pointer
                    const dot = document.createElement('a-sphere');
                    dot.setAttribute('radius', '0.04');
                    dot.setAttribute('class', 'remote-pointer');
                    dot.setAttribute('material', {
                        color: data.color || '#ff6b6b',
                        emissive: data.color || '#ff6b6b',
                        emissiveIntensity: 0.5,
                        opacity: 0.7,
                        transparent: true
                    });
                    dot.setAttribute('animation', {
                        property: 'scale',
                        from: '0.8 0.8 0.8',
                        to: '1.3 1.3 1.3',
                        dur: 600,
                        dir: 'alternate',
                        loop: true,
                        easing: 'easeInOutSine'
                    });
                    document.querySelector('a-scene').appendChild(dot);
                    this.remotePointers[senderId] = dot;
                }

                const dot = this.remotePointers[senderId];
                if (data.active && data.position) {
                    dot.setAttribute('visible', true);
                    dot.object3D.position.set(data.position.x, data.position.y, data.position.z);
                    if (data.color) {
                        dot.setAttribute('material', 'color', data.color);
                        dot.setAttribute('material', 'emissive', data.color);
                    }
                } else {
                    dot.setAttribute('visible', false);
                }
            }
        });
    }

})();
