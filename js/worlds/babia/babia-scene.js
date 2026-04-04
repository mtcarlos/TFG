/**
 * babia-scene.js
 * Logic for the BabiaXR data visualization world.
 * Handles: dataset panel, preset switching, username.
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // NAF SCHEMA REGISTRATION
    // ─────────────────────────────────────────────
    // Register the avatar-template schema so NAF syncs
    // nested components (player-cam position/rotation,
    // head color, nametag). Without this, remote avatars
    // are invisible because only root position/rotation
    // would be synced with the default schema.
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
    const presetSelector = document.getElementById('preset-selector');
    const datasetTitle = document.getElementById('dataset-title');
    const datasetDesc = document.getElementById('dataset-desc');

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
    // PRESET SELECTOR
    // ─────────────────────────────────────────────
    function updatePreset(presetKey) {
        if (!PRESETS[presetKey]) return;
        currentPreset = presetKey;

        const preset = PRESETS[presetKey];
        datasetTitle.textContent = preset.title;
        datasetDesc.textContent = preset.description;

        // Update active button
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetKey);
        });
    }

    // Bind preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            updatePreset(this.dataset.preset);
        });
    });

    // ─────────────────────────────────────────────
    // SCENE LOADED
    // ─────────────────────────────────────────────
    const scene = document.querySelector('a-scene');
    scene.addEventListener('loaded', function () {
        console.log('[BabiaXR] Scene loaded successfully');

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
        updatePreset('sales');
    });

    // ─────────────────────────────────────────────
    // REGISTER A-FRAME COMPONENTS
    // ─────────────────────────────────────────────

    // player-info: syncs nametag and head color
    if (!AFRAME.components['player-info']) {
        AFRAME.registerComponent('player-info', {
            schema: {
                name: { type: 'string', default: 'Anonymous' },
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
