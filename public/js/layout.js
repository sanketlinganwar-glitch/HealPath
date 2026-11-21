/**
 * HealPath - Shared Layout & Navigation Helper
 * Handles Active Nav Highlighting, Top-bar Info, Floating WhatsApp & Emergency Actions
 */

(function () {
  function initLayout() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const isExcludedFromFloaters = currentPath === 'dashboard.html' || currentPath === 'queue.html';

    // Highlight active link in header nav
    const navLinks = document.querySelectorAll('.nav-menu .nav-link');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkFile = href.split('/').pop().split('?')[0].split('#')[0];
      
      const isHome = (currentPath === '' || currentPath === 'index.html') && (linkFile === 'index.html' || linkFile === '');
      const isMatch = linkFile === currentPath;

      if (isHome || isMatch) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Inject Floating WhatsApp and Emergency Call actions if not on dashboard or queue
    if (!isExcludedFromFloaters && !document.getElementById('floating-contact-actions')) {
      const floaters = document.createElement('div');
      floaters.id = 'floating-contact-actions';
      floaters.className = 'floating-contact-actions';
      floaters.innerHTML = `
        <a href="https://wa.me/919552625262?text=Hello%20Sanjivani%20Hospital,%20I%20have%20an%20inquiry%20regarding%20appointment%20and%20OPD." 
           target="_blank" 
           rel="noopener" 
           class="floating-wa-btn" 
           aria-label="Chat with Sanjivani Hospital on WhatsApp"
           title="WhatsApp Assistance: +91 95526 25262">
          <i class="fab fa-whatsapp"></i>
          <span class="floating-tooltip">WhatsApp Us</span>
        </a>
        <a href="tel:+919552625262" 
           class="floating-emergency-btn" 
           aria-label="24/7 Emergency Call Sanjivani Hospital"
           title="24/7 Emergency Line: +91 95526 25262">
          <i class="fas fa-phone-alt"></i>
          <span class="floating-tooltip">Emergency Call</span>
        </a>
      `;
      document.body.appendChild(floaters);
    }

    // Ensure mobile toggle works smoothly
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMenu.classList.toggle('open');
        mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Close mobile menu on outside click
      document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target) && navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Keyboard accessibility for focus
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (navMenu && navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
          if (mobileToggle) mobileToggle.focus();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }
})();
