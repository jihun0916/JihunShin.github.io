// sketches-service.js — CRUD + Firebase Storage upload for sketches
import {
    db, storage, sketchesCollection,
    doc, addDoc, getDocs, deleteDoc, onSnapshot, query, orderBy,
    storageRef, uploadBytes, getDownloadURL, deleteObject
} from './firebase.js';
import { getCurrentUserId } from './auth.js';

export async function uploadSketchImage(file) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    if (!file) throw new Error('No file provided');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `sketches/${userId}/${Date.now()}-${safeName}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);
    return { url, storagePath: path };
}

export async function addSketch({ imageUrl, storagePath, caption }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    const docRef = await addDoc(sketchesCollection, {
        imageUrl,
        storagePath,
        caption: caption || '',
        userId,
        createdAt: Date.now()
    });
    return docRef.id;
}

export async function deleteSketch(id, storagePath) {
    // Delete Firestore doc first
    await deleteDoc(doc(db, 'sketches', id));
    // Then try to delete the storage object (don't fail the whole op if file is missing)
    if (storagePath) {
        try {
            await deleteObject(storageRef(storage, storagePath));
        } catch (err) {
            console.warn('Failed to delete sketch image from storage:', err);
        }
    }
}

export async function getSketches() {
    const q = query(sketchesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToSketches(callback) {
    const q = query(sketchesCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
        console.error('Sketches subscription error:', err);
        callback([]);
    });
}
