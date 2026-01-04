// ============================================
// ENTITY BASE CLASS
// Foundation for all game entities (players, opponents, props)
// ============================================

class Entity {
    static nextId = 1;

    constructor(type = 'entity') {
        this.id = Entity.nextId++;
        this.type = type;
        this.components = new Map();
        this.tags = new Set();
        this.active = true;
        this.createdAt = Date.now();
    }

    /**
     * Add a component to this entity
     * @param {Component} component - Component instance to add
     * @returns {Entity} This entity (for chaining)
     */
    addComponent(component) {
        const name = component.constructor.name;
        if (this.components.has(name)) {
            console.warn(`Entity ${this.id}: Replacing existing ${name}`);
        }
        this.components.set(name, component);
        component.entity = this;

        // Call component's onAttach if it exists
        if (typeof component.onAttach === 'function') {
            component.onAttach(this);
        }

        return this;
    }

    /**
     * Remove a component from this entity
     * @param {string|function} componentType - Component class or class name
     * @returns {boolean} Whether component was removed
     */
    removeComponent(componentType) {
        const name = typeof componentType === 'string'
            ? componentType
            : componentType.name;

        const component = this.components.get(name);
        if (component) {
            // Call component's onDetach if it exists
            if (typeof component.onDetach === 'function') {
                component.onDetach(this);
            }
            component.entity = null;
            this.components.delete(name);
            return true;
        }
        return false;
    }

    /**
     * Get a component by type
     * @param {string|function} componentType - Component class or class name
     * @returns {Component|null} The component or null
     */
    getComponent(componentType) {
        const name = typeof componentType === 'string'
            ? componentType
            : componentType.name;
        return this.components.get(name) || null;
    }

    /**
     * Check if entity has a component
     * @param {string|function} componentType - Component class or class name
     * @returns {boolean} Whether entity has the component
     */
    hasComponent(componentType) {
        const name = typeof componentType === 'string'
            ? componentType
            : componentType.name;
        return this.components.has(name);
    }

    /**
     * Add a tag to this entity
     * @param {string} tag - Tag to add
     * @returns {Entity} This entity (for chaining)
     */
    addTag(tag) {
        this.tags.add(tag);
        return this;
    }

    /**
     * Remove a tag from this entity
     * @param {string} tag - Tag to remove
     * @returns {boolean} Whether tag was removed
     */
    removeTag(tag) {
        return this.tags.delete(tag);
    }

    /**
     * Check if entity has a tag
     * @param {string} tag - Tag to check
     * @returns {boolean} Whether entity has the tag
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }

    /**
     * Update all components
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.active) return;

        for (const component of this.components.values()) {
            if (component.active && typeof component.update === 'function') {
                component.update(deltaTime);
            }
        }
    }

    /**
     * Destroy this entity and all its components
     */
    destroy() {
        this.active = false;

        for (const component of this.components.values()) {
            if (typeof component.onDestroy === 'function') {
                component.onDestroy();
            }
            component.entity = null;
        }
        this.components.clear();
        this.tags.clear();

        // Emit destruction event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('entity:destroyed', { entity: this });
        }
    }

    /**
     * Serialize entity state (for networking/saving)
     * @returns {object} Serialized state
     */
    serialize() {
        const data = {
            id: this.id,
            type: this.type,
            tags: [...this.tags],
            components: {},
        };

        for (const [name, component] of this.components) {
            if (typeof component.serialize === 'function') {
                data.components[name] = component.serialize();
            }
        }

        return data;
    }

    /**
     * Deserialize state into entity
     * @param {object} data - Serialized state
     */
    deserialize(data) {
        if (data.tags) {
            this.tags = new Set(data.tags);
        }

        if (data.components) {
            for (const [name, componentData] of Object.entries(data.components)) {
                const component = this.components.get(name);
                if (component && typeof component.deserialize === 'function') {
                    component.deserialize(componentData);
                }
            }
        }
    }
}

// ============================================
// COMPONENT BASE CLASS
// Foundation for all components
// ============================================

class Component {
    constructor() {
        this.entity = null;
        this.active = true;
    }

    /**
     * Called when component is added to an entity
     * @param {Entity} entity - The entity this was added to
     */
    onAttach(entity) {
        // Override in subclasses
    }

    /**
     * Called when component is removed from an entity
     * @param {Entity} entity - The entity this was removed from
     */
    onDetach(entity) {
        // Override in subclasses
    }

    /**
     * Called every frame
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Override in subclasses
    }

    /**
     * Called when entity is destroyed
     */
    onDestroy() {
        // Override in subclasses
    }

    /**
     * Serialize component state
     * @returns {object} Serialized state
     */
    serialize() {
        return {};
    }

    /**
     * Deserialize state into component
     * @param {object} data - Serialized state
     */
    deserialize(data) {
        // Override in subclasses
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, Component };
}
