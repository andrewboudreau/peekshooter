// ============================================
// MAP CONFIGURATION
// ============================================
// Defines map layouts, obstacles, cover, and lighting

const MapConfig = {
    maps: {
        arena: {
            id: 'arena',
            name: 'Arena',
            description: 'Classic training arena with symmetric cover',

            // Scene settings
            scene: {
                background: 0x1a1a24,
                fogColor: 0x1a1a24,
                fogDensity: 0.015
            },

            // Floor
            floor: {
                width: 50,
                height: 50,
                textureRepeat: [12, 12],
                color: null // Uses dev texture
            },

            // Walls
            walls: [
                { type: 'back', width: 50, height: 15, position: [0, 7.5, -20], rotation: 0, textureRepeat: [12, 4] },
                { type: 'left', width: 40, height: 15, position: [-10, 7.5, -10], rotation: Math.PI / 2, textureRepeat: [10, 4] },
                { type: 'right', width: 40, height: 15, position: [10, 7.5, -10], rotation: -Math.PI / 2, textureRepeat: [10, 4] }
            ],

            // Player-side cover
            playerCover: {
                z: -0.5,
                elements: [
                    { type: 'box', size: [3, 1.2, 0.3], position: [0, 0.6, 0], color: 0xff8800 },
                    { type: 'box', size: [0.3, 1.8, 0.5], position: [-1.65, 0.9, 0], color: 0xff8800 },
                    { type: 'box', size: [0.3, 1.8, 0.5], position: [1.65, 0.9, 0], color: 0xff8800 }
                ]
            },

            // Opponent-side cover
            opponentCover: {
                z: -14.5,
                elements: [
                    { type: 'box', size: [3, 1.2, 0.3], position: [0, 0.6, 0], color: 0xff8800 },
                    { type: 'box', size: [0.3, 1.8, 0.5], position: [-1.65, 0.9, 0], color: 0xff8800 },
                    { type: 'box', size: [0.3, 1.8, 0.5], position: [1.65, 0.9, 0], color: 0xff8800 }
                ]
            },

            // Random obstacles
            obstacles: {
                count: 5,
                sizeRange: [0.5, 1.5],
                xRange: [-7.5, 7.5],
                zRange: [-15, -5]
            },

            // Lighting
            lighting: {
                hemisphere: { skyColor: 0x8899aa, groundColor: 0x554433, intensity: 0.4 },
                ambient: { color: 0x404050, intensity: 0.3 },
                directional: { color: 0xffeedd, intensity: 1.0, position: [10, 25, 5] },
                fill: { color: 0x8899bb, intensity: 0.3, position: [-8, 10, -5] },
                accents: [
                    { type: 'point', color: 0xff4444, intensity: 0.6, distance: 25, position: [-6, 4, -12] },
                    { type: 'point', color: 0x4466ff, intensity: 0.6, distance: 25, position: [6, 4, -12] },
                    { type: 'point', color: 0xffaa66, intensity: 0.3, distance: 15, position: [0, 3, 2] }
                ]
            },

            // Spawn points
            spawns: {
                player: { position: [0, 1.6, 0] },
                opponent: { position: [0, 0, -15] }
            }
        },

        warehouse: {
            id: 'warehouse',
            name: 'Warehouse',
            description: 'Industrial warehouse with crates and equipment',

            // Scene settings
            scene: {
                background: 0x1a1815,
                fogColor: 0x1a1815,
                fogDensity: 0.012
            },

            // Floor - slightly larger
            floor: {
                width: 55,
                height: 55,
                textureRepeat: [14, 14],
                color: 0x3a3530 // Concrete color
            },

            // Walls - industrial look
            walls: [
                { type: 'back', width: 55, height: 18, position: [0, 9, -22], rotation: 0, textureRepeat: [14, 5], color: 0x4a4540 },
                { type: 'left', width: 44, height: 18, position: [-12, 9, -11], rotation: Math.PI / 2, textureRepeat: [11, 5], color: 0x4a4540 },
                { type: 'right', width: 44, height: 18, position: [12, 9, -11], rotation: -Math.PI / 2, textureRepeat: [11, 5], color: 0x4a4540 }
            ],

            // Player-side cover - wooden crates
            playerCover: {
                z: -0.5,
                elements: [
                    // Main crate stack (center)
                    { type: 'box', size: [1.2, 1.2, 1.2], position: [0, 0.6, 0], color: 0x8B4513 },
                    { type: 'box', size: [1.0, 0.8, 1.0], position: [0, 1.6, 0], color: 0x8B4513 },
                    // Left crate stack
                    { type: 'box', size: [1.0, 1.0, 1.0], position: [-2.2, 0.5, 0], color: 0x8B4513 },
                    { type: 'box', size: [1.0, 1.0, 1.0], position: [-2.2, 1.5, 0], color: 0x8B4513 },
                    { type: 'box', size: [0.8, 0.8, 0.8], position: [-2.2, 2.4, 0], color: 0x8B4513 },
                    // Right crate stack
                    { type: 'box', size: [1.0, 1.0, 1.0], position: [2.2, 0.5, 0], color: 0x8B4513 },
                    { type: 'box', size: [1.0, 1.0, 1.0], position: [2.2, 1.5, 0], color: 0x8B4513 },
                    { type: 'box', size: [0.8, 0.8, 0.8], position: [2.2, 2.4, 0], color: 0x8B4513 }
                ]
            },

            // Opponent-side cover - shipping containers and pallets
            opponentCover: {
                z: -14.5,
                elements: [
                    // Central container section
                    { type: 'box', size: [2.5, 2.0, 1.5], position: [0, 1.0, 0], color: 0x2255aa },
                    // Left pallet stack
                    { type: 'box', size: [1.2, 0.8, 1.2], position: [-2.5, 0.4, 0], color: 0x8B4513 },
                    { type: 'box', size: [1.0, 0.6, 1.0], position: [-2.5, 1.1, 0], color: 0x8B4513 },
                    { type: 'box', size: [0.8, 0.5, 0.8], position: [-2.5, 1.65, 0], color: 0x8B4513 },
                    // Right pallet stack
                    { type: 'box', size: [1.2, 0.8, 1.2], position: [2.5, 0.4, 0], color: 0x8B4513 },
                    { type: 'box', size: [1.0, 0.6, 1.0], position: [2.5, 1.1, 0], color: 0x8B4513 },
                    { type: 'box', size: [0.8, 0.5, 0.8], position: [2.5, 1.65, 0], color: 0x8B4513 }
                ]
            },

            // Static obstacles - warehouse equipment
            staticObstacles: [
                // Shelving units on sides
                { type: 'shelf', position: [-8, 0, -8], color: 0x555555 },
                { type: 'shelf', position: [8, 0, -8], color: 0x555555 },
                { type: 'shelf', position: [-8, 0, -16], color: 0x555555 },
                { type: 'shelf', position: [8, 0, -16], color: 0x555555 },
                // Barrels mid-field
                { type: 'barrel', position: [-4, 0, -7], color: 0x333333 },
                { type: 'barrel', position: [4.5, 0, -8], color: 0x333333 },
                { type: 'barrel', position: [-3.5, 0, -12], color: 0xaa4400 },
                { type: 'barrel', position: [3, 0, -11], color: 0xaa4400 },
                // Forklift
                { type: 'forklift', position: [6, 0, -5], color: 0xffaa00 },
                // Large crate
                { type: 'box', size: [2, 2, 2], position: [-5, 1, -10], color: 0x8B4513 }
            ],

            // No random obstacles
            obstacles: {
                count: 0
            },

            // Lighting - industrial warehouse
            lighting: {
                hemisphere: { skyColor: 0x999999, groundColor: 0x444433, intensity: 0.3 },
                ambient: { color: 0x555550, intensity: 0.4 },
                directional: { color: 0xffffee, intensity: 0.8, position: [5, 20, 0] },
                fill: { color: 0x8899aa, intensity: 0.2, position: [-5, 15, -10] },
                accents: [
                    // Overhead fluorescent-style lights
                    { type: 'point', color: 0xffffee, intensity: 0.5, distance: 20, position: [0, 8, -5] },
                    { type: 'point', color: 0xffffee, intensity: 0.5, distance: 20, position: [0, 8, -12] },
                    // Yellow safety lights at corners
                    { type: 'point', color: 0xffcc00, intensity: 0.4, distance: 15, position: [-10, 3, -2] },
                    { type: 'point', color: 0xffcc00, intensity: 0.4, distance: 15, position: [10, 3, -2] },
                    // Cool skylight effect
                    { type: 'point', color: 0x88aacc, intensity: 0.3, distance: 25, position: [0, 10, -10] }
                ]
            },

            // Spawn points
            spawns: {
                player: { position: [0, 1.6, 0] },
                opponent: { position: [0, 0, -15] }
            }
        }
    },

    // Get map by ID
    getMap(id) {
        return this.maps[id] || this.maps.arena;
    },

    // Get list of all map IDs
    getMapList() {
        return Object.keys(this.maps);
    },

    // Get map info for UI
    getMapInfo() {
        return Object.values(this.maps).map(m => ({
            id: m.id,
            name: m.name,
            description: m.description
        }));
    },

    // Create shelf obstacle (for warehouse)
    createShelf(THREE, position, color) {
        const group = new THREE.Group();
        const metalMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.4 });

        // Vertical posts
        const postGeo = new THREE.BoxGeometry(0.1, 3, 0.1);
        const positions = [[-0.6, 1.5, -0.4], [0.6, 1.5, -0.4], [-0.6, 1.5, 0.4], [0.6, 1.5, 0.4]];
        positions.forEach(pos => {
            const post = new THREE.Mesh(postGeo, metalMaterial);
            post.position.set(...pos);
            post.castShadow = true;
            group.add(post);
        });

        // Shelves
        const shelfGeo = new THREE.BoxGeometry(1.4, 0.05, 1);
        [0.8, 1.6, 2.4].forEach(y => {
            const shelf = new THREE.Mesh(shelfGeo, metalMaterial);
            shelf.position.set(0, y, 0);
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            group.add(shelf);
        });

        group.position.set(...position);
        return group;
    },

    // Create barrel obstacle
    createBarrel(THREE, position, color) {
        const group = new THREE.Group();
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.3 });

        const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16);
        const barrel = new THREE.Mesh(barrelGeo, barrelMaterial);
        barrel.position.set(0, 0.6, 0);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        group.add(barrel);

        // Rim details
        const rimGeo = new THREE.TorusGeometry(0.4, 0.03, 8, 16);
        const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 });
        [0.1, 1.1].forEach(y => {
            const rim = new THREE.Mesh(rimGeo, rimMaterial);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(0, y, 0);
            group.add(rim);
        });

        group.position.set(...position);
        return group;
    },

    // Create forklift obstacle
    createForklift(THREE, position, color) {
        const group = new THREE.Group();
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.3 });
        const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.5 });

        // Main body
        const bodyGeo = new THREE.BoxGeometry(1.2, 1.0, 2.0);
        const body = new THREE.Mesh(bodyGeo, bodyMaterial);
        body.position.set(0, 0.7, 0);
        body.castShadow = true;
        group.add(body);

        // Overhead guard
        const guardGeo = new THREE.BoxGeometry(1.3, 0.1, 1.8);
        const guard = new THREE.Mesh(guardGeo, metalMaterial);
        guard.position.set(0, 1.8, 0);
        guard.castShadow = true;
        group.add(guard);

        // Guard posts
        const postGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
        [[-0.55, 1.45, 0.8], [0.55, 1.45, 0.8], [-0.55, 1.45, -0.8], [0.55, 1.45, -0.8]].forEach(pos => {
            const post = new THREE.Mesh(postGeo, metalMaterial);
            post.position.set(...pos);
            group.add(post);
        });

        // Forks
        const forkGeo = new THREE.BoxGeometry(0.15, 0.08, 1.5);
        [[-0.3, 0.15, -1.5], [0.3, 0.15, -1.5]].forEach(pos => {
            const fork = new THREE.Mesh(forkGeo, metalMaterial);
            fork.position.set(...pos);
            fork.castShadow = true;
            group.add(fork);
        });

        // Mast
        const mastGeo = new THREE.BoxGeometry(0.8, 2.2, 0.15);
        const mast = new THREE.Mesh(mastGeo, metalMaterial);
        mast.position.set(0, 1.1, -0.85);
        mast.castShadow = true;
        group.add(mast);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        [[-0.55, 0.25, 0.6], [0.55, 0.25, 0.6], [-0.4, 0.2, -0.6], [0.4, 0.2, -0.6]].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
        });

        group.position.set(...position);
        group.rotation.y = Math.PI / 4; // Angled
        return group;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.MapConfig = MapConfig;
}
