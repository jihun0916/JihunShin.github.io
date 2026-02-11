// Firebase Authentication session management
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

let currentUser = null;
const authStateListeners = [];

/**
 * Initialize authentication and listen for auth state changes
 */
export function initAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Logged out');

    // Notify all listeners
    authStateListeners.forEach(listener => listener(user));
  });
}

/**
 * Check if user is currently authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Get current user object
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current user UID
 * @returns {string|null}
 */
export function getCurrentUserId() {
  return currentUser ? currentUser.uid : null;
}

/**
 * Add a listener for auth state changes
 * @param {Function} callback - Called with user object when auth state changes
 */
export function onAuthChange(callback) {
  authStateListeners.push(callback);

  // Immediately call with current state
  if (currentUser !== null) {
    callback(currentUser);
  }
}
