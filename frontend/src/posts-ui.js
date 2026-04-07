// posts-ui.js — Post management UI with Quill editor
import { getPosts, getPost, addPost, updatePost, deletePost, subscribeToPosts } from './posts-service.js';
import { isAuthenticated, onAuthChange } from './auth.js';
import { handleLogin, handleLogout } from './research-auth.js';

let quillEditor = null;
let editingPostId = null;
let isMasterMode = false;
let unsubscribePosts = null;

// Artwork data for link picker (matches index.html modalData)
const artworkData = [
    { title: 'Tail Thief: On-Site Verification', index: 0 },
    { title: 'Tail Thief: Needle Thief', index: 1 },
    { title: 'Tail Thief: Calf Thief', index: 2 },
    { title: 'Tail Thief', index: 3 },
    { title: 'MasterBall', index: 4 },
    { title: 'Unauthorized Entry', index: 5 },
    { title: 'Island of Fragments', index: 6 },
    { title: 'Cyber Revenant', index: 7 },
    { title: 'Hole in', index: 8 },
];

const publicationData = [
    { title: 'A Unified Framework for Spatially-Aware Embodied Agents in XR', venue: 'IEEE VR 2026 XRMemory' },
    { title: 'Voronoi Rooms: Dynamic Visibility Modulation of Overlapping Spaces for Telepresence', venue: 'ACM TOG 2025' },
    { title: 'Situated Embodied XR Agents via Spatial Reasoning and Prompting', venue: 'ISMAR 2025' },
    { title: 'Visibility Modulation of Aligned Spaces for Multi-User Telepresence', venue: 'ISMAR 2024' },
];

export function initPostsUI() {
    const urlParams = new URLSearchParams(window.location.search);
    isMasterMode = urlParams.get('master') === 'true';

    // Show master login button if in master mode
    const loginBtn = document.getElementById('master-login-btn');
    if (isMasterMode && loginBtn) {
        loginBtn.style.display = 'inline-block';
    }

    setupMasterLogin();
    setupEditorModal();
    setupLinkPicker();

    // Listen to auth changes for master mode UI
    onAuthChange((user) => {
        updateMasterUI(user);
        loadPosts();
    });

    // Initial load
    loadPosts();
}

function loadPosts() {
    if (unsubscribePosts) unsubscribePosts();

    const showAll = isMasterMode && isAuthenticated();
    unsubscribePosts = subscribeToPosts((posts) => {
        renderPostsList(posts);
    }, !showAll);
}

function renderPostsList(posts) {
    const container = document.getElementById('posts-list-dynamic');
    if (!container) return;

    const loggedIn = isMasterMode && isAuthenticated();
    container.innerHTML = '';

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'blog-card';
        card.onclick = (e) => {
            if (e.target.closest('.blog-card-actions')) return;
            openPostDetail(post.id);
        };

        const dateStr = post.createdAt
            ? new Date(post.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';

        let draftBadge = '';
        if (!post.published) {
            draftBadge = '<span class="draft-badge">Draft</span>';
        }

        let actionsHtml = '';
        if (loggedIn) {
            actionsHtml = `
                <div class="blog-card-actions" style="display: flex;">
                    <button onclick="event.stopPropagation()" data-edit="${post.id}">Edit</button>
                    <button onclick="event.stopPropagation()" data-delete="${post.id}">Delete</button>
                </div>`;
        }

        card.innerHTML = `
            ${actionsHtml}
            <div class="blog-title">${escapeHtml(post.title)}${draftBadge}</div>
            <div class="blog-date">${dateStr}</div>
            <p class="blog-excerpt">${escapeHtml(post.excerpt || '')}</p>
        `;

        // Bind edit/delete
        const editBtn = card.querySelector('[data-edit]');
        const deleteBtn = card.querySelector('[data-delete]');
        if (editBtn) editBtn.addEventListener('click', () => openEditor(post.id));
        if (deleteBtn) deleteBtn.addEventListener('click', () => confirmDelete(post.id, post.title));

        container.appendChild(card);
    });
}

async function openPostDetail(postId) {
    const post = await getPost(postId);
    if (!post) return;

    const modal = document.getElementById('post-detail-modal');
    document.getElementById('post-detail-title').textContent = post.title;
    document.getElementById('post-detail-date').textContent = post.createdAt
        ? new Date(post.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
    document.getElementById('post-detail-body').innerHTML = post.content || '';
    modal.classList.add('active');
}

// ========== MASTER MODE ==========

function updateMasterUI(user) {
    const newPostBtn = document.getElementById('btn-new-post');
    const loginBtn = document.getElementById('master-login-btn');

    if (isMasterMode && user) {
        if (newPostBtn) newPostBtn.style.display = 'inline-block';
        if (loginBtn) loginBtn.textContent = 'Logout';
    } else {
        if (newPostBtn) newPostBtn.style.display = 'none';
        if (loginBtn && isMasterMode) loginBtn.textContent = 'Login';
    }
}

function setupMasterLogin() {
    const loginBtn = document.getElementById('master-login-btn');
    const loginModal = document.getElementById('master-login-modal');
    const loginForm = document.getElementById('master-login-form');
    const loginError = document.getElementById('master-login-error');

    if (!loginBtn) return;

    loginBtn.addEventListener('click', () => {
        if (isAuthenticated()) {
            handleLogout();
        } else {
            loginModal.classList.add('active');
        }
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.display = 'none';
            const email = document.getElementById('master-email').value;
            const password = document.getElementById('master-password').value;
            const result = await handleLogin(email, password);
            if (result.success) {
                loginModal.classList.remove('active');
                loginForm.reset();
            } else {
                loginError.textContent = result.error;
                loginError.style.display = 'block';
            }
        });
    }

    const newPostBtn = document.getElementById('btn-new-post');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => openEditor(null));
    }
}

// ========== QUILL EDITOR ==========

function initQuill() {
    if (quillEditor) return;

    quillEditor = new Quill('#post-quill-editor', {
        theme: 'snow',
        placeholder: 'Write your post...',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['internal-link'],
                    ['clean']
                ],
                handlers: {
                    'internal-link': () => openLinkPicker()
                }
            }
        }
    });

    // Style the custom toolbar button
    const toolbar = document.querySelector('.ql-toolbar');
    const internalLinkBtn = toolbar.querySelector('.ql-internal-link');
    if (internalLinkBtn) {
        internalLinkBtn.innerHTML = '🔗';
        internalLinkBtn.title = 'Insert internal link (Posts, Artwork, Publications)';
    }
}

function setupEditorModal() {
    const cancelBtn = document.getElementById('btn-cancel-post');
    const saveBtn = document.getElementById('btn-save-post');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEditor);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', savePost);
    }
}

async function openEditor(postId) {
    const modal = document.getElementById('post-editor-modal');
    const titleEl = document.getElementById('post-editor-title');
    const titleInput = document.getElementById('post-title-input');
    const publishedCheck = document.getElementById('post-published-check');

    initQuill();

    editingPostId = postId;

    if (postId) {
        titleEl.textContent = 'Edit Post';
        const post = await getPost(postId);
        if (post) {
            titleInput.value = post.title || '';
            quillEditor.root.innerHTML = post.content || '';
            publishedCheck.checked = post.published !== false;
        }
    } else {
        titleEl.textContent = 'New Post';
        titleInput.value = '';
        quillEditor.root.innerHTML = '';
        publishedCheck.checked = true;
    }

    modal.classList.add('active');
    titleInput.focus();
}

function closeEditor() {
    document.getElementById('post-editor-modal').classList.remove('active');
    editingPostId = null;
}

async function savePost() {
    const title = document.getElementById('post-title-input').value.trim();
    if (!title) {
        alert('Please enter a title.');
        return;
    }

    const content = quillEditor.root.innerHTML;
    const plainText = quillEditor.getText().trim();
    const excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
    const published = document.getElementById('post-published-check').checked;

    const data = { title, content, excerpt, published };

    try {
        if (editingPostId) {
            await updatePost(editingPostId, data);
        } else {
            await addPost(data);
        }
        closeEditor();
    } catch (err) {
        console.error('Save post error:', err);
        alert('Failed to save: ' + err.message);
    }
}

async function confirmDelete(postId, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
        await deletePost(postId);
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete: ' + err.message);
    }
}

// ========== INTERNAL LINK PICKER ==========

let linkPickerCallback = null;

function setupLinkPicker() {
    const modal = document.getElementById('link-picker-modal');
    const tabs = modal?.querySelectorAll('.link-picker-tabs button');

    if (!tabs) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLinkPickerItems(tab.dataset.tab);
        });
    });
}

function openLinkPicker() {
    const modal = document.getElementById('link-picker-modal');
    modal.classList.add('active');

    // Reset to posts tab
    const tabs = modal.querySelectorAll('.link-picker-tabs button');
    tabs.forEach(t => t.classList.remove('active'));
    tabs[0].classList.add('active');

    renderLinkPickerItems('posts');
}

async function renderLinkPickerItems(tab) {
    const list = document.getElementById('link-picker-list');
    list.innerHTML = '';

    if (tab === 'posts') {
        const posts = await getPosts(false);
        posts.forEach(post => {
            const item = createLinkItem(post.title, `post:${post.id}`, post.published ? '' : 'Draft');
            list.appendChild(item);
        });
        if (posts.length === 0) {
            list.innerHTML = '<div style="opacity:0.5; padding:1rem; text-align:center;">No posts yet</div>';
        }
    } else if (tab === 'artwork') {
        artworkData.forEach(art => {
            const item = createLinkItem(art.title, `artwork:${art.index}`);
            list.appendChild(item);
        });
    } else if (tab === 'publications') {
        publicationData.forEach(pub => {
            const item = createLinkItem(pub.title, `pub:${pub.venue}`, pub.venue);
            list.appendChild(item);
        });
    }
}

function createLinkItem(title, linkData, subtitle) {
    const item = document.createElement('div');
    item.className = 'link-picker-item';
    item.innerHTML = `${escapeHtml(title)}${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}`;
    item.addEventListener('click', () => {
        insertInternalLink(title, linkData);
        document.getElementById('link-picker-modal').classList.remove('active');
    });
    return item;
}

function insertInternalLink(text, linkData) {
    if (!quillEditor) return;

    let href;
    if (linkData.startsWith('post:')) {
        href = `#post/${linkData.replace('post:', '')}`;
    } else if (linkData.startsWith('artwork:')) {
        href = `javascript:openModal('artwork', ${linkData.replace('artwork:', '')})`;
    } else if (linkData.startsWith('pub:')) {
        href = '#publications';
    }

    const range = quillEditor.getSelection(true);
    quillEditor.insertText(range.index, text, 'link', href);
    quillEditor.setSelection(range.index + text.length);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
