// ============================================
// ANIMATION CONTROLLER
// Wraps THREE.AnimationMixer with crossfade and pose overlay support
// ============================================

class AnimationController {
    /**
     * Create an animation controller
     * @param {THREE.Object3D} root - Root object for the AnimationMixer
     */
    constructor(root) {
        this.root = root;
        this.mixer = new THREE.AnimationMixer(root);
        this.actions = new Map();  // name -> THREE.AnimationAction
        this.clips = new Map();    // name -> THREE.AnimationClip
        this.currentAction = null;
        this.currentName = null;
        this.blendDuration = 0.2;  // Default crossfade duration in seconds
        this.timeScale = 1.0;

        // Pose overlay state
        this.poseOverlay = null;
        this.poseWeight = 0;

        // Bone references for pose overlay
        this.bones = new Map();
        this._cacheBones();
    }

    /**
     * Cache bone references from the root hierarchy
     */
    _cacheBones() {
        // Method 1: Find bones by isBone flag
        this.root.traverse(obj => {
            if (obj.isBone || obj.type === 'Bone') {
                this.bones.set(obj.name, obj);
            }
        });

        // Method 2: Also check SkinnedMesh skeletons (GLTF models)
        this.root.traverse(obj => {
            if (obj.isSkinnedMesh && obj.skeleton) {
                obj.skeleton.bones.forEach(bone => {
                    if (!this.bones.has(bone.name)) {
                        this.bones.set(bone.name, bone);
                    }
                });
            }
        });

        console.log(`[AnimationController] Cached ${this.bones.size} bones:`, Array.from(this.bones.keys()).slice(0, 10), '...');
    }

    /**
     * Manually add bones from an external source
     * @param {object} bonesMap - Map of bone names to bone objects
     */
    addBones(bonesMap) {
        for (const [name, bone] of Object.entries(bonesMap)) {
            this.bones.set(name, bone);
        }
        console.log(`[AnimationController] Added ${Object.keys(bonesMap).length} external bones`);
    }

    /**
     * Add an animation clip
     * @param {string} name - Clip name
     * @param {THREE.AnimationClip} clip - Animation clip
     * @returns {THREE.AnimationAction} The created action
     */
    addClip(name, clip) {
        this.clips.set(name, clip);
        const action = this.mixer.clipAction(clip);
        action.setEffectiveWeight(0);
        action.enabled = true;
        this.actions.set(name, action);
        return action;
    }

    /**
     * Remove a clip by name
     * @param {string} name - Clip name
     */
    removeClip(name) {
        const action = this.actions.get(name);
        if (action) {
            action.stop();
            this.mixer.uncacheAction(this.clips.get(name));
        }
        this.clips.delete(name);
        this.actions.delete(name);
    }

    /**
     * Play an animation with optional crossfade
     * @param {string} name - Clip name to play
     * @param {object} options - Playback options
     * @param {number} [options.fadeIn] - Fade in duration (default: blendDuration)
     * @param {boolean} [options.loop] - Whether to loop (default: true)
     * @param {number} [options.timeScale] - Playback speed (default: 1)
     * @param {boolean} [options.reset] - Reset to start (default: true)
     * @returns {THREE.AnimationAction|null}
     */
    play(name, options = {}) {
        const action = this.actions.get(name);
        if (!action) {
            console.warn(`[AnimationController] Clip not found: ${name}`);
            return null;
        }

        const fadeIn = options.fadeIn !== undefined ? options.fadeIn : this.blendDuration;
        const loop = options.loop !== undefined ? options.loop : true;
        const timeScale = options.timeScale !== undefined ? options.timeScale : 1;
        const reset = options.reset !== undefined ? options.reset : true;

        // Configure loop mode
        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.clampWhenFinished = !loop;
        action.timeScale = timeScale;

        if (reset) {
            action.reset();
        }

        // Crossfade from current action
        if (this.currentAction && this.currentAction !== action) {
            this.currentAction.crossFadeTo(action, fadeIn, true);
        } else {
            action.fadeIn(fadeIn);
        }

        action.play();
        this.currentAction = action;
        this.currentName = name;

        return action;
    }

    /**
     * Stop the current animation
     * @param {number} [fadeOut] - Fade out duration
     */
    stop(fadeOut = 0.2) {
        if (this.currentAction) {
            this.currentAction.fadeOut(fadeOut);
            this.currentAction = null;
            this.currentName = null;
        }
    }

    /**
     * Pause/unpause all animations
     * @param {boolean} paused
     */
    setPaused(paused) {
        this.mixer.timeScale = paused ? 0 : this.timeScale;
    }

    /**
     * Set global time scale
     * @param {number} scale
     */
    setTimeScale(scale) {
        this.timeScale = scale;
        this.mixer.timeScale = scale;
    }

    /**
     * Update the mixer (call each frame)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        this.mixer.update(deltaTime);

        // Apply pose overlay after animation update
        if (this.poseOverlay && this.poseWeight > 0) {
            this._applyPoseOverlay();
        }
    }

    /**
     * Set a pose to overlay on top of animations
     * Used for procedural adjustments (crouch, lean) that blend with animations
     * @param {object} pose - Pose definition { boneName: { x, y, z } }
     * @param {number} weight - Blend weight (0-1)
     */
    applyPoseOverlay(pose, weight) {
        this.poseOverlay = pose;
        this.poseWeight = Math.max(0, Math.min(1, weight));
    }

    /**
     * Clear the pose overlay
     */
    clearPoseOverlay() {
        this.poseOverlay = null;
        this.poseWeight = 0;
    }

    /**
     * Internal: Apply pose overlay to bones
     */
    _applyPoseOverlay() {
        if (!this.poseOverlay) return;

        for (const [boneName, rotation] of Object.entries(this.poseOverlay)) {
            const bone = this.bones.get(boneName);
            if (!bone) continue;

            // Additively blend rotation
            if (rotation.x !== undefined) {
                bone.rotation.x += rotation.x * this.poseWeight;
            }
            if (rotation.y !== undefined) {
                bone.rotation.y += rotation.y * this.poseWeight;
            }
            if (rotation.z !== undefined) {
                bone.rotation.z += rotation.z * this.poseWeight;
            }
        }
    }

    /**
     * Get the current animation time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        return this.currentAction ? this.currentAction.time : 0;
    }

    /**
     * Get the current clip duration
     * @returns {number} Duration in seconds
     */
    getCurrentDuration() {
        const clip = this.currentName ? this.clips.get(this.currentName) : null;
        return clip ? clip.duration : 0;
    }

    /**
     * Seek to a specific time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        if (this.currentAction) {
            this.currentAction.time = time;
        }
    }

    /**
     * Get list of all clip names
     * @returns {string[]}
     */
    getClipNames() {
        return Array.from(this.clips.keys());
    }

    /**
     * Check if a clip exists
     * @param {string} name
     * @returns {boolean}
     */
    hasClip(name) {
        return this.clips.has(name);
    }

    /**
     * Get the currently playing clip name
     * @returns {string|null}
     */
    getCurrentClipName() {
        return this.currentName;
    }

    /**
     * Check if currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return this.currentAction && this.currentAction.isRunning();
    }

    /**
     * Listen for animation events
     * @param {string} event - Event name ('finished', 'loop')
     * @param {Function} callback
     */
    addEventListener(event, callback) {
        this.mixer.addEventListener(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event
     * @param {Function} callback
     */
    removeEventListener(event, callback) {
        this.mixer.removeEventListener(event, callback);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop(0);
        this.actions.forEach(action => {
            action.stop();
        });
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.root);
        this.actions.clear();
        this.clips.clear();
        this.bones.clear();
        this.poseOverlay = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
}
