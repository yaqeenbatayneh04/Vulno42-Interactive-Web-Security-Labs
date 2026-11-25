document.addEventListener('DOMContentLoaded', () => {
    const partnerIntro = document.getElementById('partner-intro');
    const partnerContent = document.querySelector('.partner-intro-content');
    const labsSection = document.getElementById('labs-section');
    const heroSection = document.querySelector('#labs-section .hero');
    const cardsGrid = document.querySelector('#labs-section .cards-grid');
    const cards = document.querySelectorAll('#labs-section .card');
    const homeNavbar = document.querySelector('.home-navbar');
    const exploreBtn = document.getElementById('explore-labs-btn');

    // Helper to clamp a value between 0 and 1
    const clamp = (val) => Math.min(Math.max(val, 0), 1);

    // Two-phase scroll choreography:
    // Phase 1 (0% -> 50% of viewport height): Partner intro fades out while pinned
    // Phase 2 (52% -> 98% of viewport height): Labs hero & cards fade in sequentially
    if (partnerIntro && partnerContent && labsSection) {
        const handleScrollChoreography = () => {
            const scrollY = window.scrollY;
            const vh = window.innerHeight || 800;

            // --- Phase 1: Partner Intro Fade-Out (0 to 0.50 * vh) ---
            const introOut = clamp(scrollY / (vh * 0.50));
            const introOpacity = 1 - introOut;

            partnerIntro.style.opacity = introOpacity.toFixed(3);
            partnerIntro.style.visibility = introOpacity <= 0.005 ? 'hidden' : 'visible';
            partnerContent.style.transform = `translateY(${(-introOut * 28).toFixed(1)}px) scale(${(1 - introOut * 0.04).toFixed(3)})`;

            // Swap pointer-events cleanly at the handoff point so hidden layers never block clicks
            const inLabsPhase = scrollY >= vh * 0.50;
            partnerIntro.style.pointerEvents = inLabsPhase ? 'none' : 'auto';
            labsSection.style.pointerEvents = inLabsPhase ? 'auto' : 'none';

            // --- Phase 2: Labs Hero & Cards Fade-In (0.52 * vh to 0.98 * vh) ---
            if (heroSection) {
                const heroIn = clamp((scrollY - vh * 0.52) / (vh * 0.28));
                heroSection.style.opacity = heroIn.toFixed(3);
                heroSection.style.transform = `translateY(${((1 - heroIn) * 34).toFixed(1)}px)`;
            }

            if (cardsGrid) {
                const gridIn = clamp((scrollY - vh * 0.60) / (vh * 0.36));
                cardsGrid.style.transform = `translateY(${((1 - gridIn) * 42).toFixed(1)}px)`;
            }

            cards.forEach((card, index) => {
                const start = vh * (0.62 + index * 0.06);
                const cardIn = clamp((scrollY - start) / (vh * 0.24));
                card.style.opacity = cardIn.toFixed(3);
            });

            // Switch navbar to solid dark background once the intro has faded out
            if (homeNavbar) {
                homeNavbar.classList.toggle('scrolled', inLabsPhase);
            }
        };

        // Smoothly scroll to the exact handoff end when clicking "Explore the Labs"
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (event) => {
                event.preventDefault();
                window.scrollTo({
                    top: window.innerHeight,
                    behavior: 'smooth',
                });
            });
        }

        window.addEventListener('scroll', handleScrollChoreography, { passive: true });
        window.addEventListener('resize', handleScrollChoreography);
        handleScrollChoreography();
    }

    // Keyboard shortcuts: press 1, 2, or 3 to open the corresponding lab directly
    document.addEventListener('keydown', (event) => {
        if (event.key === '1') window.location.href = 'lab1.html'; // Open Redirect (Easy)
        if (event.key === '2') window.location.href = 'lab2.html'; // ReDoS (Medium)
        if (event.key === '3') window.location.href = 'lab3.html'; // Prototype Pollution (Hard)
    });
});