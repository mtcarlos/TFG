// registries.js - Archivo estático que define los datos base del juego.

export const ITEMS = {
    // Recursos
    wood_log: { id: 'wood_log', name: 'Tronco de madera', category: 'resource', stackable: true, maxStack: 64, tags: ['wood', 'raw', 'fuel'], buildable: true, blockType: 'voxel', blockMaterial: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg); color: #4A3A2C; roughness: 0.9; metalness: 0.0' },
    stone: { id: 'stone', name: 'Piedra', category: 'resource', stackable: true, maxStack: 64, tags: ['stone', 'raw'], buildable: true, blockType: 'voxel', blockMaterial: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg); color: #808080; roughness: 0.9; metalness: 0.1' },
    sand: { id: 'sand', name: 'Arena', category: 'resource', stackable: true, maxStack: 64, tags: ['sand', 'raw'], buildable: true, blockType: 'voxel', blockMaterial: 'color: #E2C275; roughness: 1.0; metalness: 0.0' },
    metal_ore: { id: 'metal_ore', name: 'Metal bruto', category: 'resource', stackable: true, maxStack: 64, tags: ['metal', 'raw'] },
    coal: { id: 'coal', name: 'Carbón', category: 'resource', stackable: true, maxStack: 64, tags: ['coal', 'fuel'] },
    fiber: { id: 'fiber', name: 'Fibra', category: 'resource', stackable: true, maxStack: 64, tags: ['fiber', 'raw'] },

    // Materiales refinados (ejemplos)
    wood_plank: { id: 'wood_plank', name: 'Tabla de madera', category: 'resource', stackable: true, maxStack: 64, tags: ['wood', 'refined'], buildable: true, blockType: 'voxel', blockMaterial: 'src: url(https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg); color: #8D6E63; roughness: 0.7; metalness: 0.0' },
    stick: { id: 'stick', name: 'Palo', category: 'resource', stackable: true, maxStack: 64, tags: ['wood', 'refined'] },
    rope: { id: 'rope', name: 'Cuerda', category: 'resource', stackable: true, maxStack: 64, tags: ['fiber', 'refined'] },
    metal_ingot: { id: 'metal_ingot', name: 'Lingote de metal', category: 'resource', stackable: true, maxStack: 64, tags: ['metal', 'refined'] },
    glass: { id: 'glass', name: 'Cristal', category: 'resource', stackable: true, maxStack: 64, tags: ['glass', 'refined'], buildable: true, blockType: 'voxel', blockMaterial: 'color: #A3E4D7; opacity: 0.5; transparent: true; roughness: 0.1; metalness: 0.9; depthWrite: false' },

    // Herramientas
    axe_basic: { id: 'axe_basic', name: 'Hacha rudimentaria', category: 'tool', stackable: false, durability: 40, toolType: 'axe', tier: 1, damageProfile: { tree: 1, wood: 1, generic: 0 } },
    pickaxe_basic: { id: 'pickaxe_basic', name: 'Pico rudimentario', category: 'tool', stackable: false, durability: 40, toolType: 'pickaxe', tier: 1, damageProfile: { rock: 1, stone: 1, generic: 0 } },
    shovel_basic: { id: 'shovel_basic', name: 'Pala rudimentaria', category: 'tool', stackable: false, durability: 40, toolType: 'shovel', tier: 1, damageProfile: { sand: 1, dirt: 1, generic: 0 } }
};

export const RECIPES = {
    // Crafting rápido (Inventario)
    planks_from_wood: {
        id: 'planks_from_wood', name: 'Tablas de madera', stationRequired: null, craftTimeMs: 0,
        inputs: [{ itemId: 'wood_log', quantity: 1 }], outputs: [{ itemId: 'wood_plank', quantity: 2 }], tags: ['basic', 'wood']
    },
    sticks_from_wood: {
        id: 'sticks_from_wood', name: 'Palos de madera', stationRequired: null, craftTimeMs: 0,
        inputs: [{ itemId: 'wood_plank', quantity: 1 }], outputs: [{ itemId: 'stick', quantity: 2 }], tags: ['basic', 'wood']
    },
    rope_from_fiber: {
        id: 'rope_from_fiber', name: 'Cuerda', stationRequired: null, craftTimeMs: 0,
        inputs: [{ itemId: 'fiber', quantity: 2 }], outputs: [{ itemId: 'rope', quantity: 1 }], tags: ['basic', 'fiber']
    },
    axe_basic: {
        id: 'axe_basic', name: 'Hacha rudimentaria', stationRequired: null, craftTimeMs: 1500,
        inputs: [{ itemId: 'stick', quantity: 1 }, { itemId: 'stone', quantity: 2 }], outputs: [{ itemId: 'axe_basic', quantity: 1 }], tags: ['tool', 'basic']
    },
    pickaxe_basic: {
        id: 'pickaxe_basic', name: 'Pico rudimentario', stationRequired: null, craftTimeMs: 1500,
        inputs: [{ itemId: 'stick', quantity: 1 }, { itemId: 'stone', quantity: 2 }], outputs: [{ itemId: 'pickaxe_basic', quantity: 1 }], tags: ['tool', 'basic']
    },
    
    // Crafting base de estaciones (Requieren estación)
    smelt_iron_ingot: {
        id: 'smelt_iron_ingot', name: 'Lingote de metal', stationRequired: 'furnace', craftTimeMs: 8000, fuelRequired: true,
        inputs: [{ itemId: 'metal_ore', quantity: 2 }], outputs: [{ itemId: 'metal_ingot', quantity: 1 }], tags: ['smelting', 'metal']
    },
    glass_from_sand: {
        id: 'glass_from_sand', name: 'Cristal', stationRequired: 'furnace', craftTimeMs: 5000, fuelRequired: true,
        inputs: [{ itemId: 'sand', quantity: 2 }], outputs: [{ itemId: 'glass', quantity: 1 }], tags: ['smelting', 'glass']
    }
};

export const RESOURCE_NODES = {
    tree_basic: {
        id: 'tree_basic', nodeType: 'tree', maxHealth: 5, requiredTool: 'axe', minToolTier: 0, respawnTimeMs: 120000,
        dropTable: [{ itemId: 'wood_log', min: 2, max: 4, chance: 1.0 }, { itemId: 'fiber', min: 0, max: 2, chance: 0.35 }]
    },
    rock_basic: {
        id: 'rock_basic', nodeType: 'rock', maxHealth: 6, requiredTool: 'pickaxe', minToolTier: 0, respawnTimeMs: 150000,
        dropTable: [{ itemId: 'stone', min: 2, max: 5, chance: 1.0 }]
    },
    metal_vein_basic: {
        id: 'metal_vein_basic', nodeType: 'rock', maxHealth: 8, requiredTool: 'pickaxe', minToolTier: 1, respawnTimeMs: 180000,
        dropTable: [{ itemId: 'metal_ore', min: 1, max: 3, chance: 1.0 }, { itemId: 'stone', min: 1, max: 2, chance: 0.5 }]
    },
    sand_pile_basic: {
        id: 'sand_pile_basic', nodeType: 'sand', maxHealth: 3, requiredTool: 'shovel', minToolTier: 1, respawnTimeMs: 60000,
        dropTable: [{ itemId: 'sand', min: 2, max: 4, chance: 1.0 }]
    }
};

export const STATIONS = {
    workbench: { id: 'workbench', name: 'Banco de trabajo', requiresFuel: false, allowedRecipeTags: ['basic', 'assembly', 'wood', 'tools'] },
    furnace: { id: 'furnace', name: 'Horno', requiresFuel: true, allowedRecipeTags: ['smelting', 'cooking', 'ceramic'] }
};
