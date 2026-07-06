document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    
    // Add subtle background change on scroll for the navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 15, 0.8)';
            navbar.style.borderBottom = '1px solid var(--glass-border)';
        } else {
            navbar.style.background = 'var(--glass-bg)';
            navbar.style.borderBottom = '1px solid transparent';
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Parallax Scroll Intersection Observer for phone screens
    const featureSteps = document.querySelectorAll('.feature-step');
    const screenImages = document.querySelectorAll('.screen-img');

    if (featureSteps.length > 0 && screenImages.length > 0) {
        // Options for the IntersectionObserver
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5 // Trigger when 50% of the feature step is visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stepIndex = entry.target.getAttribute('data-step');
                    
                    // Activate current feature text
                    featureSteps.forEach(step => step.classList.remove('active'));
                    entry.target.classList.add('active');

                    // Activate corresponding phone screen
                    screenImages.forEach(img => img.classList.remove('active'));
                    const targetScreen = document.getElementById(`screen-${stepIndex}`);
                    if (targetScreen) {
                        targetScreen.classList.add('active');
                    }
                }
            });
        }, observerOptions);

        featureSteps.forEach(step => {
            observer.observe(step);
        });
    }
});
