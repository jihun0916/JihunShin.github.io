// Translation service using Ollama
import { ollamaClient } from './llm-client.js';
import { config } from './research-config.js';
import { db } from './firebase.js';
import { collection, addDoc } from 'firebase/firestore';
import { getCurrentUserId } from './auth.js';

/**
 * Translate Korean text to English using Ollama
 * @param {string} koreanText - Korean text to translate
 * @param {Function} onChunk - Callback for streaming chunks (optional)
 * @returns {Promise<string>} - Translated English text
 */
export async function translateToEnglish(koreanText, onChunk = null) {
  if (!koreanText || koreanText.trim() === '') {
    throw new Error('Korean text is required');
  }

  const model = config.llm.models.translation;

  const prompt = `You are a professional academic translator specializing in computer science research papers. Translate the following Korean text into formal, precise English suitable for top-tier academic publications (ACM, IEEE).

CRITICAL REQUIREMENTS:
- Use EXTREMELY FORMAL and OBJECTIVE academic tone
- Employ technical terminology with absolute precision
- Adopt PASSIVE VOICE where appropriate (e.g., "is proposed", "is demonstrated")
- Use formal academic phrases (e.g., "In this work,", "We present", "It is shown that")
- Avoid colloquialisms, contractions, and informal expressions
- Maintain scholarly distance and objectivity
- Use precise, technical vocabulary over common words
- Follow standard academic paper structure and phrasing

Korean text:
${koreanText}

Formal academic English translation:`;

  const chunks = [];

  if (onChunk) {
    // Streaming mode
    for await (const chunk of ollamaClient.generate(prompt, model, { stream: true })) {
      if (chunk.response) {
        chunks.push(chunk.response);
        onChunk(chunks.join(''));
      }
    }
  } else {
    // Non-streaming mode
    const result = await ollamaClient.generate(prompt, model);
    return result;
  }

  return chunks.join('');
}

/**
 * Save translation to Firestore
 * @param {string} textKo - Korean original text
 * @param {string} textEn - English translated text
 * @returns {Promise<string>} - Document ID
 */
export async function saveTranslation(textKo, textEn) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const translationsCollection = collection(db, 'translations');

  const docRef = await addDoc(translationsCollection, {
    textKo,
    textEn,
    model: config.llm.models.translation,
    timestamp: Date.now(),
    userId
  });

  return docRef.id;
}

/**
 * Get translation history from Firestore
 * @param {number} limit - Number of translations to retrieve
 * @returns {Promise<Array>} - Array of translation objects
 */
export async function getTranslationHistory(limit = 10) {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const translationsCollection = collection(db, 'translations');
  const { query, where, orderBy: firestoreOrderBy, getDocs, limit: firestoreLimit } = await import('firebase/firestore');

  const q = query(
    translationsCollection,
    where('userId', '==', userId),
    firestoreOrderBy('timestamp', 'desc'),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
