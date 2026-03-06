import { supabase } from './supabase.js';

const ADMIN_EMAIL = 'bernalminerales@gmail.com';
const PAGE_SIZE = 10;

export function initForo() {
    // ---- DOM Elements ----
    const authModalBackdrop = document.getElementById('authModalBackdrop');
    const authModalClose = document.getElementById('authModalClose');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const authError = document.getElementById('authError');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Navbar auth elements
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navUserInfo = document.getElementById('navUserInfo');
    const navUserName = document.getElementById('navUserName');
    const navLogoutBtn = document.getElementById('navLogoutBtn');

    const foroAuthState = document.getElementById('foroAuthState');
    const foroNewThread = document.getElementById('foroNewThread');
    const currentUserLabel = document.getElementById('currentUserLabel');
    const threadList = document.getElementById('threadList');

    const threadTitle = document.getElementById('threadTitle');
    const threadBody = document.getElementById('threadBody');
    const threadImageFile = document.getElementById('threadImageFile');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const uploadPhotoText = document.getElementById('uploadPhotoText');
    const publishThreadBtn = document.getElementById('publishThreadBtn');
    const publishError = document.getElementById('publishError');

    // ---- State ----
    let isLoginMode = true;
    let currentUser = null;
    let selectedFile = null;
    let currentPage = 0;
    let allThreadsLoaded = false;

    // ---- Init ----
    checkUser();

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            showAuthenticatedUI();
        } else {
            currentUser = null;
            showPublicUI();
        }
    });

    // ---- UI Updates ----
    function showAuthenticatedUI() {
        if (foroAuthState) foroAuthState.style.display = 'none';
        if (foroNewThread) foroNewThread.style.display = 'block';
        if (currentUserLabel) currentUserLabel.textContent = `Como: ${currentUser.email.split('@')[0]}`;

        // Navbar auth
        if (navLoginBtn) navLoginBtn.style.display = 'none';
        if (navUserInfo) {
            navUserInfo.style.display = 'flex';
            navUserName.textContent = currentUser.email.split('@')[0];
        }

        currentPage = 0;
        allThreadsLoaded = false;
        loadThreads(true);
    }

    function showPublicUI() {
        if (foroAuthState) foroAuthState.style.display = 'block';
        if (foroNewThread) foroNewThread.style.display = 'none';

        // Navbar auth
        if (navLoginBtn) navLoginBtn.style.display = 'inline-flex';
        if (navUserInfo) navUserInfo.style.display = 'none';

        currentPage = 0;
        allThreadsLoaded = false;
        loadThreads(true);
    }

    // ---- Auth Logic ----
    function openAuthModal() {
        authModalBackdrop.style.display = 'flex';
        setTimeout(() => authModalBackdrop.classList.add('active'), 10);
    }

    loginBtn?.addEventListener('click', openAuthModal);
    navLoginBtn?.addEventListener('click', openAuthModal);

    function closeAuthModal() {
        authModalBackdrop.classList.remove('active');
        setTimeout(() => authModalBackdrop.style.display = 'none', 300);
        authForm.reset();
        authError.style.display = 'none';
    }

    authModalClose?.addEventListener('click', closeAuthModal);
    authModalBackdrop?.addEventListener('click', (e) => {
        if (e.target === authModalBackdrop) closeAuthModal();
    });

    authSwitchLink?.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Iniciar Sesión' : 'Registrarse';
        authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Crear cuenta';
        authSwitchText.textContent = isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
        authSwitchLink.textContent = isLoginMode ? 'Regístrate' : 'Inicia Sesión';
        authError.style.display = 'none';
    });

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.style.display = 'none';
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Cargando...';

        const email = authEmail.value;
        const password = authPassword.value;

        try {
            let error;
            if (isLoginMode) {
                const res = await supabase.auth.signInWithPassword({ email, password });
                error = res.error;
            } else {
                const res = await supabase.auth.signUp({ email, password });
                error = res.error;
                if (!error && res.data.user && !res.data.session) {
                    authError.style.color = 'white';
                    authError.textContent = 'Confirma tu correo para entrar.';
                    authError.style.display = 'block';
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = 'Crear cuenta';
                    return;
                }
            }

            if (error) throw error;
            closeAuthModal();
        } catch (err) {
            authError.style.color = '#ff6b6b';
            authError.textContent = err.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : err.message;
            authError.style.display = 'block';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Crear cuenta';
        }
    });

    async function doLogout() {
        await supabase.auth.signOut();
    }

    logoutBtn?.addEventListener('click', doLogout);
    navLogoutBtn?.addEventListener('click', doLogout);

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            showAuthenticatedUI();
        } else {
            showPublicUI();
        }
    }

    // ---- File Upload Logic ----
    uploadPhotoBtn?.addEventListener('click', () => {
        threadImageFile.click();
    });

    threadImageFile?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            uploadPhotoText.textContent = selectedFile.name;
        } else {
            selectedFile = null;
            uploadPhotoText.textContent = 'Subir foto';
        }
    });

    // ---- Post Thread Logic ----
    publishThreadBtn?.addEventListener('click', async () => {
        publishError.style.display = 'none';

        if (!threadTitle.value.trim() || !threadBody.value.trim()) {
            publishError.textContent = 'El título y la descripción son obligatorios.';
            publishError.style.display = 'block';
            return;
        }

        publishThreadBtn.disabled = true;
        publishThreadBtn.textContent = 'Publicando...';

        try {
            let imageUrl = null;

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('forum-images')
                    .upload(filePath, selectedFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('forum-images').getPublicUrl(filePath);
                imageUrl = data.publicUrl;
            }

            const { error: insertError } = await supabase
                .from('threads')
                .insert([{
                    title: threadTitle.value.trim(),
                    body: threadBody.value.trim(),
                    image_url: imageUrl,
                    author_id: currentUser.id,
                    author_name: currentUser.email.split('@')[0]
                }]);

            if (insertError) throw insertError;

            threadTitle.value = '';
            threadBody.value = '';
            selectedFile = null;
            threadImageFile.value = '';
            uploadPhotoText.textContent = 'Subir foto';

            currentPage = 0;
            allThreadsLoaded = false;
            loadThreads(true);

        } catch (error) {
            publishError.textContent = `Error: ${error.message}`;
            publishError.style.display = 'block';
        } finally {
            publishThreadBtn.disabled = false;
            publishThreadBtn.textContent = 'Publicar';
        }
    });

    // ---- Load Threads (Paginated) ----
    async function loadThreads(reset = false) {
        if (!threadList) return;

        if (reset) {
            currentPage = 0;
            allThreadsLoaded = false;
            threadList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--space-xl);">Cargando hilos...</p>';
        }

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: threads, error } = await supabase
            .from('threads')
            .select(`*, thread_likes (user_id)`)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            threadList.innerHTML = `<p style="text-align: center; color: #ff6b6b; padding: var(--space-xl);">Error al cargar el foro: ${error.message}</p>`;
            return;
        }

        if (reset) {
            threadList.innerHTML = '';
        }

        // Remove existing "Ver más" button
        const existingBtn = threadList.querySelector('.load-more-btn');
        if (existingBtn) existingBtn.remove();

        if (threads.length === 0 && currentPage === 0) {
            threadList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--space-xl);">No hay hallazgos publicados todavía. ¡Sé el primero!</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

        threads.forEach(thread => {
            const hasPhoto = !!thread.image_url;

            let userLiked = false;
            let totalLikes = thread.thread_likes ? thread.thread_likes.length : 0;

            if (currentUser && thread.thread_likes) {
                userLiked = thread.thread_likes.some(like => like.user_id === currentUser.id);
            }

            const dateFormatter = new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' });
            const dateStr = dateFormatter.format(new Date(thread.created_at));

            const threadEl = document.createElement('div');
            threadEl.className = 'thread-item';

            let html = `
                <div class="thread-header">
                    <h4 class="thread-title">${escapeHTML(thread.title)}</h4>
                    ${isAdmin ? `<button class="admin-delete-btn" data-thread-id="${thread.id}" data-image-url="${thread.image_url || ''}" title="Eliminar hilo">🗑️</button>` : ''}
                </div>
            `;

            html += `<p class="thread-body">${escapeHTML(thread.body)}</p>`;

            if (hasPhoto) {
                html += `
                <div class="thread-images" style="margin-top: var(--space-md); margin-bottom: var(--space-md);">
                    <img src="${thread.image_url}" alt="Foto del hallazgo" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px; display: block; cursor: pointer;" onclick="openImageOverlay('${thread.image_url}')">
                </div>`;
            }

            html += `
                <div class="thread-footer">
                    <div class="thread-author">
                        <div class="thread-avatar">${thread.author_name.substring(0, 2).toUpperCase()}</div>
                        <span>${escapeHTML(thread.author_name)} · ${dateStr}</span>
                    </div>
                    <div class="thread-stats">
                        <button class="like-btn ${userLiked ? 'liked' : ''}" data-id="${thread.id}" ${!currentUser ? 'disabled title="Inicia sesión para dar me gusta"' : ''} style="background: none; border: none; font-size: 16px; cursor: ${currentUser ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; gap: 5px; color: ${userLiked ? '#eb4b4b' : 'var(--text-muted)'}; padding: 5px 10px; border-radius: var(--radius-sm); transition: var(--transition);">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                ${userLiked ?
                    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'
                    :
                    '<path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>'
                }
                            </svg>
                            <span class="like-count">${totalLikes}</span>
                        </button>
                    </div>
                </div>
            `;

            threadEl.innerHTML = html;
            threadList.appendChild(threadEl);

            // Like listener
            const likeBtn = threadEl.querySelector('.like-btn');
            if (currentUser) {
                likeBtn.addEventListener('click', () => toggleLike(thread.id, userLiked, likeBtn));
            }

            // Admin delete listener
            const deleteBtn = threadEl.querySelector('.admin-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteThread(thread.id, thread.image_url));
            }
        });

        // Show "Ver más" button if we got a full page of results
        if (threads.length === PAGE_SIZE) {
            currentPage++;
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn btn-ghost load-more-btn';
            loadMoreBtn.textContent = 'Ver más';
            loadMoreBtn.style.cssText = 'display: block; margin: var(--space-lg) auto 0; padding: 10px 30px;';
            loadMoreBtn.addEventListener('click', () => {
                loadMoreBtn.textContent = 'Cargando...';
                loadMoreBtn.disabled = true;
                loadThreads(false);
            });
            threadList.appendChild(loadMoreBtn);
        }
    }

    // ---- Delete Thread (Admin) ----
    async function deleteThread(threadId, imageUrl) {
        if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;

        if (!confirm('¿Seguro que quieres eliminar este hilo? Esta acción no se puede deshacer.')) return;

        try {
            // 1. Delete image from storage if exists
            if (imageUrl) {
                try {
                    // Extract path from URL: .../forum-images/userId/filename
                    const url = new URL(imageUrl);
                    const pathParts = url.pathname.split('/forum-images/');
                    if (pathParts[1]) {
                        const storagePath = decodeURIComponent(pathParts[1]);
                        await supabase.storage.from('forum-images').remove([storagePath]);
                    }
                } catch (e) {
                    console.warn('Could not delete image from storage:', e);
                }
            }

            // 2. Delete the thread (cascade deletes likes)
            const { error } = await supabase.from('threads').delete().eq('id', threadId);
            if (error) throw error;

            currentPage = 0;
            allThreadsLoaded = false;
            loadThreads(true);
        } catch (err) {
            alert(`Error al eliminar: ${err.message}`);
        }
    }

    // ---- Like Logic ----
    async function toggleLike(threadId, currentlyLiked, btnNode) {
        if (!currentUser) return;
        btnNode.disabled = true;

        try {
            if (currentlyLiked) {
                await supabase.from('thread_likes').delete().match({ thread_id: threadId, user_id: currentUser.id });
            } else {
                await supabase.from('thread_likes').insert([{ thread_id: threadId, user_id: currentUser.id }]);
            }
            currentPage = 0;
            allThreadsLoaded = false;
            loadThreads(true);
        } catch (error) {
            console.error('Error toggling like:', error);
            btnNode.disabled = false;
        }
    }

    // Utility
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
}
