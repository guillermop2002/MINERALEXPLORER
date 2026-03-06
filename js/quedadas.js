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
    const meetupLocationLabel = document.getElementById('meetupLocationLabel');
    const createMeetupBtn = document.getElementById('createMeetupBtn');
    const meetupError = document.getElementById('meetupError');
    const loginBtnQuedadas = document.getElementById('loginBtnQuedadas');

    // ---- State ----
    let currentUser = null;
    let pickerMap = null;
    let pickerMarker = null;

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
        initMapPicker();
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

    // ---- Leaflet Map Picker ----
    function initMapPicker() {
        const mapContainer = document.getElementById('meetupMapPicker');
        if (!mapContainer || pickerMap) return; // Already initialized

        // Center on Spain
        pickerMap = L.map('meetupMapPicker').setView([40.4168, -3.7038], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18
        }).addTo(pickerMap);

        // Click to set marker
        pickerMap.on('click', async (e) => {
            const { lat, lng } = e.latlng;

            // Set/move marker
            if (pickerMarker) {
                pickerMarker.setLatLng(e.latlng);
            } else {
                pickerMarker = L.marker(e.latlng).addTo(pickerMap);
            }

            // Save coords
            meetupLat.value = lat.toFixed(6);
            meetupLng.value = lng.toFixed(6);
            meetupLocationLabel.textContent = 'Buscando nombre del lugar...';
            meetupLocationLabel.style.color = 'var(--text-secondary)';

            // Reverse geocode with Nominatim (free)
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
                const data = await res.json();

                const addr = data.address;
                // Build a nice name: town/city + state or country
                const placeName = addr.village || addr.town || addr.city || addr.municipality || addr.county || '';
                const region = addr.state || addr.country || '';
                const fullName = [placeName, region].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Ubicación seleccionada';

                meetupLocation.value = fullName;
                meetupLocationLabel.innerHTML = `📍 <strong>${fullName}</strong>`;
                pickerMarker.bindPopup(fullName).openPopup();
            } catch {
                meetupLocation.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                meetupLocationLabel.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        });

        // Fix Leaflet rendering issues when the map container was hidden
        setTimeout(() => pickerMap.invalidateSize(), 200);
    }

    // ---- Create Meetup ----
    createMeetupBtn?.addEventListener('click', async () => {
        meetupError.style.display = 'none';

        if (!meetupTitle.value.trim() || !meetupDescription.value.trim() || !meetupDate.value) {
            meetupError.textContent = 'El título, la fecha y la descripción son obligatorios.';
            meetupError.style.display = 'block';
            return;
        }

        if (!meetupLat.value || !meetupLng.value) {
            meetupError.textContent = 'Pincha en el mapa para seleccionar la ubicación.';
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
            const { error } = await supabase.from('meetups').insert([{
                title: meetupTitle.value.trim(),
                description: meetupDescription.value.trim(),
                location_name: meetupLocation.value || 'Ubicación seleccionada',
                location_lat: parseFloat(meetupLat.value),
                location_lng: parseFloat(meetupLng.value),
                event_date: eventDate.toISOString(),
                author_id: currentUser.id,
                author_name: currentUser.email.split('@')[0]
            }]);

            if (error) throw error;

            // Reset form
            meetupTitle.value = '';
            meetupDescription.value = '';
            meetupDate.value = '';
            meetupLat.value = '';
            meetupLng.value = '';
            meetupLocation.value = '';
            meetupLocationLabel.textContent = 'Ninguna ubicación seleccionada';
            if (pickerMarker) {
                pickerMap.removeLayer(pickerMarker);
                pickerMarker = null;
            }

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

        const { data: futureMeetups, error: futureErr } = await supabase
            .from('meetups')
            .select('*, meetup_attendees(*), meetup_comments(*)')
            .gte('event_date', now)
            .order('event_date', { ascending: true });

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

        if (futureMeetups && futureMeetups.length > 0) {
            const futureHeader = document.createElement('h3');
            futureHeader.innerHTML = '📅 Próximas quedadas';
            futureHeader.style.cssText = 'font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: var(--space-md); color: var(--text-primary);';
            meetupList.appendChild(futureHeader);
            futureMeetups.forEach(m => meetupList.appendChild(buildMeetupCard(m, false)));
        }

        if (pastMeetups && pastMeetups.length > 0) {
            const pastHeader = document.createElement('h3');
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

        const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${meetup.location_lat},${meetup.location_lng}` : '#';
        const mapId = `map-${meetup.id.substring(0, 8)}`;

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
                ? `<a href="${mapsUrl}" target="_blank" rel="noopener" style="color: var(--text-secondary); text-decoration: underline;">${escapeHTML(meetup.location_name)}</a>`
                : `<span>${escapeHTML(meetup.location_name)}</span>`
            }
            </div>
        `;

        // OpenStreetMap embed preview
        if (hasCoords) {
            html += `
            <div class="meetup-map-preview">
                <a href="${mapsUrl}" target="_blank" rel="noopener" title="Abrir en Google Maps" style="display:block; position:relative;">
                    <div id="${mapId}" style="width:100%; height:160px; border-radius:8px; z-index:1;"></div>
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; cursor:pointer;"></div>
                </a>
            </div>`;
        }

        html += `<p class="meetup-card-desc">${escapeHTML(meetup.description)}</p>`;

        html += `
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

        if (currentUser) {
            html += `
                <div class="meetup-comment-input">
                    <input type="text" class="foro-input meetup-comment-field" placeholder="Escribe un comentario..." style="flex: 1;">
                    <button class="btn btn-primary meetup-comment-send" data-meetup-id="${meetup.id}" style="padding: 10px 16px;">Enviar</button>
                </div>`;
        }
        html += `</div>`;

        card.innerHTML = html;

        // ---- Initialize Leaflet mini-map for this card ----
        if (hasCoords) {
            setTimeout(() => {
                const miniMapEl = card.querySelector(`#${mapId}`);
                if (miniMapEl) {
                    const miniMap = L.map(miniMapEl, {
                        zoomControl: false,
                        dragging: false,
                        scrollWheelZoom: false,
                        doubleClickZoom: false,
                        touchZoom: false,
                        attributionControl: false
                    }).setView([meetup.location_lat, meetup.location_lng], 13);

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 18
                    }).addTo(miniMap);

                    L.marker([meetup.location_lat, meetup.location_lng]).addTo(miniMap);
                }
            }, 100);
        }

        // ---- Attach event listeners ----
        const attendBtn = card.querySelector('.meetup-attend-btn');
        if (attendBtn && currentUser) {
            attendBtn.addEventListener('click', () => toggleAttendance(meetup.id, isAttending));
        }

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
