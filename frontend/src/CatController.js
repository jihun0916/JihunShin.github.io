// src/CatController.js
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Loads the cat FBX model and its separate animation files.
 * Returns { model, mixer, actions }
 */
export async function loadCatModel(scene) {
    const loader = new FBXLoader();
    const mixer = new THREE.AnimationMixer(scene); // Temp mixer, will be re-attached to model
    const actions = {};

    // 1. Load Main Mesh
    const model = await loader.loadAsync('/models/SK_Cat_PA.fbx');

    // Apply Texture
    const textureLoader = new THREE.TextureLoader();
    const texture = await textureLoader.loadAsync('/textures/T_Cat_PA_Color.png');
    texture.flipY = true; // FBX UVs often need this, check if needed
    texture.colorSpace = THREE.SRGBColorSpace;

    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.map = texture;
                child.material.needsUpdate = true;
            }
        }
    });

    // Scale
    model.scale.set(0.01, 0.01, 0.01);

    // Create a pivot group for rotation handling
    const pivot = new THREE.Group();
    pivot.name = 'CatPivot';

    // Model orientation inside pivot (previous working state)
    model.rotation.x = 0;
    model.rotation.y = Math.PI / 2;
    model.rotation.z = Math.PI / 2;

    pivot.add(model);
    pivot.position.set(0, 0, 0);
    scene.add(pivot);

    // Debug: Log model bounding box
    const box = new THREE.Box3().setFromObject(model);
    console.log('Model bounding box:', box.min, box.max);
    console.log('Model size:', box.getSize(new THREE.Vector3()));

    // Debug axes removed

    // Re-create mixer for the actual model
    const finalMixer = new THREE.AnimationMixer(model);

    // 2. Load Animations
    // Helper to load anim and add to actions
    const loadAnim = async (name, path) => {
        try {
            const animParams = await loader.loadAsync(path);

            // DEBUG: Log all objects in animation FBX
            console.log(`=== Animation FBX: ${name} ===`);
            animParams.traverse(child => {
                console.log('Node:', child.name, 'Type:', child.type, 'isBone:', child.isBone);
            });

            if (animParams.animations && animParams.animations.length > 0) {
                const clip = animParams.animations[0];
                clip.name = name;

                // DEBUG: Log animation tracks
                console.log('Animation tracks for', name + ':');
                clip.tracks.forEach(track => {
                    console.log('  Track:', track.name);
                });

                const action = finalMixer.clipAction(clip);
                actions[name] = action;
            }
        } catch (e) {
            console.error(`Failed to load animation: ${name}`, e);
        }
    };

    // Load essential animations only
    await Promise.all([
        loadAnim('Idle', '/anims/Cat_Idle.fbx'),
        loadAnim('Walk_Forward', '/anims/Cat_Walk_Forward.fbx'),
        loadAnim('Run_Forward', '/anims/Cat_Run_Forward.fbx'),
        loadAnim('Sit', '/anims/Cat_Sit_01.fbx'),
        loadAnim('Sleep', '/anims/Cat_Sleep_Loop.fbx'),
        loadAnim('Jump', '/anims/Cat_Jump_Up_01.fbx')
    ]);

    // Return pivot as the main object to control, with model reference for animations
    return { model: pivot, mixer: finalMixer, actions, rawModel: model };
}
