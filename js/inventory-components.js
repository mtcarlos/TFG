// inventory-components.js - Define el inventario del jugador y el manager de crafteo personal.
import { CraftingSystem } from './crafting-systems.js';

AFRAME.registerComponent('inventory-manager', {
    schema: {
        hotbarSize: { type: 'int', default: 8 },
        backpackSize: { type: 'int', default: 24 }
    },

    init: function () {
        this.hotbar = new Array(this.data.hotbarSize).fill(null);
        this.backpack = new Array(this.data.backpackSize).fill(null);
        this.activeSlot = 0;
        
        // Items por defecto para pruebas
        this.hotbar[0] = { itemId: 'axe_basic', quantity: 1, durability: 40 };

        this.el.addEventListener('input-slot-changed', this.onSlotChange.bind(this));
    },

    onSlotChange: function (e) {
        const payload = e.detail;
        if (payload.slotIndex !== undefined && payload.slotIndex >= 0 && payload.slotIndex < this.data.hotbarSize) {
            this.setActiveSlot(payload.slotIndex);
        }
    },

    setActiveSlot: function(index) {
        if (index >= 0 && index < this.data.hotbarSize) {
            this.activeSlot = index;
            this.emitInventoryUpdate();
        }
    },

    hasSpaceFor: function(itemId, quantity) {
        let remaining = quantity;
        const maxStack = (window.GAMESYSTEMS && window.GAMESYSTEMS.ItemRegistry) ? window.GAMESYSTEMS.ItemRegistry.getMaxStack(itemId) : 64;
        
        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] && this.hotbar[i].itemId === itemId) {
                const space = maxStack - this.hotbar[i].quantity;
                if (space > 0) {
                    remaining -= space;
                    if (remaining <= 0) return true;
                }
            }
        }

        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] === null) {
                remaining -= maxStack;
                if (remaining <= 0) return true;
            }
        }
        return remaining <= 0;
    },

    addItem: function (itemId, quantity) {
        if (!this.hasSpaceFor(itemId, quantity)) {
            this.el.emit('inventory-full');
            return false;
        }

        let remaining = quantity;
        const maxStack = (window.GAMESYSTEMS && window.GAMESYSTEMS.ItemRegistry) ? window.GAMESYSTEMS.ItemRegistry.getMaxStack(itemId) : 64;
        
        // Primero intentar stackear en huecos existentes
        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] && this.hotbar[i].itemId === itemId) {
                const space = maxStack - this.hotbar[i].quantity;
                if (space > 0) {
                    const toAdd = Math.min(space, remaining);
                    this.hotbar[i].quantity += toAdd;
                    remaining -= toAdd;
                    if (remaining <= 0) {
                        this.emitInventoryUpdate();
                        return true;
                    }
                }
            }
        }

        // Si no hay hueco del mismo tipo o no sobran, buscar hueco vacío en hotbar
        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] === null) {
                const toAdd = Math.min(maxStack, remaining);
                this.hotbar[i] = { itemId, quantity: toAdd };
                remaining -= toAdd;
                if (remaining <= 0) {
                    this.emitInventoryUpdate();
                    return true;
                }
            }
        }

        return false;
    },

    removeItem: function (itemId, quantity) {
        let remaining = quantity;

        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] && this.hotbar[i].itemId === itemId) {
                if (this.hotbar[i].quantity >= remaining) {
                    this.hotbar[i].quantity -= remaining;
                    remaining = 0;
                    if (this.hotbar[i].quantity <= 0) {
                        this.hotbar[i] = null;
                    }
                    this.emitInventoryUpdate();
                    return true;
                } else {
                    remaining -= this.hotbar[i].quantity;
                    this.hotbar[i] = null;
                }
            }
        }
        this.emitInventoryUpdate();
        return remaining === 0;
    },

    getItemCount: function(itemId) {
        let total = 0;
        for (let i = 0; i < this.hotbar.length; i++) {
            if (this.hotbar[i] && this.hotbar[i].itemId === itemId) {
                total += this.hotbar[i].quantity;
            }
        }
        return total;
    },

    getActiveItem: function() {
        return this.hotbar[this.activeSlot];
    },

    emitInventoryUpdate: function() {
        this.el.emit('inventory-updated', {
            hotbar: this.hotbar,
            activeSlot: this.activeSlot
        });
    }
});

AFRAME.registerComponent('crafting-manager', {
    init: function () {
        this.inventory = this.el.components['inventory-manager'];
        this.el.addEventListener('craft-requested', this.onCraftRequested.bind(this));
    },

    onCraftRequested: function (e) {
        const recipeId = e.detail.recipeId;
        if (!recipeId || !this.inventory) return;

        // Intentar craftear rápidamente. (Requiere import de CraftingSystem)
        const success = CraftingSystem.tryCraft(recipeId, this.inventory);
        
        if (success) {
            this.el.emit('craft-completed', { recipeId });
        } else {
            this.el.emit('craft-failed', { recipeId, reason: 'insufficient_materials' });
        }
    }
});
