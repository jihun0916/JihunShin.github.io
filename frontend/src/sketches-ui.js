// sketches-ui.js — Static sketch grid with lightbox
//
// To add a new sketch:
//   1. Put the image file in frontend/public/images/sketches/
//   2. Add an entry to the `sketches` array below: { src, caption }
//
// Example:
//   { src: '/images/sketches/my_drawing.png', caption: 'A quick study on light' }

const BASE = import.meta.env.BASE_URL;

const sketches = [
    { src: `${BASE}images/sketches/범이.webp` },
    { src: `${BASE}images/sketches/왼발의파업.jpg` },
    { src: `${BASE}images/sketches/진관사.jpg` },
    { src: `${BASE}images/sketches/지각.jpg` },
    { src: `${BASE}images/sketches/croque.jpg` },
    { src: `${BASE}images/sketches/기다리면서.jpg` },
    { src: `${BASE}images/sketches/오헝.jpg` },
    { src: `${BASE}images/sketches/가시나무.jpg` },
    { src: `${BASE}images/sketches/비사육인간.jpg` },
    { src: `${BASE}images/sketches/토마손.jpg` },
    { src: `${BASE}images/sketches/나방.jpg` },
    { src: `${BASE}images/sketches/소화기.jpg` },
    { src: `${BASE}images/sketches/진관사2.jpg` },
    { src: `${BASE}images/sketches/전대기.jpg` },
    { src: `${BASE}images/sketches/폰.jpg` },
    { src: `${BASE}images/sketches/꽃.jpg` },
    { src: `${BASE}images/sketches/크로키7.jpg` },
    { src: `${BASE}images/sketches/크로키6.jpg` },
    { src: `${BASE}images/sketches/크로키5.jpg` },
    { src: `${BASE}images/sketches/크로키4.jpg` },
    { src: `${BASE}images/sketches/크로키3.jpg` },
    { src: `${BASE}images/sketches/크로키2.jpg` },
    { src: `${BASE}images/sketches/크로키1.jpg` },
    { src: `${BASE}images/sketches/라오콘.jpg` },
];

export function initSketchesUI() {
    renderSketchesGrid();
}

function renderSketchesGrid() {
    const grid = document.getElementById('sketches-grid');
    if (!grid) return;

    const countEl = document.getElementById('sketches-count');
    if (countEl) countEl.textContent = sketches.length;

    if (sketches.length === 0) {
        grid.innerHTML = '<div class="sketches-empty">No sketches yet.</div>';
        return;
    }

    grid.innerHTML = '';
    sketches.forEach((s, idx) => {
        const card = document.createElement('div');
        card.className = 'sketch-card';
        card.innerHTML = `
            <div class="sketch-image-wrap">
                <img src="${escapeAttr(s.src)}" alt="${escapeAttr(s.caption || 'Sketch')}" loading="lazy">
            </div>
            ${s.caption ? `<div class="sketch-caption">${escapeHtml(s.caption)}</div>` : ''}
        `;
        const img = card.querySelector('img');
        img.addEventListener('click', () => openLightbox(s.src, s.caption));
        grid.appendChild(card);
    });
}

function openLightbox(src, caption) {
    let lb = document.getElementById('sketch-lightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'sketch-lightbox';
        lb.className = 'sketch-lightbox';
        lb.innerHTML = `
            <div class="sketch-lightbox-inner">
              <img class="sketch-lightbox-img">
              <div class="sketch-lightbox-caption"></div>
            </div>
        `;
        lb.addEventListener('click', () => lb.classList.remove('active'));
        document.body.appendChild(lb);
    }
    lb.querySelector('img').src = src;
    lb.querySelector('.sketch-lightbox-caption').textContent = caption || '';
    lb.classList.add('active');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
}
