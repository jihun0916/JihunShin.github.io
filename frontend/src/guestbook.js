// Guestbook module with Firebase Firestore integration
import { guestbookCollection, addDoc, getDocs, onSnapshot, query, orderBy } from './firebase.js';

// Sprite sheet configuration
const SPRITE_COLS = 5;
const SPRITE_ROWS = 5;
const TOTAL_ANIMALS = SPRITE_COLS * SPRITE_ROWS; // 25

// Animal names for the 25 footprints
const animalNames = [
    'cat', 'dog', 'rabbit', 'bear', 'bird',
    'fox', 'deer', 'mouse', 'wolf', 'raccoon',
    'squirrel', 'hedgehog', 'otter', 'badger', 'beaver',
    'moose', 'elk', 'lynx', 'panda', 'koala',
    'tiger', 'lion', 'monkey', 'elephant', 'giraffe'
];

// Simple hash function: name -> animal index (0-24)
function nameToAnimal(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % TOTAL_ANIMALS;
}

// Get sprite position for animal index
// CSS background-position with 500% size needs 25% steps (100/(5-1) = 25)
function getSpritePosition(animalIndex) {
    const col = animalIndex % SPRITE_COLS;
    const row = Math.floor(animalIndex / SPRITE_COLS);
    return { x: col * 25, y: row * 25 }; // 0%, 25%, 50%, 75%, 100%
}

// Render footprints from Firestore data
function renderFootprints(entries, isAdmin) {
    const field = document.getElementById('footprint-field');
    if (!field) return;

    field.innerHTML = '';
    const baseUrl = import.meta.env.BASE_URL;

    entries.forEach((entry) => {
        const spritePos = getSpritePosition(entry.animal);

        const footprint = document.createElement('div');
        footprint.className = 'footprint';
        footprint.style.left = entry.x + '%';
        footprint.style.top = entry.y + '%';
        footprint.style.transform = `rotate(${entry.rotation || 0}deg)`;
        footprint.style.backgroundImage = `url('${baseUrl}images/footprints.png')`;
        footprint.style.backgroundSize = '500% 500%';
        footprint.style.backgroundPosition = `${spritePos.x}% ${spritePos.y}%`;

        // Tooltip: message only (or name + message in admin mode)
        const tooltipText = isAdmin
            ? `[${entry.name}] ${entry.message}`
            : entry.message;

        footprint.innerHTML = `<div class="footprint-tooltip">${tooltipText}</div>`;
        field.appendChild(footprint);
    });
}

// Initialize guestbook with Firestore
export function initGuestbook() {
    const form = document.getElementById('guestbook-form');
    const field = document.getElementById('footprint-field');

    if (!form || !field) {
        console.log('Guestbook elements not found, skipping initialization');
        return;
    }

    const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

    // Real-time listener for Firestore updates
    const q = query(guestbookCollection, orderBy('timestamp', 'asc'));

    onSnapshot(q, (snapshot) => {
        const entries = [];
        snapshot.forEach((doc) => {
            entries.push(doc.data());
        });
        renderFootprints(entries, isAdmin);
    }, (error) => {
        console.error('Firestore error:', error);
        // Fallback to localStorage if Firestore fails
        const localData = localStorage.getItem('guestbook');
        if (localData) {
            renderFootprints(JSON.parse(localData), isAdmin);
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('guest-name');
        const messageInput = document.getElementById('guest-message');

        const name = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !message) return;

        const newEntry = {
            name: name,
            animal: nameToAnimal(name),
            message: message,
            timestamp: Date.now(),
            x: 10 + Math.random() * 80, // 10-90% horizontal
            y: 10 + Math.random() * 80, // 10-90% vertical
            rotation: -30 + Math.random() * 60 // -30 to +30 degrees
        };

        try {
            await addDoc(guestbookCollection, newEntry);

            // Clear form
            nameInput.value = '';
            messageInput.value = '';

            alert('Your footprint has been left! 🐾');
        } catch (error) {
            console.error('Error adding entry:', error);
            alert('Failed to save. Please try again.');
        }
    });

    console.log('Guestbook initialized with Firestore');
}
