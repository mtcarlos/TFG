/**
 * vr-dashboard-panel.js — A-Frame Component for the VR Dashboard Gadget
 * A floating UI panel with two tabs:
 *   - Datos: Repo metrics, languages, contributors, file types
 *   - Time Machine: Commit history navigation and time travel
 */

AFRAME.registerComponent('vr-dashboard-panel', {
    schema: {
        roomId: { type: 'string', default: '' }
    },

    init: function () {
        var urlParams = new URLSearchParams(window.location.search);
        this.roomId = this.data.roomId || urlParams.get('room');

        this.isVisible = false;
        this.el.setAttribute('visible', this.isVisible);

        this.commits = [];
        this.currentTab = 'datos'; // 'datos' | 'timemachine'

        this._buildUI();
        this._fetchCommits();
        this._bindEvents();

        // Delay loading repo data to allow scene to fetch it first
        var self = this;
        setTimeout(function () { self._populateRepoData(); }, 3000);

        // Also listen for repo data updates
        document.addEventListener('repo-data-loaded', function () {
            self._populateRepoData();
        });
    },

    // ─────────────────────────────────────────────
    //  BUILD THE 3D UI
    // ─────────────────────────────────────────────
    _buildUI: function () {
        var W = 1.4;
        var H = 1.0;
        this._panelW = W;
        this._panelH = H;

        this.container = document.createElement('a-entity');
        this.el.appendChild(this.container);

        // Background
        var bg = document.createElement('a-plane');
        bg.setAttribute('width', W);
        bg.setAttribute('height', H);
        bg.setAttribute('material', 'color: #161618; opacity: 0.85; transparent: true; side: double');
        this.container.appendChild(bg);

        // Border glow
        var borderGlow = document.createElement('a-plane');
        borderGlow.setAttribute('width', W + 0.015);
        borderGlow.setAttribute('height', H + 0.015);
        borderGlow.setAttribute('position', '0 0 -0.002');
        borderGlow.setAttribute('material', 'color: #ffffff; opacity: 0.08; transparent: true; side: double');
        this.container.appendChild(borderGlow);

        // Title
        var title = document.createElement('a-text');
        title.setAttribute('value', 'VR Dashboard');
        title.setAttribute('position', (-W / 2 + 0.12) + ' ' + (H / 2 - 0.06) + ' 0.01');
        title.setAttribute('align', 'left');
        title.setAttribute('color', '#ffffff');
        title.setAttribute('scale', '0.18 0.18 0.18');
        this.container.appendChild(title);

        // Close Button
        var closeBtn = this._createCloseButton(W, H);
        this.container.appendChild(closeBtn);

        // ── TAB BUTTONS ──
        var tabY = H / 2 - 0.14;
        this._tabDatos = this._createTabBtn('Datos', -0.2, tabY, true);
        this._tabTimeMachine = this._createTabBtn('Time Machine', 0.2, tabY, false);
        this.container.appendChild(this._tabDatos);
        this.container.appendChild(this._tabTimeMachine);

        var self = this;
        this._tabDatos.addEventListener('click', function (e) {
            e.stopPropagation();
            self._switchTab('datos');
        });
        this._tabTimeMachine.addEventListener('click', function (e) {
            e.stopPropagation();
            self._switchTab('timemachine');
        });

        // Tab separator line
        var tabSep = document.createElement('a-plane');
        tabSep.setAttribute('width', W - 0.1);
        tabSep.setAttribute('height', '0.001');
        tabSep.setAttribute('position', '0 ' + (tabY - 0.045) + ' 0.005');
        tabSep.setAttribute('material', 'color: #ffffff; opacity: 0.15; transparent: true');
        this.container.appendChild(tabSep);

        // ── DATOS CONTENT ──
        this._datosContainer = document.createElement('a-entity');
        this._datosContainer.setAttribute('position', '0 0 0');
        this.container.appendChild(this._datosContainer);
        this._buildDatosTab(W, H);

        // ── TIME MACHINE CONTENT ──
        this._tmContainer = document.createElement('a-entity');
        this._tmContainer.setAttribute('position', '0 0 0');
        this._tmContainer.setAttribute('visible', false);
        this.container.appendChild(this._tmContainer);
        this._buildTimeMachineTab(W, H);
    },

    _createCloseButton: function (W, H) {
        var closeBtn = document.createElement('a-plane');
        closeBtn.setAttribute('width', '0.1');
        closeBtn.setAttribute('height', '0.1');
        closeBtn.setAttribute('position', (W / 2 - 0.08) + ' ' + (H / 2 - 0.06) + ' 0.01');
        closeBtn.setAttribute('class', 'sh-hitbox');
        closeBtn.setAttribute('material', 'color: #18181b; opacity: 0.8');
        var closeText = document.createElement('a-text');
        closeText.setAttribute('value', 'X');
        closeText.setAttribute('align', 'center');
        closeText.setAttribute('color', '#a1a1aa');
        closeText.setAttribute('scale', '0.16 0.16 0.16');
        closeText.setAttribute('position', '0 0 0.005');
        closeBtn.appendChild(closeText);

        var self = this;
        closeBtn.addEventListener('mouseenter', function () {
            closeBtn.setAttribute('material', 'color', '#ef4444');
            closeText.setAttribute('color', '#ffffff');
            if (window.VRHaptics) VRHaptics.tick();
        });
        closeBtn.addEventListener('mouseleave', function () {
            closeBtn.setAttribute('material', 'color', '#18181b');
            closeText.setAttribute('color', '#a1a1aa');
        });
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (window.VRHaptics) VRHaptics.click();
            if (window.VRSounds) VRSounds.click();
            self.toggleVisibility();
        });

        return closeBtn;
    },

    _createTabBtn: function (label, x, y, active) {
        var btn = document.createElement('a-plane');
        btn.setAttribute('width', '0.35');
        btn.setAttribute('height', '0.06');
        btn.setAttribute('position', x + ' ' + y + ' 0.01');
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: ' + (active ? '#3f3f46' : '#18181b') + '; opacity: 0.9');

        var text = document.createElement('a-text');
        text.setAttribute('value', label);
        text.setAttribute('align', 'center');
        text.setAttribute('color', active ? '#ffffff' : '#a1a1aa');
        text.setAttribute('scale', '0.12 0.12 0.12');
        text.setAttribute('position', '0 0 0.005');
        btn.appendChild(text);

        btn.addEventListener('mouseenter', function () {
            if (!btn._isActive) {
                btn.setAttribute('material', 'color', '#27272a');
            }
            if (window.VRHaptics) VRHaptics.tick();
        });
        btn.addEventListener('mouseleave', function () {
            if (!btn._isActive) {
                btn.setAttribute('material', 'color', '#18181b');
            }
        });

        btn._isActive = active;
        return btn;
    },

    _switchTab: function (tab) {
        if (this.currentTab === tab) return;
        this.currentTab = tab;

        var isDatos = (tab === 'datos');
        this._datosContainer.setAttribute('visible', isDatos);
        this._tmContainer.setAttribute('visible', !isDatos);

        // Update tab button styles
        this._tabDatos.setAttribute('material', 'color', isDatos ? '#3f3f46' : '#18181b');
        this._tabDatos.querySelector('a-text').setAttribute('color', isDatos ? '#ffffff' : '#a1a1aa');
        this._tabDatos._isActive = isDatos;

        this._tabTimeMachine.setAttribute('material', 'color', !isDatos ? '#3f3f46' : '#18181b');
        this._tabTimeMachine.querySelector('a-text').setAttribute('color', !isDatos ? '#ffffff' : '#a1a1aa');
        this._tabTimeMachine._isActive = !isDatos;

        if (window.VRHaptics) VRHaptics.click();
        if (window.VRSounds) VRSounds.click();
    },

    // ─────────────────────────────────────────────
    //  DATOS TAB
    // ─────────────────────────────────────────────
    _buildDatosTab: function (W, H) {
        var startY = H / 2 - 0.24;
        var leftX = -W / 2 + 0.12;

        // ── Metrics Section Title ──
        var metricsTitle = document.createElement('a-text');
        metricsTitle.setAttribute('value', 'Metrics');
        metricsTitle.setAttribute('position', leftX + ' ' + startY + ' 0.01');
        metricsTitle.setAttribute('align', 'left');
        metricsTitle.setAttribute('color', '#ffffff');
        metricsTitle.setAttribute('scale', '0.11 0.11 0.11');
        this._datosContainer.appendChild(metricsTitle);

        // Metrics grid (3x2)
        this._metricsGrid = document.createElement('a-entity');
        this._metricsGrid.setAttribute('position', '0 ' + (startY - 0.07) + ' 0');
        this._datosContainer.appendChild(this._metricsGrid);

        // Placeholder metrics
        var metricsDef = [
            { label: 'Stars', key: 'stars', x: -0.4, y: 0 },
            { label: 'Forks', key: 'forks', x: -0.1, y: 0 },
            { label: 'Issues', key: 'issues', x: 0.2, y: 0 },
            { label: 'Contribs', key: 'contribs', x: -0.4, y: -0.06 },
            { label: 'Size', key: 'size', x: -0.1, y: -0.06 },
            { label: 'Langs', key: 'langs', x: 0.2, y: -0.06 }
        ];

        this._metricLabels = {};
        var self = this;
        metricsDef.forEach(function (m) {
            self._createMetricCard(m.label, m.key, m.x, m.y);
        });

        // ── Languages Section ──
        var langY = startY - 0.22;
        var langTitle = document.createElement('a-text');
        langTitle.setAttribute('value', 'Languages');
        langTitle.setAttribute('position', leftX + ' ' + langY + ' 0.01');
        langTitle.setAttribute('align', 'left');
        langTitle.setAttribute('color', '#ffffff');
        langTitle.setAttribute('scale', '0.11 0.11 0.11');
        this._datosContainer.appendChild(langTitle);

        this._langContainer = document.createElement('a-entity');
        this._langContainer.setAttribute('position', '0 ' + (langY - 0.04) + ' 0');
        this._datosContainer.appendChild(this._langContainer);

        // ── Contributors Section ──
        var contribY = langY - 0.22;
        var contribTitle = document.createElement('a-text');
        contribTitle.setAttribute('value', 'Contributors');
        contribTitle.setAttribute('position', leftX + ' ' + contribY + ' 0.01');
        contribTitle.setAttribute('align', 'left');
        contribTitle.setAttribute('color', '#ffffff');
        contribTitle.setAttribute('scale', '0.11 0.11 0.11');
        this._datosContainer.appendChild(contribTitle);

        this._contribContainer = document.createElement('a-entity');
        this._contribContainer.setAttribute('position', '0 ' + (contribY - 0.04) + ' 0');
        this._datosContainer.appendChild(this._contribContainer);

        // ── File Types Section ──
        var ftY = contribY - 0.18;
        var ftTitle = document.createElement('a-text');
        ftTitle.setAttribute('value', 'File Types');
        ftTitle.setAttribute('position', leftX + ' ' + ftY + ' 0.01');
        ftTitle.setAttribute('align', 'left');
        ftTitle.setAttribute('color', '#ffffff');
        ftTitle.setAttribute('scale', '0.11 0.11 0.11');
        this._datosContainer.appendChild(ftTitle);

        this._fileTypesContainer = document.createElement('a-entity');
        this._fileTypesContainer.setAttribute('position', '0 ' + (ftY - 0.04) + ' 0');
        this._datosContainer.appendChild(this._fileTypesContainer);

        // Loading text
        this._datosLoading = document.createElement('a-text');
        this._datosLoading.setAttribute('value', 'Cargando datos...');
        this._datosLoading.setAttribute('position', '0 0 0.01');
        this._datosLoading.setAttribute('align', 'center');
        this._datosLoading.setAttribute('color', '#64748b');
        this._datosLoading.setAttribute('scale', '0.12 0.12 0.12');
        this._datosContainer.appendChild(this._datosLoading);
    },

    _createMetricCard: function (label, key, x, y) {
        // Value
        var val = document.createElement('a-text');
        val.setAttribute('value', '-');
        val.setAttribute('position', x + ' ' + y + ' 0.01');
        val.setAttribute('align', 'center');
        val.setAttribute('color', '#f8fafc');
        val.setAttribute('scale', '0.14 0.14 0.14');
        this._metricsGrid.appendChild(val);

        // Label
        var lbl = document.createElement('a-text');
        lbl.setAttribute('value', label);
        lbl.setAttribute('position', x + ' ' + (y - 0.028) + ' 0.01');
        lbl.setAttribute('align', 'center');
        lbl.setAttribute('color', '#64748b');
        lbl.setAttribute('scale', '0.08 0.08 0.08');
        this._metricsGrid.appendChild(lbl);

        this._metricLabels[key] = val;
    },

    // ─────────────────────────────────────────────
    //  TIME MACHINE TAB
    // ─────────────────────────────────────────────
    _buildTimeMachineTab: function (W, H) {
        var startY = H / 2 - 0.24;
        var self = this;

        // X-RAY TOGGLE
        this.xrayBtn = this._createActionButton('Toggle X-Ray', 0, startY, '#ef4444', 0.8, 0.1);
        this.xrayBtn.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            if (window.CodeCity) {
                var isXRay = window.CodeCity.toggleXRayMode();
                self.xrayBtn.querySelector('a-text').setAttribute('value', isXRay ? 'X-Ray: ON' : 'X-Ray: OFF');
                self.xrayBtn.setAttribute('material', 'color', isXRay ? '#dc2626' : '#334155');
                if (window.VRHaptics) VRHaptics.click('both');
                if (window.VRSounds) VRSounds.click();
            }
        });
        this._tmContainer.appendChild(this.xrayBtn);

        // TIME MACHINE
        var tmTitle = document.createElement('a-text');
        tmTitle.setAttribute('value', 'Viaje en el Tiempo (Commits)');
        tmTitle.setAttribute('position', '-0.3 ' + (startY - 0.1) + ' 0.01');
        tmTitle.setAttribute('align', 'left');
        tmTitle.setAttribute('color', '#ffffff');
        tmTitle.setAttribute('scale', '0.11 0.11 0.11');
        this._tmContainer.appendChild(tmTitle);

        this.commitLabel = document.createElement('a-text');
        this.commitLabel.setAttribute('value', 'Cargando historia...');
        this.commitLabel.setAttribute('position', '0 ' + (startY - 0.2) + ' 0.01');
        this.commitLabel.setAttribute('align', 'center');
        this.commitLabel.setAttribute('color', '#cbd5e1');
        this.commitLabel.setAttribute('scale', '0.1 0.1 0.1');
        this.commitLabel.setAttribute('width', '10');
        this._tmContainer.appendChild(this.commitLabel);

        var navY = startY - 0.3;
        this.btnPrev = this._createActionButton('< Prev', -0.3, navY, '#3b82f6', 0.3, 0.08);
        this.btnNext = this._createActionButton('Next >', 0.3, navY, '#3b82f6', 0.3, 0.08);
        this.btnGo = this._createActionButton('Time Travel', 0, navY, '#10b981', 0.25, 0.08);

        this._tmContainer.appendChild(this.btnPrev);
        this._tmContainer.appendChild(this.btnNext);
        this._tmContainer.appendChild(this.btnGo);

        this.currentCommitIndex = 0;

        this.btnPrev.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            if (self.currentCommitIndex < self.commits.length - 1) {
                self.currentCommitIndex++;
                self._updateCommitLabel();
                if (window.VRHaptics) VRHaptics.tick();
                if (window.VRSounds) VRSounds.hover();
            }
        });

        this.btnNext.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            if (self.currentCommitIndex > 0) {
                self.currentCommitIndex--;
                self._updateCommitLabel();
                if (window.VRHaptics) VRHaptics.tick();
                if (window.VRSounds) VRSounds.hover();
            }
        });

        this.btnGo.addEventListener('mousedown', function (e) {
            e.stopPropagation();
            if (self.commits.length > 0) {
                var commit = self.commits[self.currentCommitIndex];
                self._timeTravel(commit.hash);
            }
        });
    },

    _createActionButton: function (textVal, x, y, hoverColor, width, height) {
        var btn = document.createElement('a-plane');
        btn.setAttribute('width', width);
        btn.setAttribute('height', height);
        btn.setAttribute('position', x + ' ' + y + ' 0.01');
        btn.setAttribute('class', 'sh-hitbox');
        btn.setAttribute('material', 'color: #27272a; opacity: 0.9');

        var text = document.createElement('a-text');
        text.setAttribute('value', textVal);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#f8fafc');
        text.setAttribute('scale', '0.12 0.12 0.12');
        text.setAttribute('position', '0 0 0.01');
        btn.appendChild(text);

        btn.addEventListener('mouseenter', function () {
            btn.setAttribute('material', 'color', hoverColor);
            btn.setAttribute('scale', '1.05 1.05 1');
            if (window.VRHaptics) VRHaptics.tick();
        });
        btn.addEventListener('mouseleave', function () {
            btn.setAttribute('material', 'color', '#27272a');
            btn.setAttribute('scale', '1 1 1');
        });

        return btn;
    },

    // ─────────────────────────────────────────────
    //  POPULATE REPO DATA (Datos tab)
    // ─────────────────────────────────────────────
    _populateRepoData: function () {
        var data = window._repoData;
        if (!data) return;

        // Hide loading text
        if (this._datosLoading) {
            this._datosLoading.setAttribute('visible', false);
        }

        // ── Metrics ──
        var formatNum = function (n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
            return String(n || 0);
        };

        if (this._metricLabels.stars) this._metricLabels.stars.setAttribute('value', formatNum(data.stars || 0));
        if (this._metricLabels.forks) this._metricLabels.forks.setAttribute('value', formatNum(data.forks || 0));
        if (this._metricLabels.issues) this._metricLabels.issues.setAttribute('value', formatNum(data.openIssues || 0));
        if (this._metricLabels.contribs) this._metricLabels.contribs.setAttribute('value', formatNum(data.contributors ? data.contributors.length : 0));
        if (this._metricLabels.size) {
            var sizeStr = data.size ? (data.size > 1024 ? (data.size / 1024).toFixed(1) + 'MB' : data.size + 'KB') : '-';
            this._metricLabels.size.setAttribute('value', sizeStr);
        }
        if (this._metricLabels.langs) this._metricLabels.langs.setAttribute('value', String(data.languages ? data.languages.length : 0));

        // ── Languages (top 5) ──
        this._populateLanguages(data);

        // ── Contributors (top 5) ──
        this._populateContributors(data);

        // ── File Types ──
        this._populateFileTypes();
    },

    _populateLanguages: function (data) {
        if (!this._langContainer || !data.languages || data.languages.length === 0) return;

        // Clear
        while (this._langContainer.firstChild) {
            this._langContainer.removeChild(this._langContainer.firstChild);
        }

        var total = data.languages.reduce(function (sum, l) { return sum + (l.value || l.percentage || 0); }, 0);
        var top5 = data.languages.slice(0, 5);
        var leftX = -this._panelW / 2 + 0.12;
        var maxBarW = 0.25;
        var COLORS = window.LANGUAGE_COLORS || {};

        top5.forEach(function (lang, idx) {
            var y = -idx * 0.032;
            var name = lang.key || lang.name || lang.language || '?';
            var rawVal = lang.value || lang.percentage || 0;
            var pct = total > 0 ? ((rawVal / total) * 100) : 0;
            var color = lang.color || COLORS[name] || '#64748b';

            // Color dot
            var dot = document.createElement('a-circle');
            dot.setAttribute('radius', '0.006');
            dot.setAttribute('position', leftX + ' ' + y + ' 0.01');
            dot.setAttribute('material', 'color: ' + color);
            this._langContainer.appendChild(dot);

            // Name
            var nameText = document.createElement('a-text');
            nameText.setAttribute('value', name);
            nameText.setAttribute('position', (leftX + 0.02) + ' ' + y + ' 0.01');
            nameText.setAttribute('align', 'left');
            nameText.setAttribute('color', '#cbd5e1');
            nameText.setAttribute('scale', '0.08 0.08 0.08');
            this._langContainer.appendChild(nameText);

            // Bar
            var barW = Math.max(0.02, (pct / 100) * maxBarW);
            var bar = document.createElement('a-plane');
            bar.setAttribute('width', barW);
            bar.setAttribute('height', '0.015');
            bar.setAttribute('position', (0.12 + barW / 2) + ' ' + y + ' 0.01');
            bar.setAttribute('material', 'color: ' + color + '; opacity: 0.7');
            this._langContainer.appendChild(bar);

            // Percentage
            var pctText = document.createElement('a-text');
            pctText.setAttribute('value', pct.toFixed(1) + '%');
            pctText.setAttribute('position', (this._panelW / 2 - 0.08) + ' ' + y + ' 0.01');
            pctText.setAttribute('align', 'right');
            pctText.setAttribute('color', '#64748b');
            pctText.setAttribute('scale', '0.06 0.06 0.06');
            this._langContainer.appendChild(pctText);
        }.bind(this));
    },

    _populateContributors: function (data) {
        if (!this._contribContainer || !data.contributors || data.contributors.length === 0) return;

        while (this._contribContainer.firstChild) {
            this._contribContainer.removeChild(this._contribContainer.firstChild);
        }

        var maxCommits = Math.max.apply(null, data.contributors.map(function (c) { return c.value || c.contributions || 0; }));
        var top5 = data.contributors.slice(0, 5);
        var leftX = -this._panelW / 2 + 0.12;

        top5.forEach(function (contrib, idx) {
            var y = -idx * 0.03;
            var name = contrib.key || contrib.login || contrib.name || '?';
            var commits = contrib.value || contrib.contributions || 0;
            var displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;

            // Initials circle
            var initials = name.substring(0, 2).toUpperCase();
            var initialsText = document.createElement('a-text');
            initialsText.setAttribute('value', initials);
            initialsText.setAttribute('position', leftX + ' ' + y + ' 0.01');
            initialsText.setAttribute('align', 'center');
            initialsText.setAttribute('color', '#a1a1aa');
            initialsText.setAttribute('scale', '0.065 0.065 0.065');
            this._contribContainer.appendChild(initialsText);

            // Name
            var nameText = document.createElement('a-text');
            nameText.setAttribute('value', displayName);
            nameText.setAttribute('position', (leftX + 0.04) + ' ' + y + ' 0.01');
            nameText.setAttribute('align', 'left');
            nameText.setAttribute('color', '#cbd5e1');
            nameText.setAttribute('scale', '0.065 0.065 0.065');
            this._contribContainer.appendChild(nameText);

            // Commits count
            var commitsText = document.createElement('a-text');
            commitsText.setAttribute('value', commits + ' commits');
            commitsText.setAttribute('position', (this._panelW / 2 - 0.08) + ' ' + y + ' 0.01');
            commitsText.setAttribute('align', 'right');
            commitsText.setAttribute('color', '#64748b');
            commitsText.setAttribute('scale', '0.06 0.06 0.06');
            this._contribContainer.appendChild(commitsText);
        }.bind(this));
    },

    _populateFileTypes: function () {
        if (!this._fileTypesContainer) return;
        if (!window.CodeCity || !window.CodeCity.layout || !window.CodeCity.layout.buildings) {
            // Retry in a few seconds if CodeCity hasn't loaded yet
            var self = this;
            setTimeout(function () { self._populateFileTypes(); }, 5000);
            return;
        }

        while (this._fileTypesContainer.firstChild) {
            this._fileTypesContainer.removeChild(this._fileTypesContainer.firstChild);
        }

        var buildings = window.CodeCity.getBuildings();
        var extStats = {};
        var totalLOC = 0;

        buildings.forEach(function (b) {
            var ext = b.extension || 'None';
            if (!extStats[ext]) {
                extStats[ext] = { loc: 0, color: b.color };
            }
            extStats[ext].loc += (b.loc || 0);
            totalLOC += (b.loc || 0);
        });

        var extArray = Object.keys(extStats).map(function (ext) {
            return { name: ext, loc: extStats[ext].loc, color: extStats[ext].color };
        }).sort(function (a, b) { return b.loc - a.loc; });

        var top5 = extArray.slice(0, 5);
        var leftX = -this._panelW / 2 + 0.12;
        var maxBarW = 0.35;

        top5.forEach(function (stat, idx) {
            var y = -idx * 0.032;
            var pct = totalLOC > 0 ? ((stat.loc / totalLOC) * 100) : 0;
            var color = stat.color || '#64748b';

            // Color dot
            var dot = document.createElement('a-circle');
            dot.setAttribute('radius', '0.006');
            dot.setAttribute('position', leftX + ' ' + y + ' 0.01');
            dot.setAttribute('material', 'color: ' + color);
            this._fileTypesContainer.appendChild(dot);

            // Name
            var nameText = document.createElement('a-text');
            nameText.setAttribute('value', stat.name);
            nameText.setAttribute('position', (leftX + 0.02) + ' ' + y + ' 0.01');
            nameText.setAttribute('align', 'left');
            nameText.setAttribute('color', '#cbd5e1');
            nameText.setAttribute('scale', '0.065 0.065 0.065');
            this._fileTypesContainer.appendChild(nameText);

            // Bar
            var barW = Math.max(0.02, (pct / 100) * maxBarW);
            var bar = document.createElement('a-plane');
            bar.setAttribute('width', barW);
            bar.setAttribute('height', '0.015');
            bar.setAttribute('position', (0.12 + barW / 2) + ' ' + y + ' 0.01');
            bar.setAttribute('material', 'color: ' + color + '; opacity: 0.7');
            this._fileTypesContainer.appendChild(bar);

            // Percentage
            var pctText = document.createElement('a-text');
            pctText.setAttribute('value', pct.toFixed(1) + '%');
            pctText.setAttribute('position', (this._panelW / 2 - 0.08) + ' ' + y + ' 0.01');
            pctText.setAttribute('align', 'right');
            pctText.setAttribute('color', '#64748b');
            pctText.setAttribute('scale', '0.06 0.06 0.06');
            this._fileTypesContainer.appendChild(pctText);
        }.bind(this));
    },

    // ─────────────────────────────────────────────
    //  TIME MACHINE LOGIC
    // ─────────────────────────────────────────────
    _updateCommitLabel: function () {
        if (this.commits.length === 0) {
            this.commitLabel.setAttribute('value', 'No hay commits disponibles');
            return;
        }
        var commit = this.commits[this.currentCommitIndex];
        var msg = commit.message.length > 40 ? commit.message.substring(0, 37) + '...' : commit.message;
        this.commitLabel.setAttribute('value', commit.date + '\n' + msg);
    },

    _fetchCommits: async function () {
        if (!this.roomId) return;
        try {
            var res = await fetch('/api/rooms/' + this.roomId + '/commits');
            var data = await res.json();
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

    _timeTravel: async function (sha) {
        this.btnGo.querySelector('a-text').setAttribute('value', '...');
        try {
            var postRes = await fetch('/api/rooms/' + this.roomId + '/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commitSha: sha })
            });

            if (!postRes.ok) throw new Error('Checkout failed');
            var postData = await postRes.json();

            if (postData.success && postData.layout && window.CodeCity) {
                var container = document.getElementById('code-city');
                if (container) container.innerHTML = '';

                window.CodeCity.layout = postData.layout;
                window.CodeCity._renderCity();
                window.CodeCity._updateRaycasters();

                if (window.CodeCity.isXRayMode) {
                    window.CodeCity.isXRayMode = false;
                    window.CodeCity.toggleXRayMode();
                }

                if (window.VRHaptics) VRHaptics.success('both');
                if (window.VRSounds) VRSounds.success();

                // Refresh file types after time travel
                var self = this;
                setTimeout(function () { self._populateFileTypes(); }, 1000);
            }
        } catch (err) {
            console.error('[VRDashboard] Time Travel error:', err);
            if (window.VRHaptics) VRHaptics.error('both');
            if (window.VRSounds) VRSounds.error();
        } finally {
            this.btnGo.querySelector('a-text').setAttribute('value', 'Time Travel');
        }
    },

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────
    _bindEvents: function () {
        var self = this;
        var toggle = function () { self.toggleVisibility(); };

        var bindControllers = function () {
            var rightController = document.querySelector('#right-controller');
            if (rightController) {
                rightController.addEventListener('bbuttondown', toggle);
            }
        };

        bindControllers();
        document.querySelector('a-scene').addEventListener('loaded', bindControllers);
    },

    toggleVisibility: function () {
        this.isVisible = !this.isVisible;
        this.el.setAttribute('visible', this.isVisible);

        // Feedback
        if (window.VRSounds) VRSounds.swoosh();
        if (window.VRHaptics) VRHaptics.click('both');

        if (this.isVisible) {
            var cameraEl = document.querySelector('#player');
            if (cameraEl && AFRAME && AFRAME.THREE) {
                var cam3D = cameraEl.object3D;
                var pos = new AFRAME.THREE.Vector3();
                var dir = new AFRAME.THREE.Vector3();

                cam3D.getWorldPosition(pos);
                cam3D.getWorldDirection(dir);

                // Spawn the panel 1.5m in front of the user
                var panelPos = pos.clone().add(dir.multiplyScalar(1.5));
                panelPos.y += 0.2;

                // Convert world position to local space of the rig
                this.el.parentEl.object3D.worldToLocal(panelPos);

                this.el.setAttribute('position', panelPos);
                this.el.object3D.lookAt(pos);
            }

            // Refresh repo data when opening
            this._populateRepoData();
        }
    }
});
