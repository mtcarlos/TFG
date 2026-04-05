/**
 * babia-scene.js
 * Logic for the BabiaXR data visualization world.
 * Premium Apple Keynote aesthetic.
 * 
 * Handles: dataset panel, preset dock, username,
 *          clock display, metric cards, session timer.
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

        // Fade-out dataset panel
        datasetPanel.classList.add('fade-out');
        datasetPanel.classList.remove('fade-in');

        setTimeout(() => {
            datasetTitle.textContent = preset.title;
            datasetDesc.textContent = preset.description;

            // Fade-in
            datasetPanel.classList.remove('fade-out');
            datasetPanel.classList.add('fade-in');
        }, 280);

        // Update active dock button
        document.querySelectorAll('.dock-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetKey);
        });
    }

    // Bind dock buttons
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

        // Time
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        badgeTime.textContent = `${h}:${m}`;

        // Date
        const day = DAYS[now.getDay()];
        const month = MONTHS[now.getMonth()];
        const date = now.getDate();
        badgeDate.textContent = `${day}, ${month} ${date}`;

        // Session duration
        const elapsed = Math.floor((Date.now() - SESSION_START) / 1000);
        const sMin = Math.floor(elapsed / 60);
        const sSec = String(elapsed % 60).padStart(2, '0');
        badgeSession.textContent = `${sMin}:${sSec}`;
    }

    // Update immediately and every second
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
        // Sales total
        fetch('../data/demo/sales.json')
            .then(r => r.json())
            .then(data => {
                const total = data.reduce((sum, d) => sum + d.sales, 0);
                const el = document.getElementById('metric-sales-value');
                if (el) el.setAttribute('text', 'value', formatNumber(total));
            })
            .catch(err => console.warn('[Metrics] Sales fetch error:', err));

        // Attendance total
        fetch('../data/demo/attendance.json')
            .then(r => r.json())
            .then(data => {
                const total = data.reduce((sum, d) => sum + d.attendees, 0);
                const el = document.getElementById('metric-attendance-value');
                if (el) el.setAttribute('text', 'value', formatNumber(total));
            })
            .catch(err => console.warn('[Metrics] Attendance fetch error:', err));

        // Revenue YTD
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
        console.log('[BabiaXR] Scene loaded — Apple Keynote mode ✨');

        // Set username on avatar nametag
        const username = getUsernameFromURL();
        const nametag = document.querySelector('#rig .nametag');
        if (nametag) {
            nametag.setAttribute('text', 'value', username);
        }

        // Set avatar random color
        const head = document.querySelector('#rig .head');
        if (head) {
            const hue = Math.floor(Math.random() * 360);
            head.setAttribute('material', 'color', `hsl(${hue}, 70%, 60%)`);
        }

        // Initialize first preset
        datasetTitle.textContent = PRESETS.sales.title;
        datasetDesc.textContent = PRESETS.sales.description;

        // Calculate KPI metrics
        calculateMetrics();
    });

    // ─────────────────────────────────────────────
    // REGISTER A-FRAME COMPONENTS
    // ─────────────────────────────────────────────

    // clock-display: updates 3D text with current time
    if (!AFRAME.components['clock-display']) {
        AFRAME.registerComponent('clock-display', {
            init: function () {
                this.clockText = this.el.querySelector('#clock-time');
                this.dateText  = this.el.querySelector('#clock-date');
                this.updateClock();
            },
            tick: function (time) {
                // Update every ~10 seconds (optimization)
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

    // player-info: syncs nametag and head color
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

                if (nametag) {
                    nametag.setAttribute('text', 'value', this.data.name);
                }
                if (head) {
                    head.setAttribute('material', 'color', this.data.color);
                }
            }
        });
    }

    // spawn-in-circle: randomizes avatar spawn position
    if (!AFRAME.components['spawn-in-circle']) {
        AFRAME.registerComponent('spawn-in-circle', {
            schema: {
                radius: { type: 'number', default: 3 }
            },
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

    // face-camera: deprecated alias for look-at
    if (!AFRAME.components['face-camera']) {
        AFRAME.registerComponent('face-camera', {
            init: function () {
                this.el.setAttribute('look-at', '[camera]');
            }
        });
    }

})();
