// sketches-ui.js — Sketch grid + master-mode upload
import { uploadSketchImage, addSketch, deleteSketch, subscribeToSketches } from './sketches-service.js';
import { isAuthenticated, onAuthChange } from './auth.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

let isMasterMode = false;
let unsubscribe = null;
let selectedFile = null;

export function initSketchesUI() {
    const urlParams = new URLSearchParams(window.location.search);
    isMasterMode = urlParams.get('master') === 'true';

    setupAddButton();
    setupUploadModal();

    onAuthChange(() => {
        updateMasterUI();
    });

    updateMasterUI();
    loadSketches();
}

function loadSketches() {
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeToSketches(renderSketchesGrid);
}

function updateMasterUI() {
    const addBtn = document.getElementById('btn-new-sketch');
    if (!addBtn) return;
    if (isMasterMode && isAuthenticated()) {
        addBtn.style.display = 'inline-block';
    } else {
        addBtn.style.display = 'none';
    }
    // Re-render to toggle delete buttons
    // (subscription will re-render on data changes; here we just refresh delete buttons)
    refreshDeleteButtonsVisibility();
}

function refreshDeleteButtonsVisibility() {
    const show = isMasterMode && isAuthenticated();
    document.querySelectorAll('.sketch-delete').forEach(btn => {
        btn.style.display = show ? 'flex' : 'none';
    });
}

function renderSketchesGrid(sketches) {
    const grid = document.getElementById('sketches-grid');
    if (!grid) return;

    if (sketches.length === 0) {
        grid.innerHTML = '<div class="sketches-empty">No sketches yet.</div>';
        return;
    }

    grid.innerHTML = '';
    const canDelete = isMasterMode && isAuthenticated();

    sketches.forEach(s => {
        const card = document.createElement('div');
        card.className = 'sketch-card';
        card.innerHTML = `
            <div class="sketch-image-wrap">
                <img src="${escapeAttr(s.imageUrl)}" alt="${escapeAttr(s.caption || 'Sketch')}" loading="lazy">
                <button class="sketch-delete" title="Delete" style="display:${canDelete ? 'flex' : 'none'}">&times;</button>
            </div>
            ${s.caption ? `<div class="sketch-caption">${escapeHtml(s.caption)}</div>` : ''}
        `;

        const deleteBtn = card.querySelector('.sketch-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDelete(s.id, s.storagePath);
            });
        }

        // Click image to open in modal (lightbox)
        const img = card.querySelector('img');
        img.addEventListener('click', () => openLightbox(s.imageUrl, s.caption));

        grid.appendChild(card);
    });
}

function openLightbox(url, caption) {
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
    lb.querySelector('img').src = url;
    lb.querySelector('.sketch-lightbox-caption').textContent = caption || '';
    lb.classList.add('active');
}

function setupAddButton() {
    const addBtn = document.getElementById('btn-new-sketch');
    if (addBtn) {
        addBtn.addEventListener('click', openUploadModal);
    }
}

function setupUploadModal() {
    const modal = document.getElementById('sketch-upload-modal');
    if (!modal) return;

    const fileInput = document.getElementById('sketch-file-input');
    const preview = document.getElementById('sketch-preview');
    const cancelBtn = document.getElementById('btn-cancel-sketch');
    const saveBtn = document.getElementById('btn-save-sketch');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
            selectedFile = null;
            preview.style.display = 'none';
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            fileInput.value = '';
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            alert('Image too large (max 10 MB).');
            fileInput.value = '';
            return;
        }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    cancelBtn.addEventListener('click', closeUploadModal);

    saveBtn.addEventListener('click', handleUpload);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUploadModal();
    });
}

function openUploadModal() {
    const modal = document.getElementById('sketch-upload-modal');
    if (!modal) return;
    // Reset
    selectedFile = null;
    document.getElementById('sketch-file-input').value = '';
    document.getElementById('sketch-caption-input').value = '';
    const preview = document.getElementById('sketch-preview');
    preview.style.display = 'none';
    preview.src = '';
    modal.classList.add('active');
}

function closeUploadModal() {
    const modal = document.getElementById('sketch-upload-modal');
    if (modal) modal.classList.remove('active');
}

async function handleUpload() {
    if (!selectedFile) {
        alert('Please choose an image first.');
        return;
    }
    const caption = document.getElementById('sketch-caption-input').value.trim();
    const saveBtn = document.getElementById('btn-save-sketch');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading…';

    try {
        const { url, storagePath } = await uploadSketchImage(selectedFile);
        await addSketch({ imageUrl: url, storagePath, caption });
        closeUploadModal();
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: ' + (err.message || err));
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function confirmDelete(id, storagePath) {
    if (!confirm('Delete this sketch?')) return;
    try {
        await deleteSketch(id, storagePath);
    } catch (err) {
        console.error('Delete error:', err);
        alert('Delete failed: ' + (err.message || err));
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
}
