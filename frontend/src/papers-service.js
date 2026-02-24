// Papers service for Firestore CRUD operations
import { db } from './firebase.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { getCurrentUserId } from './auth.js';

const papersCollection = collection(db, 'papers');

/**
 * Add a new paper to Firestore
 * @param {Object} paperData - Paper data
 * @returns {Promise<string>} - Document ID
 */
export async function addPaper(paperData) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Generate random 3D position if not provided
  const position3D = paperData.position3D || {
    x: (Math.random() - 0.5) * 10, // -5 to 5
    y: (Math.random() - 0.5) * 10,
    z: (Math.random() - 0.5) * 10
  };

  const docRef = await addDoc(papersCollection, {
    title: paperData.title || '',
    titleKo: paperData.titleKo || '',
    authors: paperData.authors || [],
    venue: paperData.venue || '',
    year: paperData.year || new Date().getFullYear(),
    abstract: paperData.abstract || '',
    keywords: paperData.keywords || [],
    pdfUrl: paperData.pdfUrl || '',
    category: paperData.category || 'reference',
    notes: paperData.notes || '',
    tags: paperData.tags || [],
    bibtex: paperData.bibtex || '',
    relatedPapers: paperData.relatedPapers || [],  // [{ paperId, title, type }]
    position3D,
    timestamp: Date.now(),
    userId
  });

  return docRef.id;
}

/**
 * Get all papers for the current user
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} - Array of paper objects
 */
export async function getPapers(category = 'all') {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  let q;
  if (category === 'all') {
    q = query(
      papersCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
  } else {
    q = query(
      papersCollection,
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('timestamp', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Listen to real-time paper updates
 * @param {Function} callback - Called when papers change
 * @param {string} category - Optional category filter
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToPapers(callback, category = 'all') {
  const userId = getCurrentUserId();
  if (!userId) {
    callback([]);
    return () => {};
  }

  let q;
  if (category === 'all') {
    q = query(
      papersCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
  } else {
    q = query(
      papersCollection,
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('timestamp', 'desc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    const papers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(papers);
  }, (error) => {
    console.error('Papers subscription error:', error);
    callback([]);
  });
}

/**
 * Update an existing paper
 * @param {string} paperId - Document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updatePaper(paperId, updates) {
  const paperRef = doc(db, 'papers', paperId);
  await updateDoc(paperRef, updates);
}

/**
 * Delete a paper
 * @param {string} paperId - Document ID
 * @returns {Promise<void>}
 */
export async function deletePaper(paperId) {
  const paperRef = doc(db, 'papers', paperId);
  await deleteDoc(paperRef);
}

/**
 * Search papers by title, authors, or keywords
 * @param {string} searchTerm - Search term
 * @param {Array} papers - Array of papers to search
 * @returns {Array} - Filtered papers
 */
export function searchPapers(searchTerm, papers) {
  if (!searchTerm || searchTerm.trim() === '') {
    return papers;
  }

  const term = searchTerm.toLowerCase();

  return papers.filter(paper => {
    // Search in title
    if (paper.title.toLowerCase().includes(term)) return true;
    if (paper.titleKo && paper.titleKo.toLowerCase().includes(term)) return true;

    // Search in authors
    if (paper.authors.some(author => author.toLowerCase().includes(term))) return true;

    // Search in keywords
    if (paper.keywords.some(keyword => keyword.toLowerCase().includes(term))) return true;

    // Search in venue
    if (paper.venue.toLowerCase().includes(term)) return true;

    return false;
  });
}
