import { initForo } from './foro.js';
import { initQuedadas } from './quedadas.js';

/* ==========================================================================
   MINERAL EXPLORER — Main JavaScript
   Navigation, modal carousel, lazy loading, scroll animations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initForo();
    initQuedadas();

    /* ---- DOM References ---- */
    const header = document.getElementById('header');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const navAnchors = navLinks.querySelectorAll('a');

    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalImage = document.getElementById('modalImage');
    const modalName = document.getElementById('modalName');
    const modalClose = document.getElementById('modalClose');
    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    const carouselDots = document.getElementById('carouselDots');

    const mineralCards = document.querySelectorAll('.mineral-card');


    /* ================================================================
       1. STICKY HEADER — Blur background on scroll
       ================================================================ */
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        header.classList.toggle('scrolled', scrollY > 50);
        lastScroll = scrollY;
    }, { passive: true });


    /* ================================================================
       2. MOBILE MENU — Hamburger toggle
       ================================================================ */
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu on link click
    navAnchors.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });


    /* ================================================================
       3. ACTIVE NAV LINK — Highlight on scroll
       ================================================================ */
    const sections = document.querySelectorAll('section[id]');

    const observerNav = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navAnchors.forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, {
        rootMargin: '-40% 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(section => observerNav.observe(section));


    /* ================================================================
       4. FADE-IN ANIMATIONS — Intersection Observer
       ================================================================ */
    const fadeElements = document.querySelectorAll('.fade-in');

    const observerFade = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observerFade.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    });

    fadeElements.forEach(el => observerFade.observe(el));


    /* ================================================================
       5. LAZY LOADING — Native + Intersection Observer fallback
       ================================================================ */
    // Modern browsers handle loading="lazy" natively.
    // For older browsers, we use IntersectionObserver as fallback.
    if (!('loading' in HTMLImageElement.prototype)) {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        const observerLazy = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    observerLazy.unobserve(img);
                }
            });
        }, {
            rootMargin: '200px'
        });

        lazyImages.forEach(img => observerLazy.observe(img));
    }


    /* ================================================================
       6. MINERAL MODAL + CAROUSEL
       ================================================================ */
    let currentMineral = null;
    let currentAngle = 0;
    let totalAngles = 0;

    /**
     * Open modal with mineral carousel
     * @param {string} mineralId - e.g. "mineral_01"
     * @param {string} name - Display name
     * @param {number} angles - Number of angle photos
     */
    function openModal(mineralId, name, angles) {
        currentMineral = mineralId;
        currentAngle = 0;
        totalAngles = angles;

        modalName.textContent = name;
        updateCarouselImage();
        buildDots();

        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
        currentMineral = null;
    }

    function updateCarouselImage() {
        const angleNum = String(currentAngle + 1).padStart(2, '0');
        const src = `minerales/${currentMineral}_angulo_${angleNum}.webp`;

        // Set image directly — no preload to avoid race conditions
        modalImage.style.opacity = '0';
        modalImage.alt = `${modalName.textContent} — Ángulo ${currentAngle + 1}`;

        // Always show image after load or error
        const showImage = () => {
            modalImage.style.opacity = '1';
        };
        modalImage.onload = showImage;
        modalImage.onerror = showImage;

        // Force reload by clearing src first if same mineral different angle
        modalImage.removeAttribute('src');
        // Use setTimeout to ensure browser registers the src change
        setTimeout(() => {
            modalImage.src = src;
        }, 10);

        // Update dots
        const dots = carouselDots.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentAngle);
        });
    }

    function buildDots() {
        carouselDots.innerHTML = '';
        for (let i = 0; i < totalAngles; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Ángulo ${i + 1}`);
            dot.addEventListener('click', () => {
                currentAngle = i;
                updateCarouselImage();
            });
            carouselDots.appendChild(dot);
        }
    }

    function nextSlide() {
        currentAngle = (currentAngle + 1) % totalAngles;
        updateCarouselImage();
    }

    function prevSlide() {
        currentAngle = (currentAngle - 1 + totalAngles) % totalAngles;
        updateCarouselImage();
    }

    // Event listeners
    mineralCards.forEach(card => {
        card.addEventListener('click', () => {
            const mineralId = card.dataset.mineral;
            const name = card.dataset.name;
            const angles = parseInt(card.dataset.angles, 10);
            openModal(mineralId, name, angles);
        });
    });

    modalClose.addEventListener('click', closeModal);
    carouselNext.addEventListener('click', nextSlide);
    carouselPrev.addEventListener('click', prevSlide);

    // Close on backdrop click
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modalBackdrop.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowRight':
                nextSlide();
                break;
            case 'ArrowLeft':
                prevSlide();
                break;
        }
    });

    // Touch swipe support for carousel
    let touchStartX = 0;
    let touchEndX = 0;

    const modalImageContainer = document.querySelector('.modal-image-container');

    modalImageContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    modalImageContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }, { passive: true });


    /* ================================================================
       7. SMOOTH SCROLL — Offset for fixed header
       ================================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            const headerOffset = targetId === '#inicio' ? 0 : 70;
            const elementPosition = target.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        });
    });

});
