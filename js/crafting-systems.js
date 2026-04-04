// crafting-systems.js - Sistemas globales que encapsulan la lógica pura de gameplay.
import { ITEMS, RECIPES, RESOURCE_NODES, STATIONS } from './registries.js';

// ---- ITEM REGISTRY SYSTEM ----
export const ItemRegistrySystem = {
    getItem(itemId) {
        return ITEMS[itemId] || null;
    },
    getAllItems() {
        return ITEMS;
    },
    isStackable(itemId) {
        const item = this.getItem(itemId);
        return item ? item.stackable : false;
    },
    getMaxStack(itemId) {
        const item = this.getItem(itemId);
        return item ? item.maxStack : 1;
    },
    hasTag(itemId, tag) {
        const item = this.getItem(itemId);
        return item && item.tags ? item.tags.includes(tag) : false;
    }
};

// ---- RECIPE REGISTRY SYSTEM ----
export const RecipeRegistrySystem = {
    getRecipe(recipeId) {
        return RECIPES[recipeId] || null;
    },
    getRecipesByStation(stationType) {
        return Object.values(RECIPES).filter(r => r.stationRequired === stationType);
    },
    getQuickRecipes() {
        return Object.values(RECIPES).filter(r => r.stationRequired === null);
    }
};

// ---- RESOURCE SYSTEM ----
export const ResourceSystem = {
    getNodeData(nodeId) {
        return RESOURCE_NODES[nodeId] || null;
    },
    resolveDrops(nodeData) {
        const drops = [];
        if (!nodeData || !nodeData.dropTable) return drops;

        nodeData.dropTable.forEach(dropEntry => {
            if (Math.random() <= dropEntry.chance) {
                const qty = Math.floor(Math.random() * (dropEntry.max - dropEntry.min + 1)) + dropEntry.min;
                if (qty > 0) {
                    drops.push({ itemId: dropEntry.itemId, quantity: qty });
                }
            }
        });
        return drops;
    },
    applyHarvest(nodeEl, toolId) {
        const nodeData = this.getNodeData(nodeEl.components['resource-node'].data.nodeId);
        const toolData = ItemRegistrySystem.getItem(toolId);
        
        let damage = 0;
        if (nodeData.requiredTool === 'none' || nodeData.minToolTier === 0) {
            damage = 1; // Mano desnuda o herramienta básica no requerida estrictamente
        }
        
        if (toolData && toolData.toolType === nodeData.requiredTool && toolData.tier >= nodeData.minToolTier) {
            damage = toolData.damageProfile[nodeData.nodeType] || toolData.damageProfile['generic'] || 1;
        }

        return damage;
    }
};

// ---- CRAFTING SYSTEM ----
export const CraftingSystem = {
    canCraft(recipe, inventoryManager) {
        if (!recipe) return false;
        
        // Comprobar si tenemos todos los inputs requeridos
        for (const input of recipe.inputs) {
            if (inventoryManager.getItemCount(input.itemId) < input.quantity) {
                return false;
            }
        }
        return true;
    },
    tryCraft(recipeId, inventoryManager) {
        const recipe = RecipeRegistrySystem.getRecipe(recipeId);
        if (!recipe || recipe.stationRequired !== null) return false;
        if (!this.canCraft(recipe, inventoryManager)) return false;

        // Verificar si hay espacio para outputs antes de consumir
        let hasSpace = true;
        for (const output of recipe.outputs) {
            // Un check simplificado
            // Idealmente deberíamos simular el consumo para ver el espacio real, 
            // pero esto es suficiente para la mayoría de casos básicos.
            if (!inventoryManager.hasSpaceFor(output.itemId, output.quantity)) {
                hasSpace = false;
                break;
            }
        }

        if (!hasSpace) return false;

        // Consumir inputs
        recipe.inputs.forEach(input => {
            inventoryManager.removeItem(input.itemId, input.quantity);
        });

        // Dar outputs (Asumimos crafting instantáneo para el inventor rápido)
        recipe.outputs.forEach(output => {
            inventoryManager.addItem(output.itemId, output.quantity);
        });

        return true;
    }
};

// ---- INTERACTION SYSTEM ----
export const InteractionSystem = {
    tryInteract(actorEl, targetEl, toolId = null) {
        if (!targetEl) return;

        // Si es un nodo de recursos que se puede golpear/recolectar
        if (targetEl.hasAttribute('harvestable')) {
            targetEl.emit('harvest-attempt', { actorEl, toolId });
            return;
        }

        // Si es un item tirado en el suelo
        if (targetEl.hasAttribute('drop-item')) {
            targetEl.emit('pickup-attempt', { actorEl });
            return;
        }

        // Si es una estación
        if (targetEl.hasAttribute('crafting-station')) {
            targetEl.emit('station-opened', { actorEl });
            return;
        }
    }
};

// Registrar globalmente (útil para debug rápido si hace falta)
window.GAMESYSTEMS = {
    ItemRegistry: ItemRegistrySystem,
    RecipeRegistry: RecipeRegistrySystem,
    ResourceSystem: ResourceSystem,
    CraftingSystem: CraftingSystem,
    InteractionSystem: InteractionSystem
};
