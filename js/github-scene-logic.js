/**
 * github-scene-logic.js — Logic for the GitHub Explorer A-Frame scene
 * Handles: BabiaXR chart injection, avatar networking, repo data fetching,
 *          HUD panels, dock navigation, VR interaction components,
 *          clock display, and session timer.
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // SESSION START TIME
    // ─────────────────────────────────────────────
    const SESSION_START = Date.now();

    // ─────────────────────────────────────────────
    // URL PARAMS
    // ─────────────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    const username = urlParams.get('username') || 'Explorer';

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
    const badgeTime = document.getElementById('badge-time');
    const badgeDate = document.getElementById('badge-date');
    const badgeSession = document.getElementById('badge-session');
    const badgeRoom = document.getElementById('badge-room');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingRepoName = document.getElementById('loading-repo-name');
    const dashboardToggle = document.getElementById('dashboard-toggle');
    const dataDashboard = document.getElementById('data-dashboard');

    // ─────────────────────────────────────────────
    // GITHUB LANGUAGE COLORS
    // ─────────────────────────────────────────────
    const LANGUAGE_COLORS = {
        'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
        'Java': '#b07219', 'C#': '#178600', 'C++': '#f34b7d',
        'C': '#555555', 'PHP': '#4F5D95', 'Ruby': '#701516',
        'Go': '#00ADD8', 'Rust': '#dea584', 'Swift': '#F05138',
        'Kotlin': '#A97BFF', 'Dart': '#00B4AB', 'Scala': '#c22d40',
        'Shell': '#89e051', 'HTML': '#e34c26', 'CSS': '#563d7c',
        'SCSS': '#c6538c', 'Vue': '#41b883', 'Svelte': '#ff3e00',
        'Lua': '#000080', 'R': '#198CE7', 'MATLAB': '#e16737',
        'Jupyter Notebook': '#DA5B0B', 'Dockerfile': '#384d54', 'Makefile': '#427819',
        'Perl': '#0298c3', 'Haskell': '#5e5086', 'Elixir': '#6e4a7e',
        'Clojure': '#db5855', 'Erlang': '#B83998', 'Objective-C': '#438eff'
    };

    // ─────────────────────────────────────────────
    // CLOCK & SESSION TIMER
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

        // Update in-scene clock
        const clockEl = document.getElementById('scene-clock-time');
        if (clockEl) clockEl.setAttribute('text', 'value', `${h}:${m}`);
    }

    updateClockHUD();
    setInterval(updateClockHUD, 1000);

    // Set room badge
    if (badgeRoom) {
        badgeRoom.textContent = roomId ? `Room: ${roomId}` : 'Local';
    }

    // ─────────────────────────────────────────────
    // DASHBOARD TOGGLE — Show / Hide stats panel
    // ─────────────────────────────────────────────
    function openDashboard() {
        if (dataDashboard) dataDashboard.classList.remove('dash-collapsed');
        if (dashboardToggle) dashboardToggle.classList.add('dash-active');
    }

    function closeDashboard() {
        if (dataDashboard) dataDashboard.classList.add('dash-collapsed');
        if (dashboardToggle) dashboardToggle.classList.remove('dash-active');
    }

    if (dashboardToggle) {
        dashboardToggle.addEventListener('click', function () {
            if (dataDashboard && dataDashboard.classList.contains('dash-collapsed')) {
                openDashboard();
            } else {
                closeDashboard();
            }
        });
    }

    const dashboardClose = document.getElementById('dashboard-close');
    if (dashboardClose) {
        dashboardClose.addEventListener('click', closeDashboard);
    }



    // ─────────────────────────────────────────────
    // FORMAT HELPERS
    // ─────────────────────────────────────────────
    function formatNum(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n || 0);
    }

    // ─────────────────────────────────────────────
    // BABIA CHART INJECTION
    // Dynamically set babia-queryjson and chart attributes
    // once the roomId is known.
    // ─────────────────────────────────────────────
    function injectBabiaCharts() {
        if (!roomId) {
            console.warn('[GitHubScene] No roomId — cannot inject charts');
            return;
        }

        const basePath = `/api/rooms/${roomId}/dataset`;

        // Languages data source
        const langsData = document.getElementById('languages-data');
        langsData.setAttribute('babia-queryjson', `url: ${basePath}/languages`);

        // Contributors data source
        const contribsData = document.getElementById('contributors-data');
        contribsData.setAttribute('babia-queryjson', `url: ${basePath}/contributors`);

        // Summary data source
        const summaryData = document.getElementById('summary-data');
        summaryData.setAttribute('babia-queryjson', `url: ${basePath}/summary`);

        // Languages chart — bars
        const chartLangs = document.getElementById('chart-langs');
        chartLangs.setAttribute('babia-bars', {
            from: 'languages-data',
            legend: true,
            palette: 'blues',
            x_axis: 'key',
            height: 'value'
        });

        // Contributors chart — pie
        const chartContribs = document.getElementById('chart-contribs');
        chartContribs.setAttribute('babia-pie', {
            from: 'contributors-data',
            legend: true,
            palette: 'sunset',
            key: 'key',
            size: 'value'
        });

        // Metrics chart — bars
        const chartMetrics = document.getElementById('chart-metrics');
        chartMetrics.setAttribute('babia-bars', {
            from: 'summary-data',
            legend: true,
            palette: 'blues',
            x_axis: 'metric',
            height: 'value'
        });

        console.log('[GitHubScene] BabiaXR charts injected for room:', roomId);
    }

    // ─────────────────────────────────────────────
    // FETCH REPO DATA & UPDATE HUDs
    // ─────────────────────────────────────────────
    async function loadRepoData() {
        if (!roomId) return;

        try {
            const res = await fetch(`/api/rooms/${roomId}/repo-data`);
            if (!res.ok) {
                if (res.status === 404) {
                    // Room exists but no repo selected yet — retry
                    loadingRepoName.textContent = 'Waiting for host to select a repository...';
                    setTimeout(loadRepoData, 5000);
                    return;
                }
                return;
            }
            const data = await res.json();

            // ── Update HTML HUD ──
            document.getElementById('hud-repo-name').textContent = data.fullName || 'Unknown';
            document.getElementById('hud-desc').textContent = (data.description || 'No description.').substring(0, 120);
            document.getElementById('hud-stars').textContent = formatNum(data.stars);
            document.getElementById('hud-forks').textContent = formatNum(data.forks);
            document.getElementById('hud-issues').textContent = formatNum(data.openIssues);
            document.getElementById('hud-lang').textContent = data.mainLanguage || '—';
            document.getElementById('repo-hud').classList.remove('hidden');

            // ── Update 3D title ──
            const sceneTitle = document.getElementById('scene-repo-name');
            if (sceneTitle) sceneTitle.setAttribute('text', 'value', data.fullName || '');

            // ── Update metric plaques ──
            const langsCount = data.languages ? data.languages.length : 0;
            const contribsCount = data.contributors ? data.contributors.length : 0;

            const metricLangs = document.getElementById('metric-langs-value');
            if (metricLangs) metricLangs.setAttribute('text', 'value', String(langsCount));

            const metricContribs = document.getElementById('metric-contribs-value');
            if (metricContribs) metricContribs.setAttribute('text', 'value', String(contribsCount));

            const metricStars = document.getElementById('metric-stars-value');
            if (metricStars) metricStars.setAttribute('text', 'value', formatNum(data.stars));

            // ── Hide loading overlay ──
            if (loadingOverlay) {
                loadingOverlay.classList.add('fade-out');
                setTimeout(() => { loadingOverlay.style.display = 'none'; }, 800);
            }

            // ── Populate data dashboard ──
            populateDashboard(data);

            console.log('[GitHubScene] Repo data loaded:', data.fullName);

            // ── Initialize Code City (polls until layout is ready) ──
            if (window.CodeCity) {
                CodeCity.init(roomId);
            }

        } catch (e) {
            console.error('[GitHubScene] Failed to load repo data:', e);
            setTimeout(loadRepoData, 8000);
        }
    }

    // ─────────────────────────────────────────────
    // GRID LINES GENERATION
    // ─────────────────────────────────────────────
    function generateGrid() {
        const gridEl = document.getElementById('grid-lines');
        if (!gridEl) return;
        for (let i = -50; i <= 50; i += 5) {
            const lineX = document.createElement('a-plane');
            lineX.setAttribute('position', `0 0.01 ${i}`);
            lineX.setAttribute('rotation', '-90 0 0');
            lineX.setAttribute('width', '100');
            lineX.setAttribute('height', '0.02');
            lineX.setAttribute('material', 'color: #334155; opacity: 0.2; transparent: true');
            gridEl.appendChild(lineX);

            const lineZ = document.createElement('a-plane');
            lineZ.setAttribute('position', `${i} 0.01 0`);
            lineZ.setAttribute('rotation', '-90 90 0');
            lineZ.setAttribute('width', '100');
            lineZ.setAttribute('height', '0.02');
            lineZ.setAttribute('material', 'color: #334155; opacity: 0.2; transparent: true');
            gridEl.appendChild(lineZ);
        }
    }

    // ─────────────────────────────────────────────
    // POPULATE DATA DASHBOARD
    // ─────────────────────────────────────────────
    function getLanguageColor(lang) {
        return LANGUAGE_COLORS[lang] || `hsl(${Math.abs(hashStr(lang)) % 360}, 55%, 55%)`;
    }

    function hashStr(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    function populateDashboard(data) {
        const dashboard = document.getElementById('data-dashboard');
        if (!dashboard) return;

        // ── Languages ──
        const langContainer = document.getElementById('dash-languages');
        if (langContainer && data.languages && data.languages.length > 0) {
            langContainer.innerHTML = '';
            const total = data.languages.reduce((sum, l) => sum + (l.value || l.percentage || 0), 0);

            data.languages.forEach(lang => {
                const name = lang.key || lang.name || lang.language || 'Unknown';
                const rawVal = lang.value || lang.percentage || 0;
                const pct = total > 0 ? ((rawVal / total) * 100) : 0;
                const color = getLanguageColor(name);

                const row = document.createElement('div');
                row.className = 'dash-lang-row';
                row.innerHTML = `
                    <span class="dash-lang-color" style="background: ${color}; color: ${color}"></span>
                    <span class="dash-lang-name">${name}</span>
                    <div class="dash-lang-bar-track">
                        <div class="dash-lang-bar-fill" style="width: 0%; background: ${color}"></div>
                    </div>
                    <span class="dash-lang-pct">${pct.toFixed(1)}%</span>
                `;
                langContainer.appendChild(row);

                // Animate bar fill
                requestAnimationFrame(() => {
                    const fill = row.querySelector('.dash-lang-bar-fill');
                    if (fill) fill.style.width = `${Math.min(pct, 100)}%`;
                });
            });
        }

        // ── Contributors ──
        const contribContainer = document.getElementById('dash-contributors');
        if (contribContainer && data.contributors && data.contributors.length > 0) {
            contribContainer.innerHTML = '';
            const maxCommits = Math.max(...data.contributors.map(c => c.value || c.contributions || 0));
            const topContribs = data.contributors.slice(0, 8);

            topContribs.forEach(contrib => {
                const name = contrib.key || contrib.login || contrib.name || 'Unknown';
                const commits = contrib.value || contrib.contributions || 0;
                const barWidth = maxCommits > 0 ? ((commits / maxCommits) * 100) : 0;
                const initials = name.substring(0, 2).toUpperCase();
                const avatarUrl = contrib.avatar_url || '';

                const row = document.createElement('div');
                row.className = 'dash-contrib-row';
                row.innerHTML = `
                    <div class="dash-contrib-avatar">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${name}">` : initials}
                    </div>
                    <div class="dash-contrib-info">
                        <div class="dash-contrib-name">${name}</div>
                        <div class="dash-contrib-commits">${formatNum(commits)} commits</div>
                    </div>
                    <div class="dash-contrib-bar">
                        <div class="dash-contrib-bar-fill" style="width: 0%"></div>
                    </div>
                `;
                contribContainer.appendChild(row);

                requestAnimationFrame(() => {
                    const fill = row.querySelector('.dash-contrib-bar-fill');
                    if (fill) fill.style.width = `${barWidth}%`;
                });
            });
        }

        // ── Metrics ──
        const metricsContainer = document.getElementById('dash-metrics');
        if (metricsContainer) {
            metricsContainer.innerHTML = '';

            const svgStar = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><polygon points="8,1.5 9.8,5.8 14.5,6.2 10.9,9.3 12,14 8,11.5 4,14 5.1,9.3 1.5,6.2 6.2,5.8"/></svg>';
            const svgFork = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="3.5" r="1.8"/><circle cx="11" cy="3.5" r="1.8"/><circle cx="8" cy="12.5" r="1.8"/><path d="M5,5.3 L5,7 C5,8.5 6.5,9 8,9 C9.5,9 11,8.5 11,7 L11,5.3"/><line x1="8" y1="9" x2="8" y2="10.7"/></svg>';
            const svgIssue = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="5" x2="8" y2="8.5"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/></svg>';
            const svgPeople = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.2"/><path d="M1.5,14.5 C1.5,11 3.5,9 6,9 C8.5,9 10.5,11 10.5,14.5"/><circle cx="12" cy="5.5" r="1.7"/><path d="M12,9 C13.5,9 14.5,10.5 14.5,13"/></svg>';
            const svgBox = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M2,5 L8,2 L14,5 L14,11 L8,14 L2,11 Z"/><line x1="8" y1="8" x2="8" y2="14"/><polyline points="2,5 8,8 14,5"/></svg>';
            const svgCode = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,3 1.5,8 5,13"/><polyline points="11,3 14.5,8 11,13"/></svg>';

            const metrics = [
                { icon: svgStar, label: 'Stars', value: formatNum(data.stars || 0) },
                { icon: svgFork, label: 'Forks', value: formatNum(data.forks || 0) },
                { icon: svgIssue, label: 'Issues', value: formatNum(data.openIssues || 0) },
                { icon: svgPeople, label: 'Contribs', value: formatNum(data.contributors ? data.contributors.length : 0) },
                { icon: svgBox, label: 'Size', value: data.size ? (data.size > 1024 ? (data.size / 1024).toFixed(1) + ' MB' : data.size + ' KB') : '—' },
                { icon: svgCode, label: 'Languages', value: String(data.languages ? data.languages.length : 0) }
            ];

            metrics.forEach(m => {
                const card = document.createElement('div');
                card.className = 'dash-metric-card';
                card.innerHTML = `
                    <span class="dash-metric-icon">${m.icon}</span>
                    <div class="dash-metric-value">${m.value}</div>
                    <div class="dash-metric-label">${m.label}</div>
                `;
                metricsContainer.appendChild(card);
            });
        }

        // ── Reveal dashboard (remove initial hidden, but keep collapsed) ──
        dashboard.classList.remove('hidden');
        // Dashboard starts collapsed; user opens via toggle button
    }

    // ═════════════════════════════════════════════
    //  A-FRAME COMPONENTS
    // ═════════════════════════════════════════════

    // ─── info-panel-toggle — 3D clickable info button ─
    if (!AFRAME.components['info-panel-toggle']) {
        AFRAME.registerComponent('info-panel-toggle', {
            schema: {
                panel: { type: 'selector', default: null }
            },
            init: function () {
                this.el.addEventListener('click', this.onToggle.bind(this));
            },
            onToggle: function () {
                const panel = this.data.panel;
                if (!panel) return;

                const isVisible = panel.getAttribute('visible');
                if (isVisible === true || isVisible === 'true') {
                    panel.setAttribute('visible', false);
                    // Shrink ring glow
                    const ring = this.el.querySelector('a-ring');
                    if (ring) ring.setAttribute('material', 'opacity', 0.3);
                } else {
                    panel.setAttribute('visible', true);
                    // Brighten ring glow
                    const ring = this.el.querySelector('a-ring');
                    if (ring) ring.setAttribute('material', 'opacity', 0.7);
                }
            }
        });
    }

    // ─── player-info ─────────────────────────────
    if (!AFRAME.components['player-info']) {
        AFRAME.registerComponent('player-info', {
            schema: {
                name: { type: 'string', default: 'Anonymous' },
                color: { type: 'color', default: '#ffffff' }
            },
            init: function () {
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

    // ─── random-color ────────────────────────────
    if (!AFRAME.components['random-color']) {
        AFRAME.registerComponent('random-color', {
            init: function () {
                const hue = Math.floor(Math.random() * 360);
                this.el.setAttribute('material', 'color', `hsl(${hue}, 70%, 60%)`);
            }
        });
    }

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

                const tc = this.el.components['tracked-controls'] || this.el.components['oculus-touch-controls'];
                if (tc && tc.controller && tc.controller.gamepad) {
                    const axes = tc.controller.gamepad.axes;
                    if (axes.length >= 4) {
                        this.inputVec.x = axes[2];
                        this.inputVec.y = axes[3];
                    } else if (axes.length >= 2) {
                        this.inputVec.x = axes[0];
                        this.inputVec.y = axes[1];
                    }
                }

                let ix = this.inputVec.x;
                let iy = this.inputVec.y;
                if (Math.abs(ix) < dz) ix = 0;
                if (Math.abs(iy) < dz) iy = 0;

                if (ix === 0 && iy === 0) return;

                const rig = document.getElementById('rig');
                const cam = document.getElementById('player');
                if (!rig || !cam) return;

                const speed = this.data.speed * (delta / 1000);

                this.forward.set(0, 0, -1).applyQuaternion(cam.object3D.quaternion);
                this.forward.y = 0;
                this.forward.normalize();

                this.right.set(1, 0, 0).applyQuaternion(cam.object3D.quaternion);
                this.right.y = 0;
                this.right.normalize();

                this.direction.set(0, 0, 0);
                this.direction.addScaledVector(this.forward, -iy * speed);
                this.direction.addScaledVector(this.right, ix * speed);

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
                this.inputX = 0;

                const onMove = (x) => { this.inputX = x; };

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
            },
            tick: function () {
                let x = this.inputX;

                const tc = this.el.components['tracked-controls'] || this.el.components['oculus-touch-controls'];
                if (tc && tc.controller && tc.controller.gamepad) {
                    const axes = tc.controller.gamepad.axes;
                    if (axes.length >= 4) {
                        x = axes[2];
                    } else if (axes.length >= 2) {
                        x = axes[0];
                    }
                }

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
            }
        });
    }

    // ─── HOVER GLOW — Subtle feedback ────────────
    if (!AFRAME.components['hover-glow']) {
        AFRAME.registerComponent('hover-glow', {
            init: function () {
                this.originalScale = null;
                this.glowRing = null;

                this.el.addEventListener('hover-start', this.onHoverStart.bind(this));
                this.el.addEventListener('hover-end', this.onHoverEnd.bind(this));
            },
            onHoverStart: function () {
                if (!this.originalScale) {
                    const s = this.el.object3D.scale;
                    this.originalScale = { x: s.x, y: s.y, z: s.z };
                }

                const os = this.originalScale;
                this.el.setAttribute('animation__hover', {
                    property: 'scale',
                    to: `${os.x * 1.04} ${os.y * 1.04} ${os.z * 1.04}`,
                    dur: 250,
                    easing: 'easeOutQuad'
                });

                if (!this.glowRing) {
                    this.glowRing = document.createElement('a-ring');
                    this.glowRing.setAttribute('radius-inner', '1.8');
                    this.glowRing.setAttribute('radius-outer', '2.2');
                    this.glowRing.setAttribute('rotation', '-90 0 0');
                    this.glowRing.setAttribute('position', '0 -0.05 0');
                    this.glowRing.setAttribute('material', {
                        color: '#059669',
                        emissive: '#059669',
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
                if (!this.grabIndicator) {
                    this.grabIndicator = document.createElement('a-plane');
                    this.grabIndicator.setAttribute('width', '3');
                    this.grabIndicator.setAttribute('height', '3');
                    this.grabIndicator.setAttribute('rotation', '-90 0 0');
                    this.grabIndicator.setAttribute('position', '0 -0.1 0');
                    this.grabIndicator.setAttribute('material', {
                        color: '#059669',
                        emissive: '#059669',
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

    // ─── OWNERSHIP LOCK ──────────────────────────
    if (!AFRAME.components['ownership-lock']) {
        AFRAME.registerComponent('ownership-lock', {
            init: function () {
                this.lockedBy = null;
                this.lockId = this.el.id || ('lock-' + Math.random().toString(36).substr(2, 9));

                this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
                this.el.addEventListener('grab-end', this.onGrabEnd.bind(this));

                document.body.addEventListener('ownership-update', (evt) => {
                    if (evt.detail.lockId === this.lockId) {
                        this.lockedBy = evt.detail.owner;
                    }
                });
            },
            onGrabStart: function (evt) {
                const myId = NAF.clientId || 'local';
                if (this.lockedBy && this.lockedBy !== myId) {
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
                    this._broadcast();
                });

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
                if (time - this.lastBroadcast < 80) return;
                this.lastBroadcast = time;
                this._broadcast();
            },
            _broadcast: function () {
                if (!NAF.connection || !NAF.connection.isConnected()) return;

                const p = this.el.object3D.position;
                const r = this.el.object3D.rotation;
                const s = this.el.object3D.scale;

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
                if (!this._subscribed && NAF.connection && NAF.connection.isConnected()) {
                    this._subscribe();
                    this._subscribed = true;
                }

                if (time - this.lastBroadcast < 100) return;
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

                const rightCtrl = document.getElementById('right-controller');
                if (!rightCtrl) return;

                const raycaster = rightCtrl.components.raycaster;
                if (!raycaster) return;

                const intersections = raycaster.intersections;
                if (intersections && intersections.length > 0) {
                    const pt = intersections[0].point;
                    const head = document.querySelector('#rig .head');
                    const color = head ? head.getAttribute('material').color : '#059669';

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
                    const dot = document.createElement('a-sphere');
                    dot.setAttribute('radius', '0.04');
                    dot.setAttribute('class', 'remote-pointer');
                    dot.setAttribute('material', {
                        color: data.color || '#34d399',
                        emissive: data.color || '#34d399',
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

    // ─────────────────────────────────────────────
    // VISUAL SETTINGS SLIDERS LOGIC
    // ─────────────────────────────────────────────
    function initVisualSettings() {
        const cityScaleSlider = document.getElementById('setting-city-scale');
        const heightScaleSlider = document.getElementById('setting-building-height');
        const thicknessScaleSlider = document.getElementById('setting-building-thickness');

        const valCityScale = document.getElementById('val-city-scale');
        const valHeightScale = document.getElementById('val-building-height');
        const valThicknessScale = document.getElementById('val-building-thickness');

        if (!cityScaleSlider || !heightScaleSlider || !thicknessScaleSlider) {
            console.warn('[VisualSettings] Sliders not found in DOM');
            return;
        }

        // Helper to update labels and apply A-Frame scaling
        function applyScaling() {
            const cityScale = parseFloat(cityScaleSlider.value);
            const heightScale = parseFloat(heightScaleSlider.value);
            const thicknessScale = parseFloat(thicknessScaleSlider.value);

            // Update text readouts
            if (valCityScale) valCityScale.textContent = `${cityScale.toFixed(1)}x`;
            if (valHeightScale) valHeightScale.textContent = `${heightScale.toFixed(2)}x`;
            if (valThicknessScale) valThicknessScale.textContent = `${thicknessScale.toFixed(2)}x`;

            const cityEl = document.getElementById('code-city');
            if (cityEl) {
                // Scale container (X and Z = city layout size, Y = building height)
                cityEl.setAttribute('scale', `${cityScale} ${heightScale} ${cityScale}`);

                // Scale individual building widths/depths (X/Z) relative to their base positions
                const buildings = cityEl.querySelectorAll('.code-building');
                buildings.forEach(b => {
                    b.setAttribute('scale', `${thicknessScale} 1 ${thicknessScale}`);
                });
            }
        }

        // Attach listeners
        cityScaleSlider.addEventListener('input', applyScaling);
        heightScaleSlider.addEventListener('input', applyScaling);
        thicknessScaleSlider.addEventListener('input', applyScaling);

        // Expose applyScaling globally so code-city.js can run it after rendering layout
        window.applyVisualSettings = applyScaling;

        // Run initial update
        applyScaling();
    }

    // ─────────────────────────────────────────────
    // SCENE INITIALIZATION
    // ─────────────────────────────────────────────
    const scene = document.getElementById('github-scene');

    // Configure NAF with dynamic room name
    const nafRoom = roomId ? `github-${roomId}` : 'github-default';
    scene.setAttribute('networked-scene', {
        room: nafRoom,
        debug: true,
        adapter: 'easyrtc',
        audio: true,
        serverURL: '/',
    });

    // Back to lobby link
    document.getElementById('back-lobby').href = `../lobby.html?username=${encodeURIComponent(username)}`;

    // Set loading repo name
    if (loadingRepoName) {
        loadingRepoName.textContent = roomId ? `Room: ${roomId}` : '';
    }

    scene.addEventListener('loaded', function () {
        console.log('[GitHubScene] Scene loaded ✨');

        // Initialize visual settings HUD sliders
        initVisualSettings();

        // Set username on avatar
        const nametag = document.querySelector('#rig .nametag');
        if (nametag) nametag.setAttribute('text', 'value', username);

        const head = document.querySelector('#rig .head');
        if (head) {
            const hue = Math.floor(Math.random() * 360);
            head.setAttribute('material', 'color', `hsl(${hue}, 70%, 60%)`);
        }

        // Generate grid
        generateGrid();

        // Inject BabiaXR charts
        injectBabiaCharts();

        // Load repo data for HUD and metrics
        setTimeout(loadRepoData, 1000);
    });

    // ─── Audio Context resume on click ───────────
    document.body.addEventListener('click', () => {
        if (scene && scene.audioListener && scene.audioListener.context && scene.audioListener.context.state === 'suspended') {
            scene.audioListener.context.resume();
        }
    });

})();
