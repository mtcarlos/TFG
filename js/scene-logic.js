document.body.addEventListener('connected', function (evt) {
    console.log('connected event. clientId =', evt.detail.clientId);
});

// Use a more robust schema definition
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
            // Only use Y-axis lookAt to avoid pitching up/down when camera is above/below
            var pos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(pos);
            var target = new THREE.Vector3();
            camera.getWorldPosition(target);
            target.y = pos.y; // Keep Y same to prevent upside-down issues
            this.el.object3D.lookAt(target);
            // Fix mirroring by turning it 180 degrees
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
        var angleRad = this.getRandomAngleInRadians();
        var circlePoint = new THREE.Vector3(
            Math.cos(angleRad) * this.data.radius,
            0,
            Math.sin(angleRad) * this.data.radius
        );
        circlePoint.add(center);
        el.object3D.position.set(circlePoint.x, circlePoint.y, circlePoint.z);
        el.object3D.lookAt(center);
    },

    getRandomAngleInRadians: function () {
        return Math.random() * Math.PI * 2;
    }
});

// Define schema for cube
NAF.schemas.add({
    template: '#cube-template',
    components: [
        {
            component: 'position'
        },
        {
            component: 'rotation'
        },
        {
            selector: '.clickable',
            component: 'material',
            property: 'color'
        },
        {
            component: 'gltf-model'
        },
        {
            component: 'geometry'
        }
    ]
});

// Component to change color on click
AFRAME.registerComponent('color-changer', {
    events: {
        click: function (evt) {
            var randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
            if (!NAF.utils.isMine(this.el)) {
                NAF.utils.takeOwnership(this.el);
            }
            var target = this.el.querySelector('.clickable');
            if (target) {
                target.setAttribute('material', 'color', randomColor);
            }
        }
    }
});

// VR Thumbstick Movement
AFRAME.registerComponent('thumbstick-movement', {
    schema: {
        moveSpeed: { default: 0.05 },
        turnSpeed: { default: 0.05 },
    },
    init: function () {
        this.moveX = 0;
        this.moveZ = 0;
        this.turnX = 0;

        // Listen to thumbstick events bubbling from controllers
        this.el.addEventListener('thumbstickmoved', (e) => {
            var hand = e.target.getAttribute('oculus-touch-controls');
            if (hand) {
                if (hand.hand === 'left') {
                    this.moveX = e.detail.x;
                    this.moveZ = e.detail.y;
                } else if (hand.hand === 'right') {
                    this.turnX = e.detail.x;
                }
            }
        });
    },
    tick: function () {
        var el = this.el;
        var camera = el.querySelector('[camera]') || el.sceneEl.camera.el;
        if (!camera) return;

        // Turn (Threshold 0.1 to avoid drift)
        if (Math.abs(this.turnX) > 0.1) {
            el.object3D.rotation.y -= this.turnX * this.data.turnSpeed;
        }

        // Movement (Threshold 0.1)
        if (Math.abs(this.moveX) > 0.1 || Math.abs(this.moveZ) > 0.1) {
            var cameraQuaternion = new THREE.Quaternion();
            camera.object3D.getWorldQuaternion(cameraQuaternion);

            // Calculate true forward and right vectors based on camera orientation
            // -Z is forward, +X is right in WebGL/THREE.js
            var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
            var right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);

            // In WebXR, pushing forward gives y < 0, pushing right gives x > 0
            var moveRightAmount = this.moveX * this.data.moveSpeed;
            var moveForwardAmount = -this.moveZ * this.data.moveSpeed;

            // Apply movement along both vectors (naturally supports flying across Y-axis)
            el.object3D.position.add(right.multiplyScalar(moveRightAmount));
            el.object3D.position.add(forward.multiplyScalar(moveForwardAmount));
        }
    }
});

// Audio Debugging Script
document.body.addEventListener('clientConnected', function (evt) {
    document.getElementById('audio-debug').innerText = 'Client connected: ' + evt.detail.clientId;
});

// Listen for new streams (if possible via NAF events or by monkey-patching NAF log?)
// Better: Check NAF.connection.adapter.mediaStreams periodically
setInterval(() => {
    if (NAF.connection && NAF.connection.adapter) {
        const streams = NAF.connection.adapter.mediaStreams;
        let count = 0;
        if (streams) {
            count = Object.keys(streams).length;
        }
        const myId = NAF.clientId || "Not connected";
        document.getElementById('audio-debug').innerText = `My ID: ${myId}\nRemote Audio Streams: ${count}`;
    }
}, 2000);

// Ensure AudioContext is resumed
document.body.addEventListener('click', () => {
    const scene = document.querySelector('a-scene');
    if (scene.audioListener && scene.audioListener.context && scene.audioListener.context.state === 'suspended') {
        scene.audioListener.context.resume().then(() => {
            console.log("AudioContext resumed by user gesture.");
        });
    }
});

// Block Building Networking Logic
document.querySelector('a-scene').addEventListener('loaded', function () {
    const worldEl = document.querySelector('#block-world');
    if (!worldEl) return;

    // 1. Listen for my own placed blocks and broadcast
    worldEl.addEventListener('blockplaced', (e) => {
        if (e.detail.fromNetwork) return; // Ignore if it came from network
        if (NAF.connection.isConnected()) {
            NAF.connection.broadcastData('blockplaced', {
                type: e.detail.type,
                x: e.detail.x,
                y: e.detail.y,
                z: e.detail.z,
                rotY: e.detail.rotY || 0
            });
        }
    });

    worldEl.addEventListener('blockremoved', (e) => {
        if (e.detail.fromNetwork) return;
        if (NAF.connection.isConnected()) {
            NAF.connection.broadcastData('blockremoved', {
                x: e.detail.x,
                y: e.detail.y,
                z: e.detail.z
            });
        }
    });

    // 2. Listen to incoming network events
    NAF.connection.subscribeToDataChannel('blockplaced', (senderId, type, data, targetId) => {
        const world = worldEl.components['block-world'];
        if (world) {
            world.isNetworkPlacing = true;
            world.placeBlock(data.type, data.x, data.y, data.z, data.rotY || 0);
            world.isNetworkPlacing = false;
        }
    });

    NAF.connection.subscribeToDataChannel('blockremoved', (senderId, type, data, targetId) => {
        const world = worldEl.components['block-world'];
        if (world) {
            world.isNetworkPlacing = true;
            world.removeBlock(data.x, data.y, data.z);
            world.isNetworkPlacing = false;
        }
    });

    // 3. Send existing blocks to newly connected clients
    document.body.addEventListener('clientConnected', function (evt) {
        const world = worldEl.components['block-world'];
        if (world && world.blocks.size > 0 && NAF.connection.isConnected()) {
            // Wait a bit for their scene to load, then send them the blocks
            setTimeout(() => {
                world.blocks.forEach((blockEl, key) => {
                    const coords = key.split('|');
                    const typeId = blockEl.getAttribute('data-block-type');

                    // Default to 0 if rotation component isn't strictly defined
                    let rotY = 0;
                    if (blockEl.object3D && blockEl.object3D.rotation) {
                        rotY = THREE.MathUtils.radToDeg(blockEl.object3D.rotation.y);
                    }

                    NAF.connection.sendData(evt.detail.clientId, 'blockplaced', {
                        type: typeId,
                        x: parseFloat(coords[0]),
                        y: parseFloat(coords[1]),
                        z: parseFloat(coords[2]),
                        rotY: rotY
                    });
                });
            }, 500);
        }
    });
});
