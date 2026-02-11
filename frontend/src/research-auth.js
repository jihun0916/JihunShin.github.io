// Research section authentication handlers
import { auth } from './firebase.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

/**
 * Handle user login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function handleLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: getErrorMessage(error.code)
    };
  }
}

/**
 * Handle user logout
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleLogout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user-friendly error messages
 * @param {string} errorCode - Firebase error code
 * @returns {string}
 */
function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address format.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.'
  };

  return errorMessages[errorCode] || 'Authentication failed. Please try again.';
}
