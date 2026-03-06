import { supabase } from './supabase.js';

export function initQuedadas() {
    // ---- DOM Elements ----
    const quedadasAuthState = document.getElementById('quedadasAuthState');
    const quedadasNewForm = document.getElementById('quedadasNewForm');
    const quedadasUserLabel = document.getElementById('quedadasUserLabel');
    const meetupList = document.getElementById('meetupList');

    const meetupTitle = document.getElementById('meetupTitle');
    const meetupDescription = document.getElementById('meetupDescription');
    const meetupLocation = document.getElementById('meetupLocation');
    const meetupDate = document.getElementById('meetupDate');
    const meetupLat = document.getElementById('meetupLat');
    const meetupLng = document.getElementById('meetupLng');
    const createMeetupBtn = document.getElementById('createMeetupBtn');
    const meetupError = document.getElementById('meetupError');
    const loginBtnQuedadas = document.getElementById('loginBtnQuedadas');

    // ---- State ----
    let currentUser = null;

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

    function showAuthenticatedUI() {
        if (quedadasAuthState) quedadasAuthState.style.display = 'none';
        if (quedadasNewForm) quedadasNewForm.style.display = 'block';
        if (quedadasUserLabel) quedadasUserLabel.textContent = `Como: ${currentUser.email.split('@')[0]}`;
        loadMeetups();
    }

    function showPublicUI() {
        if (quedadasAuthState) quedadasAuthState.style.display = 'block';
        if (quedadasNewForm) quedadasNewForm.style.display = 'none';
        loadMeetups();
    }

    async function checkUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            showAuthenticatedUI();
        } else {
            showPublicUI();
        }
    }

    // ---- Open Auth Modal (reuse from foro) ----
    loginBtnQuedadas?.addEventListener('click', () => {
        const authModalBackdrop = document.getElementById('authModalBackdrop');
        if (authModalBackdrop) {
            authModalBackdrop.style.display = 'flex';
            setTimeout(() => authModalBackdrop.classList.add('active'), 10);
        }
    });

    // ---- Set min date to today ----
    if (meetupDate) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        meetupDate.min = now.toISOString().slice(0, 16);
    }

    // ---- Create Meetup ----
    createMeetupBtn?.addEventListener('click', async () => {
        meetupError.style.display = 'none';

        if (!meetupTitle.value.trim() || !meetupDescription.value.trim() || !meetupLocation.value.trim() || !meetupDate.value) {
            meetupError.textContent = 'Todos los campos son obligatorios.';
            meetupError.style.display = 'block';
            return;
        }

        const eventDate = new Date(meetupDate.value);
        if (eventDate <= new Date()) {
            meetupError.textContent = 'La fecha debe ser en el futuro.';
            meetupError.style.display = 'block';
            return;
        }

        createMeetupBtn.disabled = true;
        createMeetupBtn.textContent = 'Creando...';

        try {
            const lat = meetupLat.value.trim() ? parseFloat(meetupLat.value.trim()) : null;
            const lng = meetupLng.value.trim() ? parseFloat(meetupLng.value.trim()) : null;

            const { error } = await supabase.from('meetups').insert([{
                title: meetupTitle.value.trim(),
                description: meetupDescription.value.trim(),
                location_name: meetupLocation.value.trim(),
                location_lat: lat,
                location_lng: lng,
                event_date: eventDate.toISOString(),
                author_id: currentUser.id,
                author_name: currentUser.email.split('@')[0]
            }]);

            if (error) throw error;

            meetupTitle.value = '';
            meetupDescription.value = '';
            meetupLocation.value = '';
            meetupDate.value = '';
            meetupLat.value = '';
            meetupLng.value = '';
            loadMeetups();
        } catch (err) {
            meetupError.textContent = `Error: ${err.message}`;
            meetupError.style.display = 'block';
        } finally {
            createMeetupBtn.disabled = false;
            createMeetupBtn.textContent = 'Crear quedada';
        }
    });

    // ---- Load Meetups ----
    async function loadMeetups() {
        if (!meetupList) return;

        meetupList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--space-xl);">Cargando quedadas...</p>';

        const now = new Date().toISOString();

        // Fetch future meetups
        const { data: futureMeetups, error: futureErr } = await supabase
            .from('meetups')
            .select('*, meetup_attendees(*), meetup_comments(*)')
            .gte('event_date', now)
            .order('event_date', { ascending: true });

        // Fetch last 3 past meetups
        const { data: pastMeetups, error: pastErr } = await supabase
            .from('meetups')
            .select('*, meetup_attendees(*), meetup_comments(*)')
            .lt('event_date', now)
            .order('event_date', { ascending: false })
            .limit(3);

        if (futureErr || pastErr) {
            meetupList.innerHTML = `<p style="text-align: center; color: #ff6b6b; padding: var(--space-xl);">Error: ${(futureErr || pastErr).message}</p>`;
            return;
        }

        const allMeetups = [...(futureMeetups || []), ...(pastMeetups || [])];

        if (allMeetups.length === 0) {
            meetupList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: var(--space-xl);">No hay quedadas todavía. ¡Crea la primera!</p>';
            return;
        }

        meetupList.innerHTML = '';

        // Future meetups header
        if (futureMeetups && futureMeetups.length > 0) {
            const futureHeader = document.createElement('h3');
            futureHeader.className = 'meetup-section-title';
            futureHeader.innerHTML = '📅 Próximas quedadas';
            futureHeader.style.cssText = 'font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: var(--space-md); color: var(--text-primary);';
            meetupList.appendChild(futureHeader);
            futureMeetups.forEach(m => meetupList.appendChild(buildMeetupCard(m, false)));
        }

        // Past meetups header
        if (pastMeetups && pastMeetups.length > 0) {
            const pastHeader = document.createElement('h3');
            pastHeader.className = 'meetup-section-title';
            pastHeader.innerHTML = '🕐 Últimas quedadas';
            pastHeader.style.cssText = 'font-family: var(--font-serif); font-size: 1.3rem; margin-top: var(--space-xl); margin-bottom: var(--space-md); color: var(--text-muted);';
            meetupList.appendChild(pastHeader);
            pastMeetups.forEach(m => meetupList.appendChild(buildMeetupCard(m, true)));
        }
    }

    // ---- Build Meetup Card ----
    function buildMeetupCard(meetup, isPast) {
        const card = document.createElement('div');
        card.className = `meetup-card ${isPast ? 'meetup-past' : ''}`;

        const eventDate = new Date(meetup.event_date);
        const dateStr = eventDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = eventDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const relativeStr = getRelativeTime(eventDate);

        const attendees = meetup.meetup_attendees || [];
        const comments = meetup.meetup_comments || [];
        const isAttending = currentUser && attendees.some(a => a.user_id === currentUser.id);
        const attendeeNames = attendees.map(a => a.user_name).join(', ') || 'Nadie aún';
        const hasCoords = meetup.location_lat && meetup.location_lng;

        let html = `
            <div class="meetup-card-header">
                <div class="meetup-date-badge ${isPast ? 'past' : ''}">
                    <span class="meetup-date-day">${eventDate.getDate()}</span>
                    <span class="meetup-date-month">${eventDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div class="meetup-card-info">
                    <h4 class="meetup-card-title">${escapeHTML(meetup.title)}</h4>
                    <p class="meetup-card-meta">
                        ${isPast ? '✓ Finalizada' : `🕐 ${capitalize(dateStr)} a las ${timeStr}`} · ${relativeStr}
                    </p>
                </div>
            </div>

            <div class="meetup-card-location">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text-muted)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                ${hasCoords
                ? `<a href="https://www.google.com/maps?q=${meetup.location_lat},${meetup.location_lng}" target="_blank" rel="noopener" style="color: var(--text-secondary); text-decoration: underline;">${escapeHTML(meetup.location_name)}</a>`
                : `<span>${escapeHTML(meetup.location_name)}</span>`
            }
            </div>

            ${hasCoords ? `
            <div class="meetup-map-preview">
                <a href="https://www.google.com/maps?q=${meetup.location_lat},${meetup.location_lng}" target="_blank" rel="noopener" title="Abrir en Google Maps">
                    <img src="https://maps.googleapis.com/maps/api/staticmap?center=${meetup.location_lat},${meetup.location_lng}&zoom=13&size=600x200&scale=2&maptype=roadmap&markers=color:red%7C${meetup.location_lat},${meetup.location_lng}&key=AIzaSyBgUALTrpej04tbInFxdfXruwl5RFvcLZU" 
                         alt="Mapa de ${escapeHTML(meetup.location_name)}" 
                         style="width:100%; height:160px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color); cursor:pointer;"
                         onerror="this.parentElement.parentElement.innerHTML='<iframe src=\'https://maps.google.com/maps?q=${meetup.location_lat},${meetup.location_lng}&output=embed\' style=\'width:100%;height:160px;border:none;border-radius:8px;\'></iframe>'">
                </a>
            </div>
            ` : ''}

            <p class="meetup-card-desc">${escapeHTML(meetup.description)}</p>

            <div class="meetup-card-attendees">
                <span class="meetup-attendee-label">👥 Asistentes (${attendees.length}):</span>
                <span class="meetup-attendee-names">${escapeHTML(attendeeNames)}</span>
            </div>
        `;

        // Attendance button
        if (!isPast) {
            html += `
            <div class="meetup-card-actions">
                <button class="btn ${isAttending ? 'btn-ghost meetup-attending' : 'btn-primary'} meetup-attend-btn" 
                    data-meetup-id="${meetup.id}" 
                    ${!currentUser ? 'disabled title="Inicia sesión"' : ''}
                    style="${isAttending ? 'color: #4caf50; border-color: #4caf50;' : ''}">
                    ${isAttending ? '✓ Asistiré' : 'Asistiré'}
                </button>
            </div>`;
        }

        // Comments section
        html += `<div class="meetup-comments-section" data-meetup-id="${meetup.id}">`;

        if (comments.length > 0) {
            html += `<div class="meetup-comments-list">`;
            // Sort by created_at ascending
            comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            comments.forEach(c => {
                const cDate = new Date(c.created_at);
                const cDateStr = cDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                html += `
                    <div class="meetup-comment">
                        <div class="meetup-comment-avatar">${c.user_name.substring(0, 2).toUpperCase()}</div>
                        <div class="meetup-comment-content">
                            <span class="meetup-comment-author">${escapeHTML(c.user_name)}</span>
                            <span class="meetup-comment-date">${cDateStr}</span>
                            <p class="meetup-comment-text">${escapeHTML(c.body)}</p>
                        </div>
                    </div>`;
            });
            html += `</div>`;
        }

        // Comment input (only for logged-in users)
        if (currentUser) {
            html += `
                <div class="meetup-comment-input">
                    <input type="text" class="foro-input meetup-comment-field" placeholder="Escribe un comentario..." style="flex: 1;">
                    <button class="btn btn-primary meetup-comment-send" data-meetup-id="${meetup.id}" style="padding: 10px 16px;">Enviar</button>
                </div>`;
        }
        html += `</div>`;

        card.innerHTML = html;

        // ---- Attach event listeners ----
        // Attendance
        const attendBtn = card.querySelector('.meetup-attend-btn');
        if (attendBtn && currentUser) {
            attendBtn.addEventListener('click', () => toggleAttendance(meetup.id, isAttending));
        }

        // Comment send
        const sendBtn = card.querySelector('.meetup-comment-send');
        if (sendBtn) {
            const inputField = card.querySelector('.meetup-comment-field');
            sendBtn.addEventListener('click', () => addComment(meetup.id, inputField));
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addComment(meetup.id, inputField);
            });
        }

        return card;
    }

    // ---- Toggle Attendance ----
    async function toggleAttendance(meetupId, isCurrentlyAttending) {
        if (!currentUser) return;

        try {
            if (isCurrentlyAttending) {
                await supabase.from('meetup_attendees').delete().match({ meetup_id: meetupId, user_id: currentUser.id });
            } else {
                await supabase.from('meetup_attendees').insert([{
                    meetup_id: meetupId,
                    user_id: currentUser.id,
                    user_name: currentUser.email.split('@')[0]
                }]);
            }
            loadMeetups();
        } catch (err) {
            console.error('Error toggling attendance:', err);
        }
    }

    // ---- Add Comment ----
    async function addComment(meetupId, inputField) {
        if (!currentUser || !inputField.value.trim()) return;

        const body = inputField.value.trim();
        inputField.disabled = true;

        try {
            const { error } = await supabase.from('meetup_comments').insert([{
                meetup_id: meetupId,
                user_id: currentUser.id,
                user_name: currentUser.email.split('@')[0],
                body
            }]);
            if (error) throw error;
            loadMeetups();
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            inputField.disabled = false;
            inputField.value = '';
        }
    }

    // ---- Utilities ----
    function getRelativeTime(date) {
        const now = new Date();
        const diffMs = date - now;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        if (diffDays === -1) return 'Ayer';
        if (diffDays > 1) return `En ${diffDays} días`;
        return `Hace ${Math.abs(diffDays)} días`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

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
