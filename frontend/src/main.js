// src/main.js
import { initGuestbook } from './guestbook.js';
import { initAuth } from './auth.js';
import { initResearch } from './research-main.js';
import { initPostsUI } from './posts-ui.js';
import { initBoids, setBoidsTheme } from './boids.js';

function init() {
    // Initialize Firebase Authentication
    initAuth();

    // Initialize Research section
    initResearch();

    // Initialize guestbook with Firebase
    initGuestbook();

    // Initialize posts UI (blog system)
    initPostsUI();

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        // Load saved theme
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.documentElement.dataset.theme = 'dark';
        }

        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.dataset.theme === 'dark';
            document.documentElement.dataset.theme = isDark ? '' : 'dark';
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
            setBoidsTheme(!isDark);
        });
    }

    // Boids fish background
    initBoids();

    // Smooth scroll for nav links
    document.querySelectorAll('.topnav a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

init();
