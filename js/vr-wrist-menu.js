/**
 * vr-wrist-menu.js — A-Frame Component for the VR Wrist Menu
 * Proposal D: Smart Folder Tree for file teleportation.
 * Shows directories first; tap a directory to expand its files;
 * tap a file to fly to it. Paginated for large repos.
 */

AFRAME.registerComponent('vr-wrist-menu', {
    init: function () {
        this.isVisible = true;

        // Navigation state
        this._currentDir = null;  // null = root view (show folders)
        this._page = 0;
        this._itemsPerPage = 4;
        this._dirList = [];       // sorted directory names
        this._filesByDir = {};    // { dirName: [building, ...] }
        this._rootFiles = [];     // files at the root level

        // Container attached to the controller
        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', '0 0.16 0.06');
        this.container.setAttribute('rotation', '-45 0 0');
        this.el.appendChild(this.container);

        this._buildUI();

        // Wait for city data to load
        var self = this;
        var attempts = 0;
        var loadInterval = setInterval(function () {
            if (window.CodeCity && window.CodeCity.layout && window.CodeCity.layout.buildings) {
                self._indexBuildings();
                self._renderCurrentView();
                clearInterval(loadInterval);
            }
            attempts++;
            if (attempts > 30) clearInterval(loadInterval);
        }, 1000);
    },

    // ─────────────────────────────────────────────
    //  INDEX BUILDINGS BY DIRECTORY
    // ─────────────────────────────────────────────
    _indexBuildings: function () {
        var buildings = window.CodeCity.layout.buildings;
        if (!buildings) return;

        this._filesByDir = {};
        this._rootFiles = [];

        var self = this;
        buildings.forEach(function (b) {
            var dir = b.directory || '';
            if (!dir || dir === '' || dir === 'root' || dir === '.') {
                self._rootFiles.push(b);
            } else {
                if (!self._filesByDir[dir]) {
                    self._filesByDir[dir] = [];
                }
                self._filesByDir[dir].push(b);
            }
        });

        // Sort directories alphabetically
        this._dirList = Object.keys(this._filesByDir).sort();

        // Sort files within each directory by LOC (descending)
        this._dirList.forEach(function (dir) {
            self._filesByDir[dir].sort(function (a, b) { return (b.loc || 0) - (a.loc || 0); });
        });
        this._rootFiles.sort(function (a, b) { return (b.loc || 0) - (a.loc || 0); });

        console.log('[WristMenu] Indexed ' + buildings.length + ' files in ' + this._dirList.length + ' directories');
    },

    // ─────────────────────────────────────────────
    //  RENDER CURRENT VIEW
    // ─────────────────────────────────────────────
    _renderCurrentView: function () {
        // Clear list container
        while (this._listContainer.firstChild) {
            this._listContainer.removeChild(this._listContainer.firstChild);
        }

        if (this._currentDir === null) {
            this._renderFolderList();
        } else {
            this._renderFileList();
        }
    },

    _renderFolderList: function () {
        // Build a combined list: directories + root files
        var items = [];
        var self = this;

        // Add directories as items
        this._dirList.forEach(function (dirName) {
            var fileCount = self._filesByDir[dirName].length;
            items.push({ type: 'dir', name: dirName, count: fileCount });
        });

        // Add root files at the end
        this._rootFiles.forEach(function (b) {
            items.push({ type: 'file', building: b });
        });

        var totalPages = Math.max(1, Math.ceil(items.length / this._itemsPerPage));
        this._page = Math.min(this._page, totalPages - 1);

        var start = this._page * this._itemsPerPage;
        var end = Math.min(start + this._itemsPerPage, items.length);
        var pageItems = items.slice(start, end);

        // Update header
        this._headerLabel.setAttribute('value', 'Carpetas');
        this._backBtn.setAttribute('visible', false);
        this._pageLabel.setAttribute('value', (this._page + 1) + '/' + totalPages);

        // Render items
        pageItems.forEach(function (item, idx) {
            var y = -idx * 0.06;
            if (item.type === 'dir') {
                self._createDirRow(item.name, item.count, y);
            } else {
                self._createFileRow(item.building, y);
            }
        });
    },

    _renderFileList: function () {
        var files = this._filesByDir[this._currentDir] || [];
        var totalPages = Math.max(1, Math.ceil(files.length / this._itemsPerPage));
        this._page = Math.min(this._page, totalPages - 1);

        var start = this._page * this._itemsPerPage;
        var end = Math.min(start + this._itemsPerPage, files.length);
        var pageFiles = files.slice(start, end);

        // Update header
        var dirLabel = this._currentDir.length > 18
            ? '...' + this._currentDir.substring(this._currentDir.length - 15)
            : this._currentDir;
        this._headerLabel.setAttribute('value', dirLabel);
        this._backBtn.setAttribute('visible', true);
        this._pageLabel.setAttribute('value', (this._page + 1) + '/' + totalPages);

        var self = this;
        pageFiles.forEach(function (b, idx) {
            var y = -idx * 0.06;
            self._createFileRow(b, y);
        });
    },

    // ─────────────────────────────────────────────
    //  ROW BUILDERS
    // ─────────────────────────────────────────────
    _createDirRow: function (dirName, fileCount, y) {
        var self = this;
        var row = document.createElement('a-plane');
        row.setAttribute('width', '0.30');
        row.setAttribute('height', '0.05');
        row.setAttribute('position', '0 ' + y + ' 0.01');
        row.setAttribute('class', 'sh-hitbox');
        row.setAttribute('material', 'color: #1e293b; opacity: 0.95');

        // Folder icon (small square)
        var icon = document.createElement('a-plane');
        icon.setAttribute('width', '0.018');
        icon.setAttribute('height', '0.014');
        icon.setAttribute('position', '-0.13 0 0.002');
        icon.setAttribute('material', 'color: #fbbf24; opacity: 1');
        row.appendChild(icon);

        // Directory name
        var shortName = dirName.length > 16 ? dirName.substring(0, 13) + '...' : dirName;
        var text = document.createElement('a-text');
        text.setAttribute('value', shortName);
        text.setAttribute('align', 'left');
        text.setAttribute('color', '#e2e8f0');
        text.setAttribute('scale', '0.065 0.065 0.065');
        text.setAttribute('position', '-0.11 0.005 0.002');
        row.appendChild(text);

        // File count badge
        var badge = document.createElement('a-text');
        badge.setAttribute('value', fileCount + ' archivos');
        badge.setAttribute('align', 'right');
        badge.setAttribute('color', '#64748b');
        badge.setAttribute('scale', '0.05 0.05 0.05');
        badge.setAttribute('position', '0.13 0.005 0.002');
        row.appendChild(badge);

        // Hover
        row.addEventListener('mouseenter', function () {
            row.setAttribute('material', 'color', '#334155');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        row.addEventListener('mouseleave', function () {
            row.setAttribute('material', 'color', '#1e293b');
        });

        // Click → expand directory
        row.addEventListener('click', function (e) {
            e.stopPropagation();
            self._currentDir = dirName;
            self._page = 0;
            self._renderCurrentView();
            if (window.VRHaptics) VRHaptics.click('left');
            if (window.VRSounds) VRSounds.click();
        });

        this._listContainer.appendChild(row);
    },

    _createFileRow: function (building, y) {
        var self = this;
        var row = document.createElement('a-plane');
        row.setAttribute('width', '0.30');
        row.setAttribute('height', '0.05');
        row.setAttribute('position', '0 ' + y + ' 0.01');
        row.setAttribute('class', 'sh-hitbox');
        row.setAttribute('material', 'color: #1e293b; opacity: 0.95');

        // Color dot matching the building color
        var dot = document.createElement('a-circle');
        dot.setAttribute('radius', '0.008');
        dot.setAttribute('position', '-0.13 0 0.002');
        dot.setAttribute('material', 'color: ' + (building.color || '#64748b') + '; opacity: 1');
        row.appendChild(dot);

        // File name
        var name = building.fileName;
        var shortName = name.length > 16 ? name.substring(0, 13) + '...' : name;
        var text = document.createElement('a-text');
        text.setAttribute('value', shortName);
        text.setAttribute('align', 'left');
        text.setAttribute('color', '#e2e8f0');
        text.setAttribute('scale', '0.065 0.065 0.065');
        text.setAttribute('position', '-0.11 0.005 0.002');
        row.appendChild(text);

        // LOC badge
        var locBadge = document.createElement('a-text');
        locBadge.setAttribute('value', (building.loc || 0) + ' LOC');
        locBadge.setAttribute('align', 'right');
        locBadge.setAttribute('color', '#64748b');
        locBadge.setAttribute('scale', '0.05 0.05 0.05');
        locBadge.setAttribute('position', '0.13 0.005 0.002');
        row.appendChild(locBadge);

        // Hover
        row.addEventListener('mouseenter', function () {
            row.setAttribute('material', 'color', '#334155');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        row.addEventListener('mouseleave', function () {
            row.setAttribute('material', 'color', '#1e293b');
        });

        // Click → teleport
        row.addEventListener('click', function (e) {
            e.stopPropagation();
            if (window.CodeCity) {
                window.CodeCity.flyToBuilding(building);
                if (window.VRHaptics) VRHaptics.success('left');
                if (window.VRSounds) VRSounds.success();
            }
        });

        this._listContainer.appendChild(row);
    },

    // ─────────────────────────────────────────────
    //  BUILD THE MAIN UI FRAME
    // ─────────────────────────────────────────────
    _buildUI: function () {
        var W = 0.34;
        var H = 0.42;
        var self = this;

        // Background panel
        var bg = document.createElement('a-plane');
        bg.setAttribute('width', W);
        bg.setAttribute('height', H);
        bg.setAttribute('material', 'color: #0f172a; opacity: 0.92; transparent: true; side: double');
        this.container.appendChild(bg);

        // Subtle border glow
        var border = document.createElement('a-plane');
        border.setAttribute('width', W + 0.008);
        border.setAttribute('height', H + 0.008);
        border.setAttribute('position', '0 0 -0.002');
        border.setAttribute('material', 'color: #ffffff; opacity: 0.06; transparent: true; side: double');
        this.container.appendChild(border);

        // ── Header Section ──
        var headerY = H / 2 - 0.035;

        // Back button (hidden by default, shown when inside a directory)
        this._backBtn = document.createElement('a-plane');
        this._backBtn.setAttribute('width', '0.04');
        this._backBtn.setAttribute('height', '0.03');
        this._backBtn.setAttribute('position', (-W / 2 + 0.04) + ' ' + headerY + ' 0.01');
        this._backBtn.setAttribute('class', 'sh-hitbox');
        this._backBtn.setAttribute('material', 'color: #334155; opacity: 0.9');
        this._backBtn.setAttribute('visible', false);

        var backText = document.createElement('a-text');
        backText.setAttribute('value', '<');
        backText.setAttribute('align', 'center');
        backText.setAttribute('color', '#ffffff');
        backText.setAttribute('scale', '0.08 0.08 0.08');
        backText.setAttribute('position', '0 0 0.002');
        this._backBtn.appendChild(backText);

        this._backBtn.addEventListener('mouseenter', function () {
            self._backBtn.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        this._backBtn.addEventListener('mouseleave', function () {
            self._backBtn.setAttribute('material', 'color', '#334155');
        });
        this._backBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self._currentDir = null;
            self._page = 0;
            self._renderCurrentView();
            if (window.VRHaptics) VRHaptics.click('left');
        });
        this.container.appendChild(this._backBtn);

        // Header label
        this._headerLabel = document.createElement('a-text');
        this._headerLabel.setAttribute('value', 'Carpetas');
        this._headerLabel.setAttribute('align', 'center');
        this._headerLabel.setAttribute('color', '#ffffff');
        this._headerLabel.setAttribute('scale', '0.10 0.10 0.10');
        this._headerLabel.setAttribute('position', '0 ' + headerY + ' 0.01');
        this.container.appendChild(this._headerLabel);

        // Separator
        var sep = document.createElement('a-plane');
        sep.setAttribute('width', W - 0.04);
        sep.setAttribute('height', '0.001');
        sep.setAttribute('position', '0 ' + (headerY - 0.03) + ' 0.005');
        sep.setAttribute('material', 'color: #ffffff; opacity: 0.12; transparent: true');
        this.container.appendChild(sep);

        // ── List Container ──
        this._listContainer = document.createElement('a-entity');
        this._listContainer.setAttribute('position', '0 ' + (headerY - 0.07) + ' 0');
        this.container.appendChild(this._listContainer);

        // ── Pagination ──
        var navY = -H / 2 + 0.06;

        // Prev
        var prevBtn = document.createElement('a-plane');
        prevBtn.setAttribute('width', '0.04');
        prevBtn.setAttribute('height', '0.03');
        prevBtn.setAttribute('position', '-0.07 ' + navY + ' 0.01');
        prevBtn.setAttribute('class', 'sh-hitbox');
        prevBtn.setAttribute('material', 'color: #334155; opacity: 0.9');
        var prevText = document.createElement('a-text');
        prevText.setAttribute('value', '<');
        prevText.setAttribute('align', 'center');
        prevText.setAttribute('color', '#ffffff');
        prevText.setAttribute('scale', '0.07 0.07 0.07');
        prevText.setAttribute('position', '0 0 0.002');
        prevBtn.appendChild(prevText);
        prevBtn.addEventListener('mouseenter', function () {
            prevBtn.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        prevBtn.addEventListener('mouseleave', function () {
            prevBtn.setAttribute('material', 'color', '#334155');
        });
        prevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (self._page > 0) {
                self._page--;
                self._renderCurrentView();
            }
        });
        this.container.appendChild(prevBtn);

        // Page label
        this._pageLabel = document.createElement('a-text');
        this._pageLabel.setAttribute('value', '1/1');
        this._pageLabel.setAttribute('align', 'center');
        this._pageLabel.setAttribute('color', '#94a3b8');
        this._pageLabel.setAttribute('scale', '0.07 0.07 0.07');
        this._pageLabel.setAttribute('position', '0 ' + navY + ' 0.01');
        this.container.appendChild(this._pageLabel);

        // Next
        var nextBtn = document.createElement('a-plane');
        nextBtn.setAttribute('width', '0.04');
        nextBtn.setAttribute('height', '0.03');
        nextBtn.setAttribute('position', '0.07 ' + navY + ' 0.01');
        nextBtn.setAttribute('class', 'sh-hitbox');
        nextBtn.setAttribute('material', 'color: #334155; opacity: 0.9');
        var nextText = document.createElement('a-text');
        nextText.setAttribute('value', '>');
        nextText.setAttribute('align', 'center');
        nextText.setAttribute('color', '#ffffff');
        nextText.setAttribute('scale', '0.07 0.07 0.07');
        nextText.setAttribute('position', '0 0 0.002');
        nextBtn.appendChild(nextText);
        nextBtn.addEventListener('mouseenter', function () {
            nextBtn.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        nextBtn.addEventListener('mouseleave', function () {
            nextBtn.setAttribute('material', 'color', '#334155');
        });
        nextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self._page++;
            self._renderCurrentView();
        });
        this.container.appendChild(nextBtn);

        // ── Teleport Origin Button ──
        var originY = -H / 2 + 0.025;
        var originBtn = document.createElement('a-plane');
        originBtn.setAttribute('width', '0.12');
        originBtn.setAttribute('height', '0.03');
        originBtn.setAttribute('position', '0 ' + originY + ' 0.01');
        originBtn.setAttribute('class', 'sh-hitbox');
        originBtn.setAttribute('material', 'color: #334155; opacity: 0.9');
        var originText = document.createElement('a-text');
        originText.setAttribute('value', 'Volver al Origen');
        originText.setAttribute('align', 'center');
        originText.setAttribute('color', '#94a3b8');
        originText.setAttribute('scale', '0.055 0.055 0.055');
        originText.setAttribute('position', '0 0 0.002');
        originBtn.appendChild(originText);
        originBtn.addEventListener('mouseenter', function () {
            originBtn.setAttribute('material', 'color', '#60a5fa');
            if (window.VRHaptics) VRHaptics.tick('left');
        });
        originBtn.addEventListener('mouseleave', function () {
            originBtn.setAttribute('material', 'color', '#334155');
        });
        originBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var rig = document.querySelector('#rig');
            if (rig) rig.setAttribute('position', '0 0 5');
            if (window.VRHaptics) VRHaptics.success('left');
        });
        this.container.appendChild(originBtn);
    }
});
