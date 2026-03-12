/* builder-components.js */

// block-registry component
// Holds definition for available block types
AFRAME.registerComponent('block-registry', {
    schema: {
        activeBlockId: { type: 'string', default: 'stone' }
    },
    init: function () {
        this.blocks = {
            'stone': {
                id: 'stone',
                name: 'Stone',
                type: 'voxel',
                // Textura libre de piedra/cobblestone.
                // Using raw github user content which usually has CORS headers enabled unlike direct imgur links sometimes.
                material: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg); color: #808080; roughness: 0.9; metalness: 0.1'
            },
            'grass': {
                id: 'grass',
                name: 'Grass',
                type: 'voxel',
                // Textura libre que simula un bloque de hierba completo/tierra verde.
                material: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg); color: #4CAF50; roughness: 1.0; metalness: 0.0'
            },
            'wood': { // Let's add wood for fun
                id: 'wood',
                name: 'Planks',
                type: 'voxel',
                // Textura libre de tablones de madera
                material: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg); color: #8D6E63; roughness: 0.7; metalness: 0.0'
            },
            'tree': {
                id: 'tree',
                name: 'Small Tree',
                type: 'prop',
                model: '#tree-model',
                yOffset: -0.5 // GLTF origin is usually at bottom pivot, while box is center pivot
            }
        };
        this.blockIds = Object.keys(this.blocks);
    },
    getBlock: function (id) {
        return this.blocks[id];
    },
    getActiveBlock: function () {
        return this.blocks[this.data.activeBlockId];
    },
    setActiveBlock: function (id) {
        if (this.blocks[id]) {
            this.el.setAttribute('block-registry', 'activeBlockId', id);
            this.el.emit('blockchanged', { id: id, block: this.blocks[id] });
        }
    },
    nextBlock: function () {
        let currentIndex = this.blockIds.indexOf(this.data.activeBlockId);
        let nextIndex = (currentIndex + 1) % this.blockIds.length;
        this.setActiveBlock(this.blockIds[nextIndex]);
    },
    prevBlock: function () {
        let currentIndex = this.blockIds.indexOf(this.data.activeBlockId);
        let prevIndex = (currentIndex - 1 + this.blockIds.length) % this.blockIds.length;
        this.setActiveBlock(this.blockIds[prevIndex]);
    }
});

// Utility for grid snapping
const GridSnap = {
    snapPoint: function (point, normal) {
        // If we hit a face, we might need to offset slightly along the normal
        // to snap to the empty grid cell adjacent to that face
        let targetX = point.x;
        let targetY = point.y;
        let targetZ = point.z;

        if (normal) {
            // Push point slightly along normal to ensure it's in the adjacent cell
            targetX += normal.x * 0.5;
            targetY += normal.y * 0.5;
            targetZ += normal.z * 0.5;
        }

        // Snap to nearest integer center. Since sizes are 1x1x1 and centered, 
        // integer coordinates (e.g. 0,1,0) represent cell centers.
        return {
            x: Math.round(targetX),
            y: Math.round(targetY), // Using round instead of floor so we stack correctly. Ex: hit y=0.5 (top face of y=0 block). offset to y=1. round(1)=1.
            z: Math.round(targetZ)
        };
    },
    getKey: function (x, y, z) {
        return `${x}|${y}|${z}`;
    }
};

// block-world component
// Manages the state of the world (hashmap of blocks) and placing instances
AFRAME.registerComponent('block-world', {
    init: function () {
        this.blocks = new Map(); // key: "x|y|z", value: entity
    },
    isOccupied: function (x, y, z) {
        const key = GridSnap.getKey(x, y, z);
        return this.blocks.has(key) || y < 0; // Prevent placing below ground (y=0 is the lowest block level for a center pivot box)
    },
    placeBlock: function (typeId, x, y, z, rotY = 0) {
        if (this.isOccupied(x, y, z)) {
            console.warn(`Block already exists at ${x},${y},${z} or position is invalid.`);
            return false;
        }

        const sceneEl = this.el.sceneEl;
        const registry = sceneEl.querySelector('[block-registry]').components['block-registry'];
        const blockDef = registry.getBlock(typeId);

        if (!blockDef) {
            console.error("Unknown block type: ", typeId);
            return false;
        }

        const blockEl = document.createElement('a-entity');

        if (blockDef.type === 'voxel') {
            blockEl.setAttribute('geometry', 'primitive: box; width: 1; height: 1; depth: 1');
            blockEl.setAttribute('material', blockDef.material);
            blockEl.setAttribute('position', `${x} ${y} ${z}`);
        } else if (blockDef.type === 'prop') {
            blockEl.setAttribute('gltf-model', blockDef.model);
            const yOffset = blockDef.yOffset || 0;
            blockEl.setAttribute('position', `${x} ${y + yOffset} ${z}`);
            // Give props a collider geometry so we can stack things later or remove them
            blockEl.setAttribute('geometry', 'primitive: box; width: 1; height: 1; depth: 1');
            blockEl.setAttribute('material', 'opacity: 0; transparent: true; depthWrite: false'); // Invisible collider
        }

        // Apply rotation (useful for props mainly, but applied generally)
        if (rotY !== 0) {
            blockEl.setAttribute('rotation', `0 ${rotY} 0`);
        }

        // Add classes for raycaster
        blockEl.classList.add('builder-raycastable');
        blockEl.classList.add('builder-block');

        // Store properties
        blockEl.setAttribute('data-block-type', typeId);

        this.el.appendChild(blockEl);

        const key = GridSnap.getKey(x, y, z);
        this.blocks.set(key, blockEl);

        // Dispatch general event for multiplayer hook later
        this.el.emit('blockplaced', { type: typeId, x: x, y: y, z: z, rotY: rotY, key: key, fromNetwork: !!this.isNetworkPlacing });

        return true;
    },
    removeBlock: function (x, y, z) {
        const key = GridSnap.getKey(x, y, z);
        if (this.blocks.has(key)) {
            const blockEl = this.blocks.get(key);
            this.el.removeChild(blockEl);
            this.blocks.delete(key);
            this.el.emit('blockremoved', { x: x, y: y, z: z, key: key, fromNetwork: !!this.isNetworkPlacing });
            return true;
        }
        return false;
    }
});

// ghost-block component
// Manages the visual indicator for placing blocks
AFRAME.registerComponent('ghost-block', {
    schema: {
        worldId: { type: 'selector', default: '#block-world' } // Selector to the world component
    },
    init: function () {
        this.world = this.data.worldId.components['block-world'];

        // Make sure it doesn't block rays
        this.el.classList.remove('builder-raycastable');
        this.el.object3D.visible = false;

        this.isValid = false;
        this.currentPos = { x: 0, y: 0, z: 0 };

        // Listen for block changes to update preview color if we want, or just stick to valid/invalid colors
        this.el.sceneEl.addEventListener('blockchanged', this.onBlockChanged.bind(this));
    },
    setRotation: function (rotY) {
        this.currentRotY = rotY;
        this.el.setAttribute('rotation', `0 ${rotY} 0`);
    },
    onBlockChanged: function (e) {
        // Optional: change shape/texture of ghost to match selected block type.
        // For props, we can set the gltf-model, for voxels we use geometry
        const blockDef = e.detail.block;
        if (blockDef.type === 'prop') {
            this.el.removeAttribute('geometry');
            this.el.setAttribute('gltf-model', blockDef.model);
            this.yOffset = blockDef.yOffset || 0;
        } else {
            this.el.removeAttribute('gltf-model');
            this.el.setAttribute('geometry', 'primitive: box; width: 1.01; height: 1.01; depth: 1.01');
            this.yOffset = 0;
        }
    },
    updatePosition: function (hitPoint, hitNormal) {
        if (!hitPoint) {
            this.el.setAttribute('visible', false);
            this.isValid = false;
            return;
        }

        const snapped = GridSnap.snapPoint(hitPoint, hitNormal);

        // Check if valid
        const occupied = this.world.isOccupied(snapped.x, snapped.y, snapped.z);
        this.isValid = !occupied;

        // Update appearance (just color to preserve HTML material properties)
        if (this.isValid) {
            this.el.setAttribute('material', 'color: #4CAF50; opacity: 0.4; transparent: true'); // Green
        } else {
            this.el.setAttribute('material', 'color: #F44336; opacity: 0.4; transparent: true'); // Red
        }

        // Apply offset if it's a prop
        const finalPos = { ...snapped };
        if (this.yOffset) {
            finalPos.y += this.yOffset;
        }

        this.el.setAttribute('position', finalPos);
        this.el.setAttribute('visible', true);
        this.currentPos = snapped; // Keep logical grid pos for the registry/world tracking
    },
    hide: function () {
        this.el.setAttribute('visible', false);
        this.isValid = false;
    }
});

// desktop-builder component
// Manages desktop interaction: manual THREE.js raycasting (bypasses a-cursor quirks),
// pointer lock, key/mouse input, ghost block update and block placement/removal
AFRAME.registerComponent('desktop-builder', {
    schema: {
        worldId: { type: 'selector', default: '#block-world' },
        registryId: { type: 'selector', default: '#block-registry' }
    },
    init: function () {
        this.world = this.data.worldId.components['block-world'];
        this.registry = this.data.registryId.components['block-registry'];

        this.ghost = null;
        this.isPointerLocked = false;
        this.lastClickStatus = "None";
        this.lastValidPlacement = null;
        this.currentRotation = 0; // State for rotation 0, 90, 180, 270

        // Manual THREE.js raycaster — canonical setFromCamera approach
        this.ray = new THREE.Raycaster();
        this.ray.near = 0.1;
        this.ray.far = 50;
        this.screenCenter = new THREE.Vector2(0, 0); // center of screen in NDC

        // Cache of meshes to raycast against (rebuilt on world changes)
        this._meshCache = [];
        this._cacheReady = false;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);
        this.rebuildMeshCache = this.rebuildMeshCache.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('contextmenu', this.onContextMenu);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);

        // Rebuild cache with delay so A-Frame geometry has time to attach its mesh
        var self = this;
        this._rebuildDelayed = function () {
            clearTimeout(self._rebuildTimer);
            self._rebuildTimer = setTimeout(function () { self.rebuildMeshCache(); }, 150);
        };
        this.data.worldId.addEventListener('blockplaced', this._rebuildDelayed);
        this.data.worldId.addEventListener('blockremoved', this._rebuildDelayed);

        // Initial build deferred so geometry components have time to attach
        if (this.el.sceneEl.hasLoaded) {
            setTimeout(function () { self.rebuildMeshCache(); }, 300);
        } else {
            this.el.sceneEl.addEventListener('loaded', function () {
                setTimeout(function () { self.rebuildMeshCache(); }, 300);
            });
        }
    },
    rebuildMeshCache: function () {
        this._meshCache = [];
        var els = this.el.sceneEl.querySelectorAll('.builder-raycastable');
        var cache = this._meshCache;
        els.forEach(function (el) {
            if (el.object3D) {
                el.object3D.traverse(function (obj) {
                    if (obj.isMesh) cache.push(obj);
                });
            }
        });
        this._cacheReady = true;
    },
    getGhost: function () {
        if (!this.ghost) {
            var ghostEl = document.querySelector('[ghost-block]');
            if (ghostEl && ghostEl.components['ghost-block']) {
                this.ghost = ghostEl.components['ghost-block'];
            }
        }
        return this.ghost;
    },
    tick: function () {
        var ghost = this.getGhost();
        if (!ghost) return;

        if (!this.isPointerLocked) {
            ghost.hide();
            return;
        }

        if (!this._cacheReady || this._meshCache.length === 0) {
            this.rebuildMeshCache();
            if (this._meshCache.length === 0) { ghost.hide(); return; }
        }

        var cam = this.el.sceneEl.camera;
        if (!cam) { ghost.hide(); return; }

        this.ray.setFromCamera(this.screenCenter, cam);

        var hits = this.ray.intersectObjects(this._meshCache, false);
        if (hits.length > 0) {
            var hit = hits[0];
            var worldNormal = hit.face.normal.clone();
            worldNormal.transformDirection(hit.object.matrixWorld);
            ghost.updatePosition(hit.point, worldNormal);

            // Cache the valid placement state from the render tick
            if (ghost.isValid && ghost.el.getAttribute('visible')) {
                this.lastValidPlacement = { ...ghost.currentPos };
            } else {
                this.lastValidPlacement = null;
            }

            // Find the actual A-Frame entity from the clicked THREE.js mesh
            // (GLTF models have deep meshes that don't have direct .el references)
            var hitEl = null;
            var currObj = hit.object;
            while (currObj) {
                if (currObj.el) {
                    hitEl = currObj.el;
                    break;
                }
                currObj = currObj.parent;
            }

            // Cache the hit block for removal
            if (hitEl && hitEl.classList.contains('builder-block')) {
                this.lastHitBlock = hitEl;
            } else {
                this.lastHitBlock = null;
            }
        } else {
            ghost.hide();
            this.lastValidPlacement = null;
            this.lastHitBlock = null;
        }
    },

    // Context menu prevention so right click can be used for gameplay
    onContextMenu: function (e) {
        if (this.isPointerLocked) {
            e.preventDefault();
        }
    },

    // Mouse buttons for building
    onMouseDown: function (e) {
        if (!this.isPointerLocked) return;

        // --- Block Placement (Right Click / button === 2) ---
        if (e.button === 2) {
            this.lastClickStatus = "Pressed Right Click (Place)";
            if (!this.lastValidPlacement) {
                this.lastClickStatus = "M: No Valid Placement";
                return;
            }
            var pos = this.lastValidPlacement;
            var activeBlock = this.registry.getActiveBlock();
            if (activeBlock) {
                var placed = this.world.placeBlock(activeBlock.id, pos.x, pos.y, pos.z, this.currentRotation);
                if (placed) {
                    this.lastClickStatus = "SUCCESS Placement (Right Click)";
                    document.dispatchEvent(new CustomEvent('desktop-block-placed'));
                    this.lastValidPlacement = null; // consume it
                } else {
                    this.lastClickStatus = "FAIL world.placeBlock returns false";
                }
            } else {
                this.lastClickStatus = "FAIL No active block";
            }
            return;
        }

        // --- Block Removal (Left Click / button === 0) ---
        if (e.button === 0) {
            this.lastClickStatus = "Pressed Left Click (Remove)";
            if (this.lastHitBlock) {
                var pos = this.lastHitBlock.getAttribute('position');
                if (pos) {
                    var removed = this.world.removeBlock(pos.x, pos.y, pos.z);
                    if (removed) {
                        this.lastClickStatus = "SUCCESS Removal (Left Click)";
                        document.dispatchEvent(new CustomEvent('desktop-block-removed'));
                    } else {
                        this.lastClickStatus = "FAIL Removal (empty block)";
                    }
                }
            } else {
                this.lastClickStatus = "FAIL Removal (No block hit)";
            }
            return;
        }
    },

    onKeyDown: function (e) {
        if (!this.isPointerLocked) return;

        // Block Selection
        if (e.key === 'Escape') {
            document.exitPointerLock();
            return;
        }

        // --- Model Rotation (Q / E) ---
        if (e.key.toLowerCase() === 'e') {
            this.currentRotation = (this.currentRotation - 90 + 360) % 360; // Right
            const ghost = this.getGhost();
            if (ghost) ghost.setRotation(this.currentRotation);
            return;
        }
        if (e.key.toLowerCase() === 'q') {
            this.currentRotation = (this.currentRotation + 90) % 360; // Left
            const ghost = this.getGhost();
            if (ghost) ghost.setRotation(this.currentRotation);
            return;
        }
    },
    onWheel: function (e) {
        if (!this.isPointerLocked) return;

        // Prevent page scrolling if needed
        e.preventDefault();

        // Minecraft style: scroll up (negative deltaY) = left in quickbar (prevBlock)
        // scroll down = right in quickbar (nextBlock)
        if (e.deltaY < 0) {
            this.registry.prevBlock();
            this.currentRotation = 0; // Reset rotation on switch
        } else if (e.deltaY > 0) {
            this.registry.nextBlock();
            this.currentRotation = 0; // Reset rotation on switch
        }
    },
    onPointerLockChange: function () {
        this.isPointerLocked = document.pointerLockElement !== null;
        document.dispatchEvent(new CustomEvent('pointer-lock-changed', {
            detail: { locked: this.isPointerLocked }
        }));
    },
    remove: function () {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('contextmenu', this.onContextMenu);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        if (this.data.worldId) {
            this.data.worldId.removeEventListener('blockplaced', this._rebuildDelayed);
            this.data.worldId.removeEventListener('blockremoved', this._rebuildDelayed);
        }
        clearTimeout(this._rebuildTimer);
    }
});

// vr-inventory component
// Manages the holographic palette on the left hand
AFRAME.registerComponent('vr-inventory', {
    schema: {
        registryId: { type: 'selector', default: '#block-registry' }
    },
    init: function () {
        this.registry = this.data.registryId.components['block-registry'];

        // Holographic Palette Anchor
        this.menuEl = document.createElement('a-entity');
        this.menuEl.setAttribute('visible', false);
        // Positioned slightly above and forward of the wrist/controller
        this.menuEl.setAttribute('position', '0 0.15 -0.15');
        this.menuEl.setAttribute('rotation', '-45 0 0'); // Tilted towards the face
        this.el.appendChild(this.menuEl);

        // --- Ultra Minimalist Aesthetics ---
        // (Base plates and rings removed per user request)

        // Container for rotating blocks
        this.carouselEl = document.createElement('a-entity');
        this.menuEl.appendChild(this.carouselEl);

        // Create 3D block miniatures for the menu
        this.menuBlocks = [];
        this.angleStep = (Math.PI * 2) / this.registry.blockIds.length;
        this.radius = 0.2; // Match torus radius

        this.registry.blockIds.forEach((id, index) => {
            const blockDef = this.registry.getBlock(id);
            const angle = index * this.angleStep;

            const containerItem = document.createElement('a-entity');
            const x = Math.sin(angle) * this.radius;
            const z = Math.cos(angle) * this.radius;
            containerItem.setAttribute('position', `${x} 0 ${z}`);

            const blockItem = document.createElement('a-entity');
            blockItem.setAttribute('geometry', 'primitive: box; width: 0.06; height: 0.06; depth: 0.06');
            blockItem.setAttribute('material', blockDef.material);
            blockItem.setAttribute('rotation', '0 45 0');
            containerItem.appendChild(blockItem);

            // Add a clean label
            const label = document.createElement('a-text');
            label.setAttribute('value', blockDef.name);
            label.setAttribute('align', 'center');
            label.setAttribute('scale', '0.22 0.22 0.22');
            label.setAttribute('position', '0 0.08 0');
            label.setAttribute('look-at', '#camera');
            // Clean white typography
            label.setAttribute('color', '#ffffff');
            label.setAttribute('visible', index === 0);
            containerItem.appendChild(label);

            this.carouselEl.appendChild(containerItem);
            this.menuBlocks.push({
                container: containerItem,
                mesh: blockItem,
                label: label,
                id: id,
                originalPos: { x: x, y: 0, z: z }
            });
        });

        // (Indicator ring removed per user request)

        this.currentCarouselIndex = 0;
        this.targetRotationY = 0;

        this.isOpen = false;
        this.lastSelectTime = 0;

        this.onButtonDown = this.onButtonDown.bind(this);
        this.onThumbstickMoved = this.onThumbstickMoved.bind(this);

        this.el.addEventListener('xbuttondown', this.onButtonDown);
        this.el.addEventListener('ybuttondown', this.onButtonDown);
        this.el.addEventListener('thumbstickmoved', this.onThumbstickMoved);
    },
    tick: function () {
        if (!this.isOpen) return;

        // Smooth rotation for carousel
        let currentRot = this.carouselEl.getAttribute('rotation');
        if (currentRot.y !== this.targetRotationY) {
            let diff = this.targetRotationY - currentRot.y;
            if (Math.abs(diff) > 0.1) {
                this.carouselEl.setAttribute('rotation', { x: 0, y: currentRot.y + diff * 0.2, z: 0 });
            } else {
                this.carouselEl.setAttribute('rotation', { x: 0, y: this.targetRotationY, z: 0 });
            }
        }

        // Gentle idle animation for the active block (less erratic than the sci-fi one)
        const now = Date.now();
        const activeItem = this.menuBlocks[this.currentCarouselIndex];
        if (activeItem && activeItem.container) {
            // Very slow, elegant spin
            const spinOffset = (now % 8000) / 8000 * 360;
            activeItem.mesh.setAttribute('rotation', `0 ${45 + spinOffset} 0`);

            // Subtle, smooth hovering
            const bobOffset = Math.sin(now / 800) * 0.005;
            const originalPos = activeItem.originalPos;
            if (originalPos) {
                // Keep it floating slightly above the glass
                activeItem.container.setAttribute('position', `${originalPos.x} ${0.02 + originalPos.y + bobOffset} ${originalPos.z}`);
            }
        }
    },
    onButtonDown: function (e) {
        this.isOpen = !this.isOpen;
        this.menuEl.setAttribute('visible', this.isOpen);
        if (this.isOpen) {
            this.syncCarouselToRegistry();
            this.updateMenuVisuals();
            // Emit to scene so the right hand builder knows
            this.el.sceneEl.emit('vr-menu-changed', { isOpen: true });
            this.pulseHaptic(0.5, 50);
        } else {
            this.el.sceneEl.emit('vr-menu-changed', { isOpen: false });
        }
    },
    onThumbstickMoved: function (e) {
        if (!this.isOpen) return;
        const now = Date.now();
        if (now - this.lastSelectTime < 300) return; // Simple debounce

        const x = e.detail.x;
        if (x > 0.5) {
            this.rotateCarousel(1);
            this.lastSelectTime = now;
        } else if (x < -0.5) {
            this.rotateCarousel(-1);
            this.lastSelectTime = now;
        }
    },
    rotateCarousel: function (dir) {
        const numBlocks = this.registry.blockIds.length;
        this.currentCarouselIndex = (this.currentCarouselIndex + dir + numBlocks) % numBlocks;
        const targetAngleRad = this.currentCarouselIndex * this.angleStep;
        this.targetRotationY = -(targetAngleRad * 180 / Math.PI);
        const selectedId = this.registry.blockIds[this.currentCarouselIndex];
        this.registry.setActiveBlock(selectedId);
        this.updateMenuVisuals();
        this.pulseHaptic(0.2, 10);
    },
    syncCarouselToRegistry: function () {
        const activeId = this.registry.data.activeBlockId;
        const index = this.registry.blockIds.indexOf(activeId);
        if (index !== -1 && index !== this.currentCarouselIndex) {
            this.currentCarouselIndex = index;
            const targetAngleRad = this.currentCarouselIndex * this.angleStep;
            this.targetRotationY = -(targetAngleRad * 180 / Math.PI);
            this.carouselEl.setAttribute('rotation', { x: 0, y: this.targetRotationY, z: 0 });
        }
    },
    updateMenuVisuals: function () {
        this.menuBlocks.forEach((item, index) => {
            if (index === this.currentCarouselIndex) {
                // Show only the active block
                item.label.setAttribute('visible', true);
                item.container.setAttribute('visible', true);
                // Set scale to 1.2
                item.mesh.setAttribute('scale', '1.2 1.2 1.2');
                item.mesh.setAttribute('material', Object.assign({}, item.mesh.getAttribute('material'), { opacity: 1, transparent: false }));
            } else {
                // Completely hide inactive blocks
                item.label.setAttribute('visible', false);
                item.container.setAttribute('visible', false);
            }
        });
    },
    pulseHaptic: function (intensity, duration) {
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; ++i) {
                let pad = gamepads[i];
                if (pad && pad.hand === 'left' && pad.hapticActuators && pad.hapticActuators.length > 0) {
                    pad.hapticActuators[0].pulse(intensity, duration);
                }
            }
        }
    },
    remove: function () {
        this.el.removeEventListener('xbuttondown', this.onButtonDown);
        this.el.removeEventListener('ybuttondown', this.onButtonDown);
        this.el.removeEventListener('thumbstickmoved', this.onThumbstickMoved);
    }
});

// vr-builder component
// Manages VR interaction: raycaster and trigger placement for the right hand
AFRAME.registerComponent('vr-builder', {
    schema: {
        worldId: { type: 'selector', default: '#block-world' },
        registryId: { type: 'selector', default: '#block-registry' }
    },
    init: function () {
        this.world = this.data.worldId.components['block-world'];
        this.registry = this.data.registryId.components['block-registry'];

        this.ghostEl = document.querySelector('[ghost-block]');
        if (this.ghostEl) {
            this.ghost = this.ghostEl.components['ghost-block'];
        }

        this.raycaster = this.el.components.raycaster;
        if (!this.raycaster) {
            this.el.setAttribute('raycaster', 'objects: .builder-raycastable; showLine: true; far: 10');
            this.raycaster = this.el.components.raycaster;
        }

        this.onTriggerDown = this.onTriggerDown.bind(this);
        this.el.addEventListener('triggerdown', this.onTriggerDown);

        // Listen to left hand palette state
        this.isMenuOpen = false;
        this.onMenuChanged = (e) => {
            this.isMenuOpen = e.detail.isOpen;
        };
        this.el.sceneEl.addEventListener('vr-menu-changed', this.onMenuChanged);
    },
    tick: function () {
        if (!this.ghost || !this.raycaster) return;

        // Only show ghost block if menu is open
        if (!this.isMenuOpen) {
            this.ghost.hide();
            return;
        }

        // Update ghost block based on controller raycaster
        let intersection = this.raycaster.getIntersection(this.el);
        if (!intersection && this.raycaster.intersectedEls && this.raycaster.intersectedEls.length > 0) {
            intersection = this.raycaster.getIntersection(this.raycaster.intersectedEls[0]);
        }

        if (intersection) {
            this.ghost.updatePosition(intersection.point, intersection.face.normal);
        } else {
            this.ghost.hide();
        }
    },
    onTriggerDown: function (e) {
        if (!this.isMenuOpen) return; // Only allow placement if menu is open

        if (this.ghost && this.ghost.isValid && this.ghost.el.getAttribute('visible')) {
            const pos = this.ghost.currentPos;
            const activeBlock = this.registry.getActiveBlock();
            if (activeBlock) {
                this.world.placeBlock(activeBlock.id, pos.x, pos.y, pos.z);

                // Placement Haptic feedback
                if (navigator.getGamepads) {
                    const gamepads = navigator.getGamepads();
                    for (let i = 0; i < gamepads.length; ++i) {
                        let pad = gamepads[i];
                        if (pad && pad.hand === 'right' && pad.hapticActuators && pad.hapticActuators.length > 0) {
                            pad.hapticActuators[0].pulse(0.8, 50);
                        }
                    }
                }
            }
        }
    },
    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.sceneEl.removeEventListener('vr-menu-changed', this.onMenuChanged);
    }
});
