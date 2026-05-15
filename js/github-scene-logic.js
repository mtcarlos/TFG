/**
 * github-scene-logic.js — Logic for the GitHub Explorer A-Frame scene
 * Handles: avatar networking, repo data fetching, and the 3D info panel
 */

// ─── Connected event ─────────────────────────────────────────
document.body.addEventListener('connected', function (evt) {
    console.log('connected event. clientId =', evt.detail.clientId);
});

// ─── NAF Schema for avatars ──────────────────────────────────
NAF.schemas.getComponentsOriginal = NAF.schemas.getComponents;
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

// ─── Shared components (same as scene-logic.js) ──────────────

AFRAME.registerComponent('player-info', {
    init: function () {
        var urlParams = new URLSearchParams(window.location.search);
        var username = urlParams.get('username') || 'Anonymous';
        var nametag = this.el.querySelector('.nametag');
        if (nametag) {
            nametag.setAttribute('value', username);
        }
    }
});

AFRAME.registerComponent('face-camera', {
    init: function () {
        this.target = new THREE.Vector3();
    },
    tick: function () {
        var camera = this.el.sceneEl.camera;
        if (camera) {
            var pos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(pos);
            var target = new THREE.Vector3();
            camera.getWorldPosition(target);
            target.y = pos.y;
            this.el.object3D.lookAt(target);
            this.el.object3D.rotateY(Math.PI);
        }
    }
});

AFRAME.registerComponent('simple-random-color', {
    init: function () {
        this.el.setAttribute('material', 'color', getRandomColor());
    }
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

AFRAME.registerComponent('spawn-in-circle', {
    schema: {
        radius: { type: 'number', default: 1 }
    },
    init: function () {
        var el = this.el;
        var center = new THREE.Vector3(0, 0, 0);
        var angleRad = Math.random() * Math.PI * 2;
        var circlePoint = new THREE.Vector3(
            Math.cos(angleRad) * this.data.radius,
            0,
            Math.sin(angleRad) * this.data.radius
        );
        circlePoint.add(center);
        el.object3D.position.set(circlePoint.x, circlePoint.y, circlePoint.z);
        el.object3D.lookAt(center);
    }
});

// ─── Repo Info Panel Component ───────────────────────────────
AFRAME.registerComponent('repo-info-panel', {
    schema: {
        roomId: { type: 'string', default: '' }
    },

    init: function () {
        this.loaded = false;
        this.panelGroup = this.el;

        // Show loading state
        this.showMessage('Loading repository data...');

        // Fetch data
        if (this.data.roomId) {
            this.fetchRepoData(this.data.roomId);
        } else {
            this.showMessage('No room specified.');
        }
    },

    fetchRepoData: async function (roomId) {
        try {
            const res = await fetch(`/api/rooms/${roomId}/repo-data`);

            if (res.status === 404) {
                this.showMessage('Waiting for host to select a repository...');
                // Retry after a delay
                setTimeout(() => this.fetchRepoData(roomId), 5000);
                return;
            }

            if (!res.ok) throw new Error('Failed to load data');

            const data = await res.json();
            this.buildPanel(data);
            this.loaded = true;

        } catch (err) {
            console.error('[RepoInfoPanel]', err);
            this.showMessage('Error loading repository data.');
            setTimeout(() => this.fetchRepoData(roomId), 8000);
        }
    },

    showMessage: function (msg) {
        // Clear previous content
        while (this.panelGroup.children.length > 0) {
            this.panelGroup.removeChild(this.panelGroup.children[0]);
        }

        const text = document.createElement('a-text');
        text.setAttribute('value', msg);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#6E6E73');
        text.setAttribute('width', '6');
        text.setAttribute('position', '0 0 0');
        this.panelGroup.appendChild(text);
    },

    buildPanel: function (data) {
        // Clear loading message
        while (this.panelGroup.children.length > 0) {
            this.panelGroup.removeChild(this.panelGroup.children[0]);
        }

        const panel = this.panelGroup;

        // ── Background plane ──
        const bg = document.createElement('a-plane');
        bg.setAttribute('width', '5');
        bg.setAttribute('height', '3.8');
        bg.setAttribute('material', 'color: #ffffff; opacity: 0.92; transparent: true');
        bg.setAttribute('position', '0 0 -0.02');
        panel.appendChild(bg);

        // ── Accent border top ──
        const borderTop = document.createElement('a-plane');
        borderTop.setAttribute('width', '5');
        borderTop.setAttribute('height', '0.06');
        borderTop.setAttribute('material', 'color: #059669; opacity: 0.9');
        borderTop.setAttribute('position', '0 1.87 0');
        panel.appendChild(borderTop);

        // ── Repo Name (title) ──
        const title = document.createElement('a-text');
        title.setAttribute('value', data.fullName || 'Unknown Repository');
        title.setAttribute('align', 'center');
        title.setAttribute('color', '#1D1D1F');
        title.setAttribute('width', '5');
        title.setAttribute('position', '0 1.5 0.01');
        title.setAttribute('font', 'https://cdn.aframe.io/fonts/Exo2Bold.fnt');
        panel.appendChild(title);

        // ── Description ──
        const descText = (data.description || 'No description.').substring(0, 100);
        const desc = document.createElement('a-text');
        desc.setAttribute('value', descText);
        desc.setAttribute('align', 'center');
        desc.setAttribute('color', '#6E6E73');
        desc.setAttribute('width', '4');
        desc.setAttribute('position', '0 1.1 0.01');
        desc.setAttribute('baseline', 'top');
        panel.appendChild(desc);

        // ── Stats Row ──
        const stats = [
            { icon: '★', label: 'Stars', value: this.formatNumber(data.stars) },
            { icon: '⑂', label: 'Forks', value: this.formatNumber(data.forks) },
            { icon: '●', label: 'Issues', value: this.formatNumber(data.openIssues) },
        ];

        const startX = -1.5;
        stats.forEach((stat, i) => {
            const x = startX + i * 1.5;

            // Value
            const val = document.createElement('a-text');
            val.setAttribute('value', stat.value);
            val.setAttribute('align', 'center');
            val.setAttribute('color', '#059669');
            val.setAttribute('width', '4');
            val.setAttribute('position', `${x} 0.5 0.01`);
            val.setAttribute('font', 'https://cdn.aframe.io/fonts/Exo2Bold.fnt');
            panel.appendChild(val);

            // Label
            const lbl = document.createElement('a-text');
            lbl.setAttribute('value', `${stat.icon} ${stat.label}`);
            lbl.setAttribute('align', 'center');
            lbl.setAttribute('color', '#A1A1A6');
            lbl.setAttribute('width', '3');
            lbl.setAttribute('position', `${x} 0.15 0.01`);
            panel.appendChild(lbl);
        });

        // ── Divider ──
        const divider = document.createElement('a-plane');
        divider.setAttribute('width', '4.2');
        divider.setAttribute('height', '0.01');
        divider.setAttribute('material', 'color: #E5E7EB; opacity: 0.8');
        divider.setAttribute('position', '0 -0.15 0.01');
        panel.appendChild(divider);

        // ── Language ──
        const lang = document.createElement('a-text');
        lang.setAttribute('value', `Language: ${data.mainLanguage || 'Unknown'}`);
        lang.setAttribute('align', 'center');
        lang.setAttribute('color', '#6E6E73');
        lang.setAttribute('width', '3.5');
        lang.setAttribute('position', '0 -0.5 0.01');
        panel.appendChild(lang);

        // ── Top Languages Bar ──
        if (data.languages && data.languages.length > 0) {
            const langTitle = document.createElement('a-text');
            langTitle.setAttribute('value', 'Languages');
            langTitle.setAttribute('align', 'center');
            langTitle.setAttribute('color', '#1D1D1F');
            langTitle.setAttribute('width', '3');
            langTitle.setAttribute('position', '0 -0.85 0.01');
            panel.appendChild(langTitle);

            const langColors = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
            const maxLangs = Math.min(data.languages.length, 5);
            const barWidth = 4;
            let offsetX = -barWidth / 2;

            for (let i = 0; i < maxLangs; i++) {
                const l = data.languages[i];
                const w = (l.percentage / 100) * barWidth;
                const bar = document.createElement('a-plane');
                bar.setAttribute('width', Math.max(w, 0.05));
                bar.setAttribute('height', '0.12');
                bar.setAttribute('material', `color: ${langColors[i % langColors.length]}; opacity: 0.85`);
                bar.setAttribute('position', `${offsetX + w / 2} -1.1 0.01`);
                panel.appendChild(bar);

                // Small label below
                if (w > 0.3) {
                    const langLbl = document.createElement('a-text');
                    langLbl.setAttribute('value', `${l.name} ${l.percentage}%`);
                    langLbl.setAttribute('align', 'center');
                    langLbl.setAttribute('color', '#A1A1A6');
                    langLbl.setAttribute('width', '2');
                    langLbl.setAttribute('position', `${offsetX + w / 2} -1.35 0.01`);
                    panel.appendChild(langLbl);
                }

                offsetX += w;
            }
        }

        // ── License & Branch ──
        const meta = document.createElement('a-text');
        meta.setAttribute('value', `License: ${data.license || 'None'} · Branch: ${data.defaultBranch || 'main'}`);
        meta.setAttribute('align', 'center');
        meta.setAttribute('color', '#A1A1A6');
        meta.setAttribute('width', '3');
        meta.setAttribute('position', '0 -1.65 0.01');
        panel.appendChild(meta);

        // ── Animation: fade in ──
        panel.setAttribute('animation', 'property: scale; from: 0.8 0.8 0.8; to: 1 1 1; dur: 800; easing: easeOutElastic');
    },

    formatNumber: function (n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return String(n);
    }
});

// ─── Audio Context resume on click ───────────────────────────
document.body.addEventListener('click', () => {
    const scene = document.querySelector('a-scene');
    if (scene && scene.audioListener && scene.audioListener.context && scene.audioListener.context.state === 'suspended') {
        scene.audioListener.context.resume();
    }
});
