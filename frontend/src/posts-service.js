// posts-service.js — Firestore CRUD for blog posts
import { db, postsCollection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot } from './firebase.js';
import { getCurrentUserId } from './auth.js';

export async function getPosts(publishedOnly = true) {
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    let posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (publishedOnly) posts = posts.filter(p => p.published === true);
    return posts;
}

export function subscribeToPosts(callback, publishedOnly = true) {
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        let posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (publishedOnly) posts = posts.filter(p => p.published === true);
        callback(posts);
    }, (err) => {
        console.error('Posts subscription error:', err);
        callback([]);
    });
}

export async function getPost(id) {
    const snap = await getDoc(doc(db, 'posts', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function addPost(data) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');
    const docRef = await addDoc(postsCollection, {
        ...data,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    return docRef.id;
}

export async function updatePost(id, data) {
    const ref = doc(db, 'posts', id);
    await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deletePost(id) {
    const ref = doc(db, 'posts', id);
    await deleteDoc(ref);
}
