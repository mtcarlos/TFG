// world-components.js - Componentes para nodos de recursos, drops y la interacción visual con ellos.
import { ResourceSystem } from './crafting-systems.js';

AFRAME.registerComponent('resource-node', {
    schema: {
        nodeId: { type: 'string' }
    },

    init: function () {
        this.nodeData = ResourceSystem.getNodeData(this.data.nodeId);
        if (!this.nodeData) return;

        this.health = this.nodeData.maxHealth;
        this.depleted = false;

        // Añadir comportamiento harvestable dinámicamente si no existe
        if (!this.el.hasAttribute('harvestable')) {
            this.el.setAttribute('harvestable', '');
        }
        
        // Añadir visualizador de vida dinámicamente
        if (!this.el.hasAttribute('durability-visual')) {
            this.el.setAttribute('durability-visual', '');
        }
    },

    takeDamage: function (damage) {
        if (this.depleted) return 0;
        
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.deplete();
        }
        return this.health;
    },

    deplete: function () {
        if (this.depleted) return;
        this.depleted = true;
        
        this.el.emit('resource-node-depleted', { nodeId: this.data.nodeId, worldPosition: this.el.object3D.position });
        
        // Spawnear los drops reales en la escena
        const drops = ResourceSystem.resolveDrops(this.nodeData);
        drops.forEach(drop => {
            const dropEl = document.createElement('a-entity');
            dropEl.setAttribute('drop-item', `itemId: ${drop.itemId}; quantity: ${drop.quantity}`);
            // Un cubo pequeño temporal que represente el item tirado
            dropEl.setAttribute('geometry', 'primitive: box; width: 0.3; height: 0.3; depth: 0.3');
            
            // Asignar color dependiendo del material
            let color = '#ffffff';
            if(drop.itemId === 'wood_log') color = '#8B5A2B';
            else if(drop.itemId === 'stone') color = '#A9A9A9';
            else if(drop.itemId === 'metal_ore') color = '#FFD700';
            else if(drop.itemId === 'fiber') color = '#9ACD32';
            else if(drop.itemId === 'sand') color = '#F4A460';
            
            dropEl.setAttribute('material', `color: ${color}`);
            dropEl.classList.add('clickable'); // Para que el raycaster lo pueda seleccionar
            
            // Spawnear un poco alrededor del nodo original
            const pos = this.el.object3D.position;
            const offsetX = (Math.random() - 0.5) * 1.5;
            const offsetZ = (Math.random() - 0.5) * 1.5;
            dropEl.setAttribute('position', `${pos.x + offsetX} ${pos.y + 0.5} ${pos.z + offsetZ}`);
            
            this.el.sceneEl.appendChild(dropEl);
        });

        // Desactivar temporalmente el nodo
        this.el.setAttribute('visible', 'false');
        if (this.el.hasAttribute('class')) {
            this.originalClass = this.el.getAttribute('class');
            this.el.setAttribute('class', this.originalClass.replace('clickable', '').replace('builder-raycastable', ''));
        }

        // Programar respawn
        setTimeout(() => this.respawn(), this.nodeData.respawnTimeMs);
    },

    respawn: function () {
        this.depleted = false;
        this.health = this.nodeData.maxHealth;
        this.el.setAttribute('visible', 'true');
        if (this.originalClass) {
            this.el.setAttribute('class', this.originalClass);
        }
        this.el.emit('resource-node-respawned', { nodeId: this.data.nodeId });
    }
});

AFRAME.registerComponent('harvestable', {
    init: function () {
        this.el.addEventListener('harvest-attempt', this.onHarvestAttempt.bind(this));
    },

    onHarvestAttempt: function (e) {
        const payload = e.detail;
        const resourceNode = this.el.components['resource-node'];
        if (!resourceNode || resourceNode.depleted) return;

        // payload.toolId proviene del inventory manager del jugador que interactúa
        const damage = ResourceSystem.applyHarvest(this.el, payload.toolId);
        
        const remainingHealth = resourceNode.takeDamage(damage);
        
        // Emitir un hit visual al entorno
        this.el.emit('hit-feedback', { target: this.el, damage, newHealth: remainingHealth });
        
        // Emitimos el 'harvest-hit' para que el jugador ocupe hacer sonido
        if (payload.actorEl) {
            payload.actorEl.emit('harvest-hit', { targetNodeId: resourceNode.data.nodeId, damage, remainingHealth });
        }
        
        if (window.logEvent) {
            if (remainingHealth > 0) {
                 window.logEvent(`Recolectando... (${remainingHealth} HP)`, "warning");
            } else {
                 window.logEvent(`¡Nodo agotado! Drops generados.`, "system");
            }
        }
    }
});

AFRAME.registerComponent('drop-item', {
    schema: {
        itemId: { type: 'string' },
        quantity: { type: 'int', default: 1 }
    },

    init: function () {
        this.el.addEventListener('pickup-attempt', this.onPickupAttempt.bind(this));

        // Animación suave de flotación
        this.el.setAttribute('animation__float', {
            property: 'position',
            dir: 'alternate',
            dur: 1500,
            easing: 'easeInOutSine',
            loop: true,
            to: `${this.el.object3D.position.x} ${this.el.object3D.position.y + 0.2} ${this.el.object3D.position.z}`
        });

        this.el.setAttribute('animation__spin', {
            property: 'rotation',
            dur: 4000,
            easing: 'linear',
            loop: true,
            to: '0 360 0'
        });
    },

    onPickupAttempt: function (e) {
        const actorEl = e.detail.actorEl;
        if (!actorEl) return;

        const inventory = actorEl.components['inventory-manager'];
        if (inventory) {
            const success = inventory.addItem(this.data.itemId, this.data.quantity);
            if (success) {
                // Notificarse a sí mismo y auto destruirse
                this.el.emit('drop-picked-up', { itemId: this.data.itemId, quantity: this.data.quantity });
                actorEl.emit('item-pickup-success', { itemId: this.data.itemId, quantity: this.data.quantity });
                
                if (window.logEvent) {
                     window.logEvent(`+ Recogido: ${this.data.itemId} (x${this.data.quantity})`, "system");
                }
                
                // Mover item fuera de vista temporalmente
                this.el.setAttribute('visible', 'false');
                this.el.removeAttribute('class');
                setTimeout(() => this.el.parentNode.removeChild(this.el), 100);
            } else {
                 if (window.logEvent) {
                     window.logEvent(`Inventario lleno. No puedes recoger ${this.data.itemId}.`, "warning");
                 }
            }
        }
    }
});

// Componente para pintar una barrita de vida en componentes recolectables
AFRAME.registerComponent('durability-visual', {
    init: function() {
        // Crear contenedor para que siempre mire a cámara
        this.container = document.createElement('a-entity');
        // Un poco por encima del centro del bloque (asume block base de height ~1)
        this.container.setAttribute('position', '0 1.2 0');
        // Hacemos que mire siempre a cámara
        this.container.setAttribute('look-at', '#player');
        
        // Crear la barra de fondo (gris oscuro/negro transparente)
        this.bgBar = document.createElement('a-plane');
        this.bgBar.setAttribute('width', '1');
        this.bgBar.setAttribute('height', '0.15');
        this.bgBar.setAttribute('color', '#1a1a1a');
        this.bgBar.setAttribute('material', 'shader: flat; opacity: 0.8');
        this.container.appendChild(this.bgBar);
        
        // Crear la barra de relleno (verde/roja) alineada a la izquierda
        this.fillBar = document.createElement('a-plane');
        this.fillBar.setAttribute('width', '0.96'); // Un poco menos para dar borde
        this.fillBar.setAttribute('height', '0.11');
        this.fillBar.setAttribute('color', '#4CAF50'); // Verde inicial
        this.fillBar.setAttribute('material', 'shader: flat; opacity: 1');
        // El pivot de a-plane está en el centro. Lo desplazamos la mitad del width.
        this.fillBar.setAttribute('position', '0 0 0.01'); // un poquito adelante del bg
        this.container.appendChild(this.fillBar);

        // Ocultar por defecto hasta que reciba daño
        this.container.setAttribute('visible', 'false');
        
        this.el.appendChild(this.container);

        // Escuchar daños
        this.el.addEventListener('hit-feedback', this.onHit.bind(this));
        // Escuchar respawn / deplete para resetear
        this.el.addEventListener('resource-node-depleted', this.onDeplete.bind(this));
        this.el.addEventListener('resource-node-respawned', this.onRespawn.bind(this));
        
        this.hideTimeout = null;
    },
    
    onHit: function(e) {
        const payload = e.detail;
        const resourceNode = this.el.components['resource-node'];
        if(!resourceNode || !resourceNode.nodeData) return;
        
        const maxHealth = resourceNode.nodeData.maxHealth;
        const currentHealth = payload.newHealth;
        const percent = Math.max(0, currentHealth / maxHealth);
        
        // Mostrar la barra
        this.container.setAttribute('visible', 'true');
        
        // Ajustar tamaño del relleno. Como A-Frame escala desde el centro, tenemos que escalarlo
        // y desplazarlo para que simule "vaciarse hacia la izquierda".
        const newWidth = 0.96 * percent;
        // Offset = -(ancho_original - nuevo_ancho) / 2
        const offset = -(0.96 - newWidth) / 2;
        
        this.fillBar.setAttribute('width', Math.max(0.001, newWidth)); // no permitir 0 puro
        this.fillBar.setAttribute('position', `${offset} 0 0.01`);
        
        // Cambiar color: de verde a rojo a medida que baja
        if(percent > 0.6) this.fillBar.setAttribute('color', '#4CAF50'); // Verde
        else if (percent > 0.3) this.fillBar.setAttribute('color', '#FFEB3B'); // Amarillo
        else this.fillBar.setAttribute('color', '#F44336'); // Rojo
        
        // Ocultar la barra tras 3 segundos sin daño
        if(this.hideTimeout) clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.container.setAttribute('visible', 'false');
        }, 3000);
    },
    
    onDeplete: function() {
        this.container.setAttribute('visible', 'false');
    },
    
    onRespawn: function() {
        // Reset full width verde
        this.fillBar.setAttribute('width', '0.96');
        this.fillBar.setAttribute('position', '0 0 0.01');
        this.fillBar.setAttribute('color', '#4CAF50');
        this.container.setAttribute('visible', 'false');
    }
});
