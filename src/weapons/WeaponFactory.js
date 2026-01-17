// ============================================
// WEAPON FACTORY
// Creates 3D weapon models for first-person view
// ============================================

console.log('[WeaponFactory] Loading weapon factory...');

const WeaponFactory = {
    // Shared materials (created once, reused across all weapons)
    materials: null,

    // ============================================
    // Material Initialization
    // ============================================
    initMaterials() {
        if (this.materials) return this.materials;

        this.materials = {
            metalDark: new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.25,
                metalness: 0.9
            }),
            metalMedium: new THREE.MeshStandardMaterial({
                color: 0x2d2d2d,
                roughness: 0.3,
                metalness: 0.85
            }),
            metalLight: new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.35,
                metalness: 0.8
            }),
            polymer: new THREE.MeshStandardMaterial({
                color: 0x1f1f1f,
                roughness: 0.6,
                metalness: 0.1
            }),
            polymerTan: new THREE.MeshStandardMaterial({
                color: 0x3d3428,
                roughness: 0.55,
                metalness: 0.1
            }),
            wood: new THREE.MeshStandardMaterial({
                color: 0x5c3a21,
                roughness: 0.7,
                metalness: 0.05
            }),
            scope: new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.1,
                metalness: 0.95
            }),
            scopeLens: new THREE.MeshStandardMaterial({
                color: 0x3366ff,
                roughness: 0.0,
                metalness: 0.3,
                transparent: true,
                opacity: 0.6
            }),
        };

        console.log('[WeaponFactory] Materials initialized');
        return this.materials;
    },

    // ============================================
    // Main Creation Method
    // ============================================
    createWeapon(weaponId) {
        this.initMaterials();

        switch (weaponId) {
            case 'pistol':
                return this.createPistol();
            case 'smg':
                return this.createSMG();
            case 'assault_rifle':
                return this.createAssaultRifle();
            case 'shotgun':
                return this.createShotgun();
            case 'sniper':
                return this.createSniper();
            case 'rpg':
                return this.createRPG();
            default:
                console.warn('[WeaponFactory] Unknown weapon:', weaponId);
                return this.createAssaultRifle();
        }
    },

    // ============================================
    // Realistic Opponent Weapon (uses full detailed models)
    // ============================================
    createOpponentWeapon(weaponId) {
        // Use the full detailed weapon model
        const weapon = this.createWeapon(weaponId);

        // Scale down slightly for third-person view (weapons are designed for FPS close-up)
        const scale = 0.7;
        weapon.scale.set(scale, scale, scale);

        // No extra rotation needed - opponent mesh already faces player
        // Weapon points in -Z which becomes +Z (toward player) after opponent's 180° rotation

        return weapon;
    },

    // ============================================
    // Dispose Weapon
    // ============================================
    disposeWeapon(weaponGroup) {
        if (!weaponGroup) return;

        weaponGroup.traverse((obj) => {
            if (obj.geometry) {
                obj.geometry.dispose();
            }
            // Don't dispose shared materials
        });
    },

    // ============================================
    // PISTOL - Compact semi-auto (detailed model)
    // ============================================
    createPistol() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // === SLIDE ===
        const slideGeo = new THREE.BoxGeometry(0.028, 0.035, 0.16);
        const slide = new THREE.Mesh(slideGeo, m.metalDark);
        slide.position.set(0, 0.022, -0.02);
        weapon.add(slide);

        // Slide serrations (rear)
        for (let i = 0; i < 6; i++) {
            const serrGeo = new THREE.BoxGeometry(0.03, 0.002, 0.004);
            const serr = new THREE.Mesh(serrGeo, m.metalMedium);
            serr.position.set(0, 0.022, 0.04 + i * 0.008);
            weapon.add(serr);
        }

        // Slide serrations (front)
        for (let i = 0; i < 4; i++) {
            const serrGeo = new THREE.BoxGeometry(0.03, 0.002, 0.004);
            const serr = new THREE.Mesh(serrGeo, m.metalMedium);
            serr.position.set(0, 0.022, -0.07 - i * 0.008);
            weapon.add(serr);
        }

        // Ejection port
        const ejectionGeo = new THREE.BoxGeometry(0.018, 0.012, 0.035);
        const ejection = new THREE.Mesh(ejectionGeo, m.metalMedium);
        ejection.position.set(0.008, 0.035, 0.01);
        weapon.add(ejection);

        // === BARREL ===
        const barrelGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.08, 12);
        const barrel = new THREE.Mesh(barrelGeo, m.metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.015, -0.14);
        weapon.add(barrel);

        // Barrel hood (visible through ejection port)
        const hoodGeo = new THREE.BoxGeometry(0.018, 0.012, 0.03);
        const hood = new THREE.Mesh(hoodGeo, m.metalMedium);
        hood.position.set(0, 0.012, -0.04);
        weapon.add(hood);

        // === FRAME ===
        const frameGeo = new THREE.BoxGeometry(0.026, 0.025, 0.12);
        const frame = new THREE.Mesh(frameGeo, m.polymer);
        frame.position.set(0, -0.005, 0.01);
        weapon.add(frame);

        // Dust cover / rail
        const dustCoverGeo = new THREE.BoxGeometry(0.024, 0.015, 0.05);
        const dustCover = new THREE.Mesh(dustCoverGeo, m.polymer);
        dustCover.position.set(0, -0.01, -0.06);
        weapon.add(dustCover);

        // Accessory rail slots
        for (let i = 0; i < 3; i++) {
            const railSlotGeo = new THREE.BoxGeometry(0.026, 0.004, 0.008);
            const railSlot = new THREE.Mesh(railSlotGeo, m.metalDark);
            railSlot.position.set(0, -0.02, -0.045 - i * 0.015);
            weapon.add(railSlot);
        }

        // === TRIGGER GUARD ===
        const triggerGuardGeo = new THREE.BoxGeometry(0.022, 0.008, 0.04);
        const triggerGuard = new THREE.Mesh(triggerGuardGeo, m.polymer);
        triggerGuard.position.set(0, -0.03, 0.02);
        weapon.add(triggerGuard);

        // Trigger guard front
        const tgFrontGeo = new THREE.BoxGeometry(0.022, 0.025, 0.008);
        const tgFront = new THREE.Mesh(tgFrontGeo, m.polymer);
        tgFront.position.set(0, -0.02, 0);
        weapon.add(tgFront);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.004, 0.018, 0.012);
        const trigger = new THREE.Mesh(triggerGeo, m.metalDark);
        trigger.position.set(0, -0.015, 0.025);
        trigger.rotation.x = 0.2;
        weapon.add(trigger);

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.028, 0.08, 0.035);
        const grip = new THREE.Mesh(gripGeo, m.polymer);
        grip.position.set(0, -0.06, 0.045);
        grip.rotation.x = 0.15;
        weapon.add(grip);

        // Grip texture (stippling pattern)
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
                const dotGeo = new THREE.BoxGeometry(0.003, 0.003, 0.003);
                const dotLeft = new THREE.Mesh(dotGeo, m.metalDark);
                dotLeft.position.set(-0.016, -0.04 - i * 0.015, 0.035 + j * 0.01);
                dotLeft.rotation.x = 0.15;
                weapon.add(dotLeft);
                const dotRight = new THREE.Mesh(dotGeo, m.metalDark);
                dotRight.position.set(0.016, -0.04 - i * 0.015, 0.035 + j * 0.01);
                dotRight.rotation.x = 0.15;
                weapon.add(dotRight);
            }
        }

        // Beavertail
        const beavertailGeo = new THREE.BoxGeometry(0.024, 0.015, 0.02);
        const beavertail = new THREE.Mesh(beavertailGeo, m.polymer);
        beavertail.position.set(0, 0.002, 0.07);
        weapon.add(beavertail);

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.022, 0.07, 0.028);
        const mag = new THREE.Mesh(magGeo, m.metalMedium);
        mag.position.set(0, -0.07, 0.045);
        mag.rotation.x = 0.15;
        weapon.add(mag);

        // Magazine base plate
        const baseGeo = new THREE.BoxGeometry(0.026, 0.008, 0.032);
        const basePlate = new THREE.Mesh(baseGeo, m.polymerTan);
        basePlate.position.set(0, -0.105, 0.05);
        basePlate.rotation.x = 0.15;
        weapon.add(basePlate);

        // === THREE-DOT SIGHTS ===
        // Front sight
        const frontSightGeo = new THREE.BoxGeometry(0.008, 0.012, 0.006);
        const frontSight = new THREE.Mesh(frontSightGeo, m.metalDark);
        frontSight.position.set(0, 0.046, -0.08);
        weapon.add(frontSight);

        // Front sight dot (white)
        const sightDotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333 });
        const frontDotGeo = new THREE.BoxGeometry(0.004, 0.004, 0.002);
        const frontDot = new THREE.Mesh(frontDotGeo, sightDotMat);
        frontDot.position.set(0, 0.048, -0.084);
        weapon.add(frontDot);

        // Rear sight
        const rearSightGeo = new THREE.BoxGeometry(0.022, 0.01, 0.008);
        const rearSight = new THREE.Mesh(rearSightGeo, m.metalDark);
        rearSight.position.set(0, 0.045, 0.05);
        weapon.add(rearSight);

        // Rear sight notch
        const notchGeo = new THREE.BoxGeometry(0.006, 0.012, 0.01);
        const notch = new THREE.Mesh(notchGeo, m.metalMedium);
        notch.position.set(0, 0.045, 0.05);
        weapon.add(notch);

        // Rear sight dots
        const rearDotLeft = new THREE.Mesh(frontDotGeo, sightDotMat);
        rearDotLeft.position.set(-0.008, 0.048, 0.054);
        weapon.add(rearDotLeft);
        const rearDotRight = new THREE.Mesh(frontDotGeo, sightDotMat);
        rearDotRight.position.set(0.008, 0.048, 0.054);
        weapon.add(rearDotRight);

        // === CONTROLS ===
        // Slide stop
        const slideStopGeo = new THREE.BoxGeometry(0.004, 0.008, 0.015);
        const slideStop = new THREE.Mesh(slideStopGeo, m.metalDark);
        slideStop.position.set(-0.016, 0.01, 0.02);
        weapon.add(slideStop);

        // Magazine release
        const magReleaseGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 8);
        const magRelease = new THREE.Mesh(magReleaseGeo, m.metalDark);
        magRelease.rotation.z = Math.PI / 2;
        magRelease.position.set(-0.016, -0.01, 0.035);
        weapon.add(magRelease);

        // Takedown lever
        const takedownGeo = new THREE.BoxGeometry(0.006, 0.01, 0.012);
        const takedown = new THREE.Mesh(takedownGeo, m.metalDark);
        takedown.position.set(-0.018, -0.005, -0.02);
        weapon.add(takedown);

        return weapon;
    },

    // ============================================
    // SMG - Compact automatic
    // ============================================
    createSMG() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // === RECEIVER ===
        const receiverGeo = new THREE.BoxGeometry(0.045, 0.05, 0.2);
        const receiver = new THREE.Mesh(receiverGeo, m.metalMedium);
        receiver.position.set(0, 0, 0);
        weapon.add(receiver);

        // Upper rail
        const upperRailGeo = new THREE.BoxGeometry(0.025, 0.012, 0.18);
        const upperRail = new THREE.Mesh(upperRailGeo, m.metalDark);
        upperRail.position.set(0, 0.03, 0);
        weapon.add(upperRail);

        // === BARREL SHROUD ===
        const shroudGeo = new THREE.BoxGeometry(0.04, 0.04, 0.12);
        const shroud = new THREE.Mesh(shroudGeo, m.polymer);
        shroud.position.set(0, -0.005, -0.16);
        weapon.add(shroud);

        // Ventilation holes
        for (let i = 0; i < 4; i++) {
            const holeGeo = new THREE.BoxGeometry(0.042, 0.015, 0.008);
            const hole = new THREE.Mesh(holeGeo, m.metalDark);
            hole.position.set(0, -0.005, -0.1 - i * 0.025);
            weapon.add(hole);
        }

        // === BARREL ===
        const barrelGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.18, 12);
        const barrel = new THREE.Mesh(barrelGeo, m.metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, -0.3);
        weapon.add(barrel);

        // Muzzle
        const muzzleGeo = new THREE.CylinderGeometry(0.012, 0.01, 0.03, 12);
        const muzzle = new THREE.Mesh(muzzleGeo, m.metalDark);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0, -0.4);
        weapon.add(muzzle);

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.032, 0.075, 0.04);
        const grip = new THREE.Mesh(gripGeo, m.polymer);
        grip.position.set(0, -0.06, 0.06);
        grip.rotation.x = 0.2;
        weapon.add(grip);

        // Grip texture
        for (let i = 0; i < 4; i++) {
            const lineGeo = new THREE.BoxGeometry(0.001, 0.055, 0.03);
            const line = new THREE.Mesh(lineGeo, m.metalDark);
            line.position.set(0.016 - i * 0.01, -0.06, 0.06);
            line.rotation.x = 0.2;
            weapon.add(line);
        }

        // Trigger guard
        const guardGeo = new THREE.BoxGeometry(0.038, 0.035, 0.008);
        const guard = new THREE.Mesh(guardGeo, m.polymer);
        guard.position.set(0, -0.04, 0.02);
        weapon.add(guard);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.005, 0.02, 0.01);
        const trigger = new THREE.Mesh(triggerGeo, m.metalDark);
        trigger.position.set(0, -0.03, 0.015);
        trigger.rotation.x = 0.25;
        weapon.add(trigger);

        // === STOCK (Folded) ===
        const stockGeo = new THREE.BoxGeometry(0.03, 0.025, 0.1);
        const stock = new THREE.Mesh(stockGeo, m.polymer);
        stock.position.set(0, 0.025, 0.15);
        weapon.add(stock);

        // Stock end cap
        const capGeo = new THREE.BoxGeometry(0.035, 0.03, 0.015);
        const cap = new THREE.Mesh(capGeo, m.polymerTan);
        cap.position.set(0, 0.025, 0.205);
        weapon.add(cap);

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.024, 0.1, 0.035);
        const mag = new THREE.Mesh(magGeo, m.metalMedium);
        mag.position.set(0, -0.08, -0.02);
        weapon.add(mag);

        // Mag floor plate
        const floorGeo = new THREE.BoxGeometry(0.026, 0.008, 0.038);
        const floor = new THREE.Mesh(floorGeo, m.polymerTan);
        floor.position.set(0, -0.135, -0.02);
        weapon.add(floor);

        // === SIGHTS ===
        // Red dot style sight
        const sightBaseGeo = new THREE.BoxGeometry(0.022, 0.02, 0.035);
        const sightBase = new THREE.Mesh(sightBaseGeo, m.metalDark);
        sightBase.position.set(0, 0.045, 0.02);
        weapon.add(sightBase);

        // Sight window
        const windowGeo = new THREE.BoxGeometry(0.018, 0.015, 0.025);
        const window = new THREE.Mesh(windowGeo, m.scopeLens);
        window.position.set(0, 0.05, 0.02);
        weapon.add(window);

        // === CHARGING HANDLE ===
        const chargeGeo = new THREE.BoxGeometry(0.05, 0.015, 0.02);
        const charge = new THREE.Mesh(chargeGeo, m.metalDark);
        charge.position.set(0, 0.02, 0.11);
        weapon.add(charge);

        // Foregrip
        const foregripGeo = new THREE.BoxGeometry(0.025, 0.05, 0.02);
        const foregrip = new THREE.Mesh(foregripGeo, m.polymer);
        foregrip.position.set(0, -0.045, -0.12);
        weapon.add(foregrip);

        return weapon;
    },

    // ============================================
    // ASSAULT RIFLE - Full-size automatic
    // ============================================
    createAssaultRifle() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // === UPPER RECEIVER ===
        const upperGeometry = new THREE.BoxGeometry(0.055, 0.055, 0.28);
        const upper = new THREE.Mesh(upperGeometry, m.metalMedium);
        upper.position.set(0, 0.01, 0.02);
        weapon.add(upper);

        // Ejection port
        const ejectionGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.06);
        const ejection = new THREE.Mesh(ejectionGeometry, m.metalDark);
        ejection.position.set(0.028, 0.02, 0);
        weapon.add(ejection);

        // Charging handle
        const chargingGeometry = new THREE.BoxGeometry(0.04, 0.015, 0.03);
        const charging = new THREE.Mesh(chargingGeometry, m.metalDark);
        charging.position.set(0, 0.045, 0.12);
        weapon.add(charging);

        // Forward assist
        const assistGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8);
        const assist = new THREE.Mesh(assistGeometry, m.metalDark);
        assist.rotation.z = Math.PI / 2;
        assist.position.set(0.035, 0.01, 0.05);
        weapon.add(assist);

        // === LOWER RECEIVER ===
        const lowerGeometry = new THREE.BoxGeometry(0.05, 0.045, 0.18);
        const lower = new THREE.Mesh(lowerGeometry, m.metalMedium);
        lower.position.set(0, -0.03, 0.07);
        weapon.add(lower);

        // Magazine well
        const magWellGeometry = new THREE.BoxGeometry(0.035, 0.025, 0.07);
        const magWell = new THREE.Mesh(magWellGeometry, m.metalDark);
        magWell.position.set(0, -0.055, 0.04);
        weapon.add(magWell);

        // Trigger guard
        const triggerGuardShape = new THREE.Shape();
        triggerGuardShape.moveTo(0, 0);
        triggerGuardShape.lineTo(0.05, 0);
        triggerGuardShape.lineTo(0.05, -0.035);
        triggerGuardShape.lineTo(0.045, -0.04);
        triggerGuardShape.lineTo(0.005, -0.04);
        triggerGuardShape.lineTo(0, -0.035);
        triggerGuardShape.lineTo(0, 0);
        const triggerGuardGeo = new THREE.ExtrudeGeometry(triggerGuardShape, { depth: 0.008, bevelEnabled: false });
        const triggerGuard = new THREE.Mesh(triggerGuardGeo, m.polymer);
        triggerGuard.rotation.y = Math.PI / 2;
        triggerGuard.position.set(0.004, -0.045, 0.13);
        weapon.add(triggerGuard);

        // Trigger
        const triggerGeometry = new THREE.BoxGeometry(0.006, 0.025, 0.015);
        const trigger = new THREE.Mesh(triggerGeometry, m.metalDark);
        trigger.position.set(0, -0.055, 0.1);
        trigger.rotation.x = 0.3;
        weapon.add(trigger);

        // === PISTOL GRIP ===
        const gripGeometry = new THREE.BoxGeometry(0.038, 0.095, 0.05);
        const grip = new THREE.Mesh(gripGeometry, m.polymer);
        grip.position.set(0, -0.095, 0.145);
        grip.rotation.x = 0.25;
        weapon.add(grip);

        // Grip texture lines
        for (let i = 0; i < 5; i++) {
            const lineGeo = new THREE.BoxGeometry(0.001, 0.06, 0.035);
            const line = new THREE.Mesh(lineGeo, m.metalDark);
            line.position.set(0.02, -0.09, 0.145);
            line.rotation.x = 0.25;
            line.position.x = 0.02 - i * 0.01;
            weapon.add(line);
        }

        // === STOCK ===
        // Buffer tube
        const bufferGeometry = new THREE.CylinderGeometry(0.018, 0.02, 0.15, 12);
        const buffer = new THREE.Mesh(bufferGeometry, m.metalMedium);
        buffer.rotation.x = Math.PI / 2;
        buffer.position.set(0, 0, 0.23);
        weapon.add(buffer);

        // Stock body
        const stockGeometry = new THREE.BoxGeometry(0.045, 0.065, 0.12);
        const stock = new THREE.Mesh(stockGeometry, m.polymer);
        stock.position.set(0, -0.005, 0.32);
        weapon.add(stock);

        // Stock buttpad
        const buttpadGeometry = new THREE.BoxGeometry(0.05, 0.075, 0.015);
        const buttpad = new THREE.Mesh(buttpadGeometry, m.polymerTan);
        buttpad.position.set(0, -0.005, 0.385);
        weapon.add(buttpad);

        // Cheek rest
        const cheekGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.08);
        const cheek = new THREE.Mesh(cheekGeometry, m.polymer);
        cheek.position.set(0, 0.035, 0.3);
        weapon.add(cheek);

        // === HANDGUARD ===
        const handguardGeometry = new THREE.BoxGeometry(0.058, 0.058, 0.22);
        const handguard = new THREE.Mesh(handguardGeometry, m.polymer);
        handguard.position.set(0, 0.005, -0.22);
        weapon.add(handguard);

        // M-LOK slots
        for (let i = 0; i < 3; i++) {
            const slotGeo = new THREE.BoxGeometry(0.02, 0.008, 0.04);
            const slotLeft = new THREE.Mesh(slotGeo, m.metalDark);
            slotLeft.position.set(-0.032, 0.005, -0.13 - i * 0.06);
            weapon.add(slotLeft);
            const slotRight = new THREE.Mesh(slotGeo, m.metalDark);
            slotRight.position.set(0.032, 0.005, -0.13 - i * 0.06);
            weapon.add(slotRight);
        }

        // Bottom rail on handguard
        const bottomRailGeo = new THREE.BoxGeometry(0.025, 0.012, 0.18);
        const bottomRail = new THREE.Mesh(bottomRailGeo, m.metalMedium);
        bottomRail.position.set(0, -0.03, -0.2);
        weapon.add(bottomRail);

        // === BARREL ASSEMBLY ===
        // Gas block
        const gasBlockGeometry = new THREE.BoxGeometry(0.035, 0.04, 0.025);
        const gasBlock = new THREE.Mesh(gasBlockGeometry, m.metalDark);
        gasBlock.position.set(0, 0.025, -0.3);
        weapon.add(gasBlock);

        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.012, 0.014, 0.35, 16);
        const barrel = new THREE.Mesh(barrelGeometry, m.metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.005, -0.42);
        weapon.add(barrel);

        // Muzzle device / flash hider
        const muzzleGeometry = new THREE.CylinderGeometry(0.016, 0.014, 0.06, 16);
        const muzzle = new THREE.Mesh(muzzleGeometry, m.metalDark);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.005, -0.62);
        weapon.add(muzzle);

        // Muzzle ports
        for (let i = 0; i < 4; i++) {
            const portGeo = new THREE.BoxGeometry(0.025, 0.006, 0.008);
            const port = new THREE.Mesh(portGeo, m.metalMedium);
            port.position.set(0, 0.005, -0.6 - i * 0.012);
            weapon.add(port);
        }

        // === MAGAZINE ===
        const magBodyGeo = new THREE.BoxGeometry(0.028, 0.16, 0.055);
        const mag = new THREE.Mesh(magBodyGeo, m.metalMedium);
        mag.position.set(0, -0.13, 0.04);
        mag.rotation.x = 0.05;
        weapon.add(mag);

        // Magazine floor plate
        const floorPlateGeo = new THREE.BoxGeometry(0.032, 0.012, 0.06);
        const floorPlate = new THREE.Mesh(floorPlateGeo, m.polymerTan);
        floorPlate.position.set(0, -0.21, 0.04);
        weapon.add(floorPlate);

        // === OPTICS / SIGHTS ===
        // Picatinny rail
        const topRailGeo = new THREE.BoxGeometry(0.028, 0.015, 0.35);
        const topRail = new THREE.Mesh(topRailGeo, m.metalMedium);
        topRail.position.set(0, 0.045, -0.05);
        weapon.add(topRail);

        // Rail grooves
        for (let i = 0; i < 12; i++) {
            const grooveGeo = new THREE.BoxGeometry(0.03, 0.004, 0.008);
            const groove = new THREE.Mesh(grooveGeo, m.metalDark);
            groove.position.set(0, 0.055, 0.1 - i * 0.028);
            weapon.add(groove);
        }

        // Front sight post
        const frontSightBase = new THREE.BoxGeometry(0.025, 0.025, 0.015);
        const frontBase = new THREE.Mesh(frontSightBase, m.metalDark);
        frontBase.position.set(0, 0.055, -0.28);
        weapon.add(frontBase);

        const frontPostGeo = new THREE.BoxGeometry(0.008, 0.035, 0.008);
        const frontPost = new THREE.Mesh(frontPostGeo, m.metalDark);
        frontPost.position.set(0, 0.08, -0.28);
        weapon.add(frontPost);

        // Rear sight
        const rearSightBase = new THREE.BoxGeometry(0.035, 0.02, 0.025);
        const rearBase = new THREE.Mesh(rearSightBase, m.metalDark);
        rearBase.position.set(0, 0.055, 0.06);
        weapon.add(rearBase);

        const rearApertureLeft = new THREE.BoxGeometry(0.008, 0.03, 0.01);
        const rearLeft = new THREE.Mesh(rearApertureLeft, m.metalDark);
        rearLeft.position.set(-0.012, 0.075, 0.06);
        weapon.add(rearLeft);

        const rearApertureRight = new THREE.BoxGeometry(0.008, 0.03, 0.01);
        const rearRight = new THREE.Mesh(rearApertureRight, m.metalDark);
        rearRight.position.set(0.012, 0.075, 0.06);
        weapon.add(rearRight);

        // === BOLT CATCH / CONTROLS ===
        const boltCatchGeo = new THREE.BoxGeometry(0.008, 0.02, 0.015);
        const boltCatch = new THREE.Mesh(boltCatchGeo, m.metalDark);
        boltCatch.position.set(-0.03, -0.02, 0.08);
        weapon.add(boltCatch);

        // Selector switch
        const selectorGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.015, 8);
        const selector = new THREE.Mesh(selectorGeo, m.metalDark);
        selector.rotation.z = Math.PI / 2;
        selector.position.set(-0.032, -0.015, 0.12);
        weapon.add(selector);

        return weapon;
    },

    // ============================================
    // SHOTGUN - Pump-action
    // ============================================
    createShotgun() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // === RECEIVER ===
        const receiverGeo = new THREE.BoxGeometry(0.045, 0.055, 0.22);
        const receiver = new THREE.Mesh(receiverGeo, m.metalMedium);
        receiver.position.set(0, 0, 0.05);
        weapon.add(receiver);

        // Ejection port
        const portGeo = new THREE.BoxGeometry(0.048, 0.025, 0.06);
        const port = new THREE.Mesh(portGeo, m.metalDark);
        port.position.set(0, 0.015, 0.02);
        weapon.add(port);

        // Loading port (bottom)
        const loadGeo = new THREE.BoxGeometry(0.035, 0.02, 0.08);
        const load = new THREE.Mesh(loadGeo, m.metalDark);
        load.position.set(0, -0.035, 0.02);
        weapon.add(load);

        // === BARREL ===
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.5, 16);
        const barrel = new THREE.Mesh(barrelGeo, m.metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.015, -0.3);
        weapon.add(barrel);

        // Magazine tube (under barrel)
        const magTubeGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.35, 16);
        const magTube = new THREE.Mesh(magTubeGeo, m.metalMedium);
        magTube.rotation.x = Math.PI / 2;
        magTube.position.set(0, -0.015, -0.2);
        weapon.add(magTube);

        // Tube cap
        const capGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.02, 16);
        const cap = new THREE.Mesh(capGeo, m.metalDark);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(0, -0.015, -0.38);
        weapon.add(cap);

        // === PUMP / FOREND ===
        const pumpGeo = new THREE.BoxGeometry(0.055, 0.055, 0.12);
        const pump = new THREE.Mesh(pumpGeo, m.wood);
        pump.position.set(0, 0, -0.12);
        weapon.add(pump);

        // Pump ridges
        for (let i = 0; i < 5; i++) {
            const ridgeGeo = new THREE.BoxGeometry(0.058, 0.004, 0.015);
            const ridge = new THREE.Mesh(ridgeGeo, m.metalDark);
            ridge.position.set(0, 0, -0.15 + i * 0.025);
            weapon.add(ridge);
        }

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.035, 0.085, 0.045);
        const grip = new THREE.Mesh(gripGeo, m.wood);
        grip.position.set(0, -0.065, 0.12);
        grip.rotation.x = 0.2;
        weapon.add(grip);

        // Trigger guard
        const guardGeo = new THREE.BoxGeometry(0.04, 0.035, 0.008);
        const guard = new THREE.Mesh(guardGeo, m.metalMedium);
        guard.position.set(0, -0.04, 0.06);
        weapon.add(guard);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.005, 0.022, 0.012);
        const trigger = new THREE.Mesh(triggerGeo, m.metalDark);
        trigger.position.set(0, -0.035, 0.055);
        trigger.rotation.x = 0.25;
        weapon.add(trigger);

        // === STOCK ===
        const stockGeo = new THREE.BoxGeometry(0.042, 0.08, 0.2);
        const stock = new THREE.Mesh(stockGeo, m.wood);
        stock.position.set(0, -0.01, 0.26);
        weapon.add(stock);

        // Stock buttpad
        const buttGeo = new THREE.BoxGeometry(0.045, 0.09, 0.015);
        const butt = new THREE.Mesh(buttGeo, m.polymerTan);
        butt.position.set(0, -0.01, 0.365);
        weapon.add(butt);

        // Cheek rest area
        const cheekGeo = new THREE.BoxGeometry(0.038, 0.015, 0.1);
        const cheek = new THREE.Mesh(cheekGeo, m.wood);
        cheek.position.set(0, 0.04, 0.22);
        weapon.add(cheek);

        // === BEAD SIGHT ===
        const beadGeo = new THREE.SphereGeometry(0.006, 8, 8);
        const bead = new THREE.Mesh(beadGeo, m.metalLight);
        bead.position.set(0, 0.035, -0.52);
        weapon.add(bead);

        // Bead base
        const beadBaseGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.012, 8);
        const beadBase = new THREE.Mesh(beadBaseGeo, m.metalDark);
        beadBase.position.set(0, 0.025, -0.52);
        weapon.add(beadBase);

        // === ACTION RELEASE ===
        const releaseGeo = new THREE.BoxGeometry(0.008, 0.015, 0.02);
        const release = new THREE.Mesh(releaseGeo, m.metalDark);
        release.position.set(-0.028, -0.02, 0.08);
        weapon.add(release);

        // Safety
        const safetyGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8);
        const safety = new THREE.Mesh(safetyGeo, m.metalDark);
        safety.rotation.z = Math.PI / 2;
        safety.position.set(-0.028, 0.015, 0.12);
        weapon.add(safety);

        return weapon;
    },

    // ============================================
    // SNIPER - Bolt-action with scope
    // ============================================
    createSniper() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // === RECEIVER / ACTION ===
        const receiverGeo = new THREE.BoxGeometry(0.045, 0.055, 0.32);
        const receiver = new THREE.Mesh(receiverGeo, m.metalMedium);
        receiver.position.set(0, 0, 0.08);
        weapon.add(receiver);

        // Bolt
        const boltBodyGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.15, 12);
        const boltBody = new THREE.Mesh(boltBodyGeo, m.metalLight);
        boltBody.rotation.x = Math.PI / 2;
        boltBody.position.set(0, 0.015, 0.12);
        weapon.add(boltBody);

        // Bolt handle
        const boltHandleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8);
        const boltHandle = new THREE.Mesh(boltHandleGeo, m.metalDark);
        boltHandle.rotation.z = Math.PI / 2;
        boltHandle.position.set(0.03, 0.015, 0.15);
        weapon.add(boltHandle);

        // Bolt knob
        const knobGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const knob = new THREE.Mesh(knobGeo, m.metalDark);
        knob.position.set(0.055, 0.015, 0.15);
        weapon.add(knob);

        // === BARREL ===
        const barrelGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.6, 16);
        const barrel = new THREE.Mesh(barrelGeo, m.metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0, -0.38);
        weapon.add(barrel);

        // Heavy barrel profile
        const heavyGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.15, 16);
        const heavy = new THREE.Mesh(heavyGeo, m.metalDark);
        heavy.rotation.x = Math.PI / 2;
        heavy.position.set(0, 0, -0.13);
        weapon.add(heavy);

        // Muzzle brake
        const brakeGeo = new THREE.CylinderGeometry(0.02, 0.016, 0.08, 16);
        const brake = new THREE.Mesh(brakeGeo, m.metalDark);
        brake.rotation.x = Math.PI / 2;
        brake.position.set(0, 0, -0.72);
        weapon.add(brake);

        // Brake ports
        for (let i = 0; i < 3; i++) {
            const portGeo = new THREE.BoxGeometry(0.03, 0.008, 0.012);
            const port = new THREE.Mesh(portGeo, m.metalMedium);
            port.position.set(0, 0, -0.7 - i * 0.02);
            weapon.add(port);
        }

        // === SCOPE ===
        // Main tube
        const scopeTubeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 16);
        const scopeTube = new THREE.Mesh(scopeTubeGeo, m.scope);
        scopeTube.rotation.x = Math.PI / 2;
        scopeTube.position.set(0, 0.065, 0);
        weapon.add(scopeTube);

        // Objective lens (front)
        const objectiveGeo = new THREE.CylinderGeometry(0.028, 0.024, 0.05, 16);
        const objective = new THREE.Mesh(objectiveGeo, m.scope);
        objective.rotation.x = Math.PI / 2;
        objective.position.set(0, 0.065, -0.15);
        weapon.add(objective);

        // Objective lens glass
        const objLensGeo = new THREE.CircleGeometry(0.024, 16);
        const objLens = new THREE.Mesh(objLensGeo, m.scopeLens);
        objLens.position.set(0, 0.065, -0.175);
        weapon.add(objLens);

        // Ocular lens (rear)
        const ocularGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.04, 16);
        const ocular = new THREE.Mesh(ocularGeo, m.scope);
        ocular.rotation.x = Math.PI / 2;
        ocular.position.set(0, 0.065, 0.15);
        weapon.add(ocular);

        // Adjustment turrets
        const turretGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.025, 12);
        const topTurret = new THREE.Mesh(turretGeo, m.metalDark);
        topTurret.position.set(0, 0.095, 0.02);
        weapon.add(topTurret);

        const sideTurret = new THREE.Mesh(turretGeo, m.metalDark);
        sideTurret.rotation.z = Math.PI / 2;
        sideTurret.position.set(0.035, 0.065, 0.02);
        weapon.add(sideTurret);

        // Scope rings/mount
        const ringGeo = new THREE.TorusGeometry(0.028, 0.008, 8, 16);
        const ringFront = new THREE.Mesh(ringGeo, m.metalMedium);
        ringFront.rotation.x = Math.PI / 2;
        ringFront.position.set(0, 0.065, -0.08);
        weapon.add(ringFront);

        const ringRear = new THREE.Mesh(ringGeo, m.metalMedium);
        ringRear.rotation.x = Math.PI / 2;
        ringRear.position.set(0, 0.065, 0.08);
        weapon.add(ringRear);

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.035, 0.085, 0.045);
        const grip = new THREE.Mesh(gripGeo, m.polymer);
        grip.position.set(0, -0.065, 0.16);
        grip.rotation.x = 0.2;
        weapon.add(grip);

        // Trigger guard
        const guardGeo = new THREE.BoxGeometry(0.04, 0.035, 0.008);
        const guard = new THREE.Mesh(guardGeo, m.metalMedium);
        guard.position.set(0, -0.04, 0.1);
        weapon.add(guard);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.005, 0.022, 0.012);
        const trigger = new THREE.Mesh(triggerGeo, m.metalDark);
        trigger.position.set(0, -0.035, 0.1);
        weapon.add(trigger);

        // === STOCK ===
        const stockGeo = new THREE.BoxGeometry(0.045, 0.075, 0.22);
        const stock = new THREE.Mesh(stockGeo, m.polymer);
        stock.position.set(0, -0.01, 0.34);
        weapon.add(stock);

        // Adjustable cheek rest
        const cheekGeo = new THREE.BoxGeometry(0.04, 0.025, 0.1);
        const cheek = new THREE.Mesh(cheekGeo, m.polymer);
        cheek.position.set(0, 0.035, 0.32);
        weapon.add(cheek);

        // Buttpad
        const buttGeo = new THREE.BoxGeometry(0.05, 0.085, 0.02);
        const butt = new THREE.Mesh(buttGeo, m.polymerTan);
        butt.position.set(0, -0.01, 0.455);
        weapon.add(butt);

        // === MAGAZINE ===
        const magGeo = new THREE.BoxGeometry(0.032, 0.08, 0.06);
        const mag = new THREE.Mesh(magGeo, m.metalMedium);
        mag.position.set(0, -0.07, 0.04);
        weapon.add(mag);

        // Mag floor
        const floorGeo = new THREE.BoxGeometry(0.035, 0.01, 0.065);
        const floor = new THREE.Mesh(floorGeo, m.polymerTan);
        floor.position.set(0, -0.115, 0.04);
        weapon.add(floor);

        // === BIPOD (folded) ===
        const bipodArmGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8);
        const bipodLeft = new THREE.Mesh(bipodArmGeo, m.metalDark);
        bipodLeft.position.set(-0.02, -0.02, -0.2);
        bipodLeft.rotation.x = Math.PI / 2;
        weapon.add(bipodLeft);

        const bipodRight = new THREE.Mesh(bipodArmGeo, m.metalDark);
        bipodRight.position.set(0.02, -0.02, -0.2);
        bipodRight.rotation.x = Math.PI / 2;
        weapon.add(bipodRight);

        // Bipod mount
        const mountGeo = new THREE.BoxGeometry(0.05, 0.015, 0.025);
        const mount = new THREE.Mesh(mountGeo, m.metalDark);
        mount.position.set(0, -0.035, -0.15);
        weapon.add(mount);

        return weapon;
    },

    // ============================================
    // RPG - Rocket Propelled Grenade Launcher
    // ============================================
    createRPG() {
        const weapon = new THREE.Group();
        const m = this.materials;

        // Olive drab color for RPG
        const rpgBody = new THREE.MeshStandardMaterial({
            color: 0x4a5530,
            roughness: 0.7,
            metalness: 0.2
        });

        // === MAIN TUBE ===
        const tubeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.7, 16);
        const tube = new THREE.Mesh(tubeGeo, rpgBody);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0, 0, -0.1);
        weapon.add(tube);

        // Front flare (muzzle)
        const flareGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.08, 16);
        const flare = new THREE.Mesh(flareGeo, rpgBody);
        flare.rotation.x = Math.PI / 2;
        flare.position.set(0, 0, -0.48);
        weapon.add(flare);

        // Back cone (exhaust)
        const coneGeo = new THREE.CylinderGeometry(0.035, 0.055, 0.12, 16);
        const cone = new THREE.Mesh(coneGeo, rpgBody);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, 0, 0.3);
        weapon.add(cone);

        // Exhaust shield
        const shieldGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.05, 16, 1, true);
        const shield = new THREE.Mesh(shieldGeo, m.metalDark);
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, 0, 0.38);
        weapon.add(shield);

        // === ROCKET (visible in tube) ===
        const rocketGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.25, 12);
        const rocketMat = new THREE.MeshStandardMaterial({
            color: 0x556b2f,
            roughness: 0.5,
            metalness: 0.3
        });
        const rocket = new THREE.Mesh(rocketGeo, rocketMat);
        rocket.rotation.x = Math.PI / 2;
        rocket.position.set(0, 0, -0.35);
        weapon.add(rocket);

        // Rocket tip (warhead)
        const tipGeo = new THREE.ConeGeometry(0.025, 0.08, 12);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.4,
            metalness: 0.4
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.rotation.x = -Math.PI / 2;
        tip.position.set(0, 0, -0.52);
        weapon.add(tip);

        // Rocket fins
        const finGeo = new THREE.BoxGeometry(0.06, 0.002, 0.05);
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(finGeo, rocketMat);
            fin.position.set(0, 0, -0.25);
            fin.rotation.z = (Math.PI / 2) * i;
            weapon.add(fin);
        }

        // === GRIP ===
        const gripGeo = new THREE.BoxGeometry(0.04, 0.1, 0.05);
        const grip = new THREE.Mesh(gripGeo, m.polymer);
        grip.position.set(0, -0.08, 0.1);
        grip.rotation.x = 0.2;
        weapon.add(grip);

        // Trigger guard
        const guardGeo = new THREE.BoxGeometry(0.045, 0.04, 0.008);
        const guard = new THREE.Mesh(guardGeo, m.metalMedium);
        guard.position.set(0, -0.04, 0.05);
        weapon.add(guard);

        // Trigger
        const triggerGeo = new THREE.BoxGeometry(0.006, 0.025, 0.015);
        const trigger = new THREE.Mesh(triggerGeo, m.metalDark);
        trigger.position.set(0, -0.03, 0.08);
        trigger.rotation.x = 0.3;
        weapon.add(trigger);

        // === FRONT GRIP ===
        const fGripGeo = new THREE.BoxGeometry(0.035, 0.06, 0.04);
        const fGrip = new THREE.Mesh(fGripGeo, m.polymer);
        fGrip.position.set(0, -0.065, -0.15);
        weapon.add(fGrip);

        // === SIGHTS ===
        // Front sight
        const fSightGeo = new THREE.BoxGeometry(0.01, 0.04, 0.01);
        const fSight = new THREE.Mesh(fSightGeo, m.metalDark);
        fSight.position.set(0, 0.065, -0.35);
        weapon.add(fSight);

        // Rear sight (ladder style)
        const rSightBaseGeo = new THREE.BoxGeometry(0.03, 0.015, 0.02);
        const rSightBase = new THREE.Mesh(rSightBaseGeo, m.metalDark);
        rSightBase.position.set(0, 0.055, 0.05);
        weapon.add(rSightBase);

        const rSightLeftGeo = new THREE.BoxGeometry(0.005, 0.04, 0.015);
        const rSightLeft = new THREE.Mesh(rSightLeftGeo, m.metalDark);
        rSightLeft.position.set(-0.012, 0.075, 0.05);
        weapon.add(rSightLeft);

        const rSightRight = new THREE.Mesh(rSightLeftGeo, m.metalDark);
        rSightRight.position.set(0.012, 0.075, 0.05);
        weapon.add(rSightRight);

        // === SHOULDER REST ===
        const shoulderGeo = new THREE.BoxGeometry(0.06, 0.08, 0.04);
        const shoulder = new THREE.Mesh(shoulderGeo, m.polymer);
        shoulder.position.set(0, -0.02, 0.35);
        weapon.add(shoulder);

        return weapon;
    },
};

console.log('[WeaponFactory] Factory loaded');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeaponFactory;
}
