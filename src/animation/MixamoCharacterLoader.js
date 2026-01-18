// ============================================
// MIXAMO CHARACTER LOADER
// Loads GLTF/GLB characters with Mixamo rig support
//
// Since all code now uses Mixamo bone names directly,
// no remapping is needed - bones keep their original names.
// ============================================

const MixamoCharacterLoader = {
    /**
     * Cache for loaded models
     */
    loadedModels: new Map(),

    /**
     * GLTFLoader instance (created lazily)
     */
    _loader: null,

    /**
     * Check if GLTFLoader is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof THREE !== 'undefined' && typeof THREE.GLTFLoader === 'function';
    },

    /**
     * Get or create the GLTFLoader instance
     * @returns {THREE.GLTFLoader|null}
     */
    _getLoader() {
        if (!this.isAvailable()) {
            console.warn('[MixamoCharacterLoader] GLTFLoader not available');
            return null;
        }
        if (!this._loader) {
            this._loader = new THREE.GLTFLoader();
        }
        return this._loader;
    },

    /**
     * Load a character model
     * @param {string} path - Path to GLB/GLTF file
     * @param {object} options - Load options
     * @param {boolean} [options.cache=true] - Whether to cache the model
     * @returns {Promise<object>} Loaded model data
     */
    async load(path, options = {}) {
        const cache = options.cache !== false;

        // Check cache first
        if (cache && this.loadedModels.has(path)) {
            console.log(`[MixamoCharacterLoader] Using cached model: ${path}`);
            return this._cloneModel(this.loadedModels.get(path));
        }

        const loader = this._getLoader();
        if (!loader) {
            throw new Error('GLTFLoader not available');
        }

        console.log(`[MixamoCharacterLoader] Loading: ${path}`);

        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    try {
                        const result = this._processGLTF(gltf);

                        // Cache if enabled
                        if (cache) {
                            this.loadedModels.set(path, result);
                        }

                        console.log(`[MixamoCharacterLoader] Loaded: ${path}`, {
                            bones: Object.keys(result.bones).length,
                            animations: result.animations.length,
                            meshes: result.meshes.length
                        });

                        // Return a clone for use
                        resolve(cache ? this._cloneModel(result) : result);
                    } catch (err) {
                        reject(err);
                    }
                },
                (progress) => {
                    // Progress callback
                    if (progress.lengthComputable) {
                        const pct = (progress.loaded / progress.total * 100).toFixed(0);
                        console.log(`[MixamoCharacterLoader] Loading ${path}: ${pct}%`);
                    }
                },
                (error) => {
                    console.error(`[MixamoCharacterLoader] Failed to load: ${path}`, error);
                    reject(error);
                }
            );
        });
    },

    /**
     * Process loaded GLTF data
     * Bones keep their original Mixamo names (no remapping)
     * @param {object} gltf - Loaded GLTF data
     * @returns {object} Processed model data
     */
    _processGLTF(gltf) {
        const root = gltf.scene;
        const bones = {};
        const meshes = [];
        let skeleton = null;

        // Find all bones and meshes - keep original Mixamo names
        root.traverse((obj) => {
            if (obj.isBone) {
                bones[obj.name] = obj;
            }

            if (obj.isSkinnedMesh) {
                meshes.push(obj);
                if (obj.skeleton) {
                    skeleton = obj.skeleton;
                }
            }
        });

        // Animations keep their original track names (Mixamo format)
        const animations = gltf.animations ? gltf.animations.slice() : [];

        // Generate hitboxes using MixamoBoneMap
        const hitboxes = this._generateHitboxes(meshes, bones);

        return {
            root,
            bones,
            meshes,
            skeleton,
            animations,
            hitboxes,
            gltf  // Keep reference to original GLTF data
        };
    },

    /**
     * Clone a cached model for reuse
     * @param {object} model - Cached model data
     * @returns {object} Cloned model data
     */
    _cloneModel(model) {
        const root = model.root.clone(true);
        const bones = {};
        const meshes = [];
        let skeleton = null;

        // Rebuild references from cloned hierarchy
        root.traverse((obj) => {
            if (obj.isBone) {
                bones[obj.name] = obj;
            }
            if (obj.isSkinnedMesh) {
                meshes.push(obj);
                if (obj.skeleton) {
                    skeleton = obj.skeleton;
                }
            }
        });

        // Clone animations
        const animations = (model.animations || []).map(clip => clip.clone());

        // Clone hitboxes with new mesh references
        const hitboxes = (model.hitboxes || []).map(hb => ({
            ...hb,
            mesh: null,  // Will need to be regenerated
            bone: hb.bone
        }));

        return {
            root,
            bones,
            meshes,
            skeleton,
            animations,
            hitboxes
        };
    },

    /**
     * Generate hitbox definitions from mesh and bones
     * Uses MixamoBoneMap.hitboxParts for damage category mapping
     * @param {THREE.SkinnedMesh[]} meshes
     * @param {object} bones
     * @returns {Array} Hitbox definitions
     */
    _generateHitboxes(meshes, bones) {
        const hitboxes = [];

        // Require MixamoBoneMap - it's a core dependency
        if (typeof MixamoBoneMap === 'undefined' || !MixamoBoneMap.hitboxParts) {
            console.warn('[MixamoCharacterLoader] MixamoBoneMap.hitboxParts not available');
            return hitboxes;
        }

        for (const [boneName, config] of Object.entries(MixamoBoneMap.hitboxParts)) {
            if (bones[boneName]) {
                hitboxes.push({
                    bone: boneName,
                    part: config.part,
                    critical: config.critical,
                    mesh: null  // Will be set when integrated
                });
            }
        }

        return hitboxes;
    },

    /**
     * Load just animation clips (for adding to existing character)
     * @param {string} path - Path to animation GLB
     * @param {object} options - Load options
     * @returns {Promise<THREE.AnimationClip[]>}
     */
    async loadAnimation(path, options = {}) {
        const loader = this._getLoader();
        if (!loader) {
            throw new Error('GLTFLoader not available');
        }

        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    // Animations keep original Mixamo track names
                    const animations = gltf.animations;
                    console.log(`[MixamoCharacterLoader] Loaded ${animations.length} animation(s) from: ${path}`);
                    resolve(animations);
                },
                undefined,
                (error) => {
                    console.error(`[MixamoCharacterLoader] Failed to load animation: ${path}`, error);
                    reject(error);
                }
            );
        });
    },

    /**
     * Preload a model without returning it
     * @param {string} path - Path to GLB/GLTF file
     * @returns {Promise<void>}
     */
    async preload(path) {
        try {
            await this.load(path, { cache: true });
        } catch (err) {
            console.warn(`[MixamoCharacterLoader] Preload failed for: ${path}`, err);
        }
    },

    /**
     * Clear the model cache
     * @param {string} [path] - Specific path to clear, or all if not specified
     */
    clearCache(path) {
        if (path) {
            this.loadedModels.delete(path);
        } else {
            this.loadedModels.clear();
        }
    },

    /**
     * Get bone mapping info for debugging
     * @param {object} model - Loaded model data
     * @returns {object} Mapping info
     */
    getBoneMappingInfo(model) {
        const info = {
            mixamoBones: [],
            otherBones: [],
            total: Object.keys(model.bones).length
        };

        for (const boneName of Object.keys(model.bones)) {
            if (boneName.startsWith('mixamorig:')) {
                info.mixamoBones.push(boneName);
            } else {
                info.otherBones.push(boneName);
            }
        }

        return info;
    },

    /**
     * Attach an object to a bone
     * @param {object} model - Loaded model data
     * @param {string} boneName - Bone name to attach to (Mixamo format)
     * @param {THREE.Object3D} object - Object to attach
     */
    attachToBone(model, boneName, object) {
        const bone = model.bones[boneName];
        if (bone) {
            bone.add(object);
        } else {
            console.warn(`[MixamoCharacterLoader] Bone not found: ${boneName}`);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MixamoCharacterLoader;
}
