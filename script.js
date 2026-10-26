/**
 * ============================================================================
 * TAKSHASHILA VIDYA MANDIR SR. SEC. SCHOOL — MASTER SCRIPT (script.js)
 * Stage 3: Client-Side Interactivity, Accessibility & Form Validation
 * Compatible with Stage 1 (index.html) & Stage 2 (style.css)
 * ============================================================================
 */

(function () {
  'use strict';

  /**
   * Safe DOM Helpers
   */
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * --------------------------------------------------------------------------
   * 1. STICKY HEADER, MOBILE NAVIGATION MENU & ACTIVE SCROLL SPY
   * --------------------------------------------------------------------------
   */
  function initNavigation() {
    const header = qs('#main-header');
    const menuToggle = qs('#mobile-menu-toggle');
    const navMenu = qs('#primary-navigation');
    const navLinks = qsa('.site-nav__link', navMenu || document);
    const navActionLinks = qsa('.site-nav__actions a', navMenu || document);

    if (!menuToggle || !navMenu) return;

        function setMenuState(isOpen) {
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      navMenu.classList.toggle('is-open', isOpen);

      if (window.innerWidth < 1024) {
        document.body.classList.toggle('no-scroll', isOpen);
        
      } else {
        document.body.classList.remove('no-scroll');
      }
    }


    function toggleMenu() {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      setMenuState(!isExpanded);
    }

    menuToggle.addEventListener('click', toggleMenu);

    // Close mobile menu when any navigation link or CTA button is clicked
    [...navLinks, ...navActionLinks].forEach((link) => {
      link.addEventListener('click', () => {
        if (menuToggle.getAttribute('aria-expanded') === 'true') {
          setMenuState(false);
        }
      });
    });

    // Close mobile menu on Escape key and return focus to toggle button
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuState(false);
        menuToggle.focus();
      }
    });

    // Close mobile menu if user taps outside header/navigation area
    document.addEventListener('click', (event) => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (!isExpanded) return;

      const clickedInsideNav = navMenu.contains(event.target);
      const clickedToggle = menuToggle.contains(event.target);
      if (!clickedInsideNav && !clickedToggle) {
        setMenuState(false);
      }
    });

    // Reset mobile drawer state cleanly if screen rotates/resizes to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024 && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuState(false);
      }
    });

    // Header shadow on scroll & Active Section Scroll Spy
    const trackedSections = navLinks
      .map((link) => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return null;
        const sectionEl = qs(href);
        return sectionEl ? { link, sectionEl } : null;
      })
      .filter(Boolean);

    function handleScrollState() {
      const scrollY = window.scrollY || window.pageYOffset;

      if (header) {
        header.classList.toggle('is-scrolled', scrollY > 16);
      }

      if (trackedSections.length === 0) return;

      const spyOffset = scrollY + 140;
      let currentActiveLink = null;

      trackedSections.forEach(({ link, sectionEl }) => {
        const top = sectionEl.offsetTop;
        const height = sectionEl.offsetHeight;
        if (spyOffset >= top && spyOffset < top + height) {
          currentActiveLink = link;
        }
      });

      trackedSections.forEach(({ link }) => {
        link.classList.toggle('is-active', link === currentActiveLink);
      });
    }

    window.addEventListener('scroll', handleScrollState, { passive: true });
    handleScrollState();
  }

  /**
   * --------------------------------------------------------------------------
   * 2. SCHOOL STATISTICS COUNTER ANIMATION (#achievements)
   * --------------------------------------------------------------------------
   */
  function initStatsCounter() {
    const statNumbers = qsa('.stat-card__number[data-counter-target]');
    if (statNumbers.length === 0) return;

    function animateValue(el) {
      const target = parseInt(el.getAttribute('data-counter-target'), 10);
      const suffix = el.getAttribute('data-counter-suffix') || '';

      if (Number.isNaN(target)) return;

      if (prefersReducedMotion()) {
        el.textContent = `${target}${suffix}`;
        return;
      }

      const duration = 1400;
      const startTime = performance.now();

      function updateFrame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic curve
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = Math.floor(eased * target);

        el.textContent = `${currentVal}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(updateFrame);
        } else {
          el.textContent = `${target}${suffix}`;
        }
      }

      requestAnimationFrame(updateFrame);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateValue(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35 }
      );

      statNumbers.forEach((el) => observer.observe(el));
    } else {
      statNumbers.forEach(animateValue);
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 3. REUSABLE KEYBOARD NAVIGATION FOR FILTER TABLISTS
   * --------------------------------------------------------------------------
   */
  function attachTablistKeyboardSupport(tabButtons) {
    if (!tabButtons || tabButtons.length === 0) return;

    tabButtons.forEach((btn, index) => {
      btn.addEventListener('keydown', (event) => {
        let nextIndex = null;

        if (event.key === 'ArrowRight') {
          nextIndex = (index + 1) % tabButtons.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabButtons.length - 1;
        }

        if (nextIndex !== null) {
          event.preventDefault();
          tabButtons[nextIndex].focus();
          tabButtons[nextIndex].click();
        }
      });
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 4. ACADEMIC PROGRAMS WING FILTER (#academics)
   * --------------------------------------------------------------------------
   */
  function initAcademicsFilter() {
    const tabContainer = qs('#academics-tabs');
    const academicGrid = qs('#academics-grid');
    if (!tabContainer || !academicGrid) return;

    const filterBtns = qsa('.filter-tab[data-academic-filter]', tabContainer);
    const cards = qsa('.academic-card[data-academic-category]', academicGrid);

    if (filterBtns.length === 0 || cards.length === 0) return;

    function applyAcademicFilter(selectedCategory) {
      filterBtns.forEach((btn) => {
        const isMatch = btn.getAttribute('data-academic-filter') === selectedCategory;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-selected', String(isMatch));
      });

      cards.forEach((card) => {
        const cardCat = card.getAttribute('data-academic-category');
        const shouldShow = selectedCategory === 'all' || cardCat === selectedCategory;
        card.hidden = !shouldShow;
        card.classList.toggle('is-hidden', !shouldShow);
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-academic-filter') || 'all';
        applyAcademicFilter(category);
      });
    });

    attachTablistKeyboardSupport(filterBtns);
  }

  /**
   * --------------------------------------------------------------------------
   * 5. NOTICES CATEGORY FILTER & LIVE KEYWORD SEARCH (#notices)
   * --------------------------------------------------------------------------
   */
  function initNoticesFilterAndSearch() {
    const filterContainer = qs('#notice-filter-buttons');
    const searchInput = qs('#notice-search-input');
    const noticesList = qs('#notices-list');
    const emptyState = qs('#notices-empty-state');
    const resetBtn = qs('#reset-notice-filters');

    if (!noticesList) return;

    const filterBtns = filterContainer
      ? qsa('.filter-tab[data-notice-filter]', filterContainer)
      : [];
    const noticeCards = qsa('.notice-card[data-notice-category]', noticesList);

    let activeCategory = 'all';
    let searchQuery = '';

    function updateNoticesView() {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      let visibleCount = 0;

      noticeCards.forEach((card) => {
        const category = card.getAttribute('data-notice-category') || '';
        const textContent = (card.textContent || '').toLowerCase();

        const matchesCategory = activeCategory === 'all' || category === activeCategory;
        const matchesSearch = !normalizedQuery || textContent.includes(normalizedQuery);
        const isVisible = matchesCategory && matchesSearch;

        card.hidden = !isVisible;
        card.classList.toggle('is-hidden', !isVisible);

        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-notice-filter') || 'all';

        filterBtns.forEach((tab) => {
          const isSelected = tab === btn;
          tab.classList.toggle('is-active', isSelected);
          tab.setAttribute('aria-selected', String(isSelected));
        });

        updateNoticesView();
      });
    });

    attachTablistKeyboardSupport(filterBtns);

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        searchQuery = event.target.value || '';
        updateNoticesView();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        activeCategory = 'all';
        searchQuery = '';

        if (searchInput) {
          searchInput.value = '';
        }

        filterBtns.forEach((tab) => {
          const isAll = tab.getAttribute('data-notice-filter') === 'all';
          tab.classList.toggle('is-active', isAll);
          tab.setAttribute('aria-selected', String(isAll));
        });

        updateNoticesView();
        if (searchInput) searchInput.focus();
      });
    }
  }

  /**
   * --------------------------------------------------------------------------
   * 6. PHOTO GALLERY FILTER & ACCESSIBLE LIGHTBOX MODAL (#gallery)
   * --------------------------------------------------------------------------
   */
  function initGalleryAndLightbox() {
    const filterContainer = qs('#gallery-filter-buttons');
    const galleryGrid = qs('#gallery-grid');
    const lightbox = qs('#gallery-lightbox');
    const lightboxImg = qs('#lightbox-image');
    const lightboxCaption = qs('#lightbox-caption');
    const lightboxCloseBtn = qs('#lightbox-close-btn');
    const lightboxBackdrop = qs('[data-lightbox-close="true"]', lightbox || document);

    if (!galleryGrid) return;

    const filterBtns = filterContainer
      ? qsa('.filter-tab[data-gallery-filter]', filterContainer)
      : [];
    const galleryItems = qsa('.gallery-item[data-gallery-category]', galleryGrid);
    const triggers = qsa('.gallery-item__trigger[data-lightbox-src]', galleryGrid);

    // 6A. Category Filtering
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedCat = btn.getAttribute('data-gallery-filter') || 'all';

        filterBtns.forEach((tab) => {
          const isSelected = tab === btn;
          tab.classList.toggle('is-active', isSelected);
          tab.setAttribute('aria-selected', String(isSelected));
        });

        galleryItems.forEach((item) => {
          const itemCat = item.getAttribute('data-gallery-category');
          const shouldShow = selectedCat === 'all' || itemCat === selectedCat;
          item.hidden = !shouldShow;
          item.classList.toggle('is-hidden', !shouldShow);
        });
      });
    });

    attachTablistKeyboardSupport(filterBtns);

    // 6B. Accessible Lightbox Preview
    if (!lightbox || !lightboxImg || !lightboxCaption) return;

    let lastFocusedTrigger = null;

    function openLightbox(triggerEl) {
      const highResSrc = triggerEl.getAttribute('data-lightbox-src');
      const captionText = triggerEl.getAttribute('data-lightbox-caption') || '';
      const thumbImg = qs('img', triggerEl);
      const altText = thumbImg ? thumbImg.getAttribute('alt') || captionText : captionText;

      if (!highResSrc) return;

      lastFocusedTrigger = triggerEl;
      lightboxImg.setAttribute('src', highResSrc);
      lightboxImg.setAttribute('alt', altText);
      lightboxCaption.textContent = captionText;

      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');

      if (lightboxCloseBtn) {
        lightboxCloseBtn.focus();
      }
    }

    function closeLightbox() {
      if (lightbox.hidden) return;

      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.setAttribute('src', '');
      document.body.classList.remove('no-scroll');

      if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
        lastFocusedTrigger.focus();
      }
    }

    triggers.forEach((triggerEl) => {
      triggerEl.addEventListener('click', () => openLightbox(triggerEl));
    });

    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener('click', closeLightbox);
    }

    if (lightboxBackdrop) {
      lightboxBackdrop.addEventListener('click', closeLightbox);
    }

    document.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === 'Tab' && lightboxCloseBtn) {
        // Keep keyboard focus trapped inside modal while open
        event.preventDefault();
        lightboxCloseBtn.focus();
      }
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 7. ADMISSION ENQUIRY FORM CLIENT-SIDE VALIDATION (#admissions)
   * Note: Validates inputs & stores demo record in browser localStorage.
   * Real database/backend submission will be integrated in Stage 6.
   * --------------------------------------------------------------------------
   */
    function initAdmissionForm() {
    const form = qs('#admission-enquiry-form');
    const statusBox = qs('#enquiry-form-status');
    const submitBtn = qs('#enquiry-submit-btn');

    if (!form) return;

    const fields = {
      studentName: {
        input: qs('#student-name', form ),
        error: qs('#student-name-error', form),
        validate(val) {
          if (!val) return 'Please enter the student’s full name.';
          if (val.length < 2) return 'Student name must be at least 2 characters.';
          if (!/^[a-zA-Z\s.'-]+$/.test(val)) {
            return 'Name should contain only letters and spaces.';
          }
          return '';
        },
      },
      parentName: {
        input: qs('#parent-name', form),
        error: qs('#parent-name-error', form),
        validate(val) {
          if (!val) return 'Please enter the parent or guardian name.';
          if (val.length < 2) return 'Parent/guardian name must be at least 2 characters.';
          if (!/^[a-zA-Z\s.'-]+$/.test(val)) {
            return 'Name should contain only letters and spaces.';
          }
          return '';
        },
      },
      parentPhone: {
        input: qs('#parent-phone', form),
        error: qs('#parent-phone-error', form),
        validate(val) {
          const cleaned = val.replace(/\s+/g, '');
          if (!cleaned) return 'Please enter a 10-digit mobile number.';
          if (!/^[6-9]\d{9}$/.test(cleaned)) {
            return 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
          }
          return '';
        },
      },
      parentEmail: {
        input: qs('#parent-email', form),
        error: qs('#parent-email-error', form),
        validate(val) {
          if (!val) return ''; // Optional field
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
          if (!emailPattern.test(val)) {
            return 'Please enter a valid email address (e.g. parent@example.com).';
          }
          return '';
        },
      },
      applyingClass: {
        input: qs('#applying-class', form),
        error: qs('#applying-class-error', form),
        validate(val) {
          if (!val) return 'Please select the class you are applying for.';
          return '';
        },
      },
      consent: {
        input: qs('#consent-checkbox', form),
        error: qs('#consent-error', form),
        validate(_val, inputEl) {
          if (!inputEl || !inputEl.checked) {
            return 'Please check the consent box to proceed with your admission enquiry.';
          }
          return '';
        },
      },
    };

    function setFieldValidity(fieldObj, errorMessage) {
      if (!fieldObj || !fieldObj.input) return true;

      const isInvalid = Boolean(errorMessage);
      fieldObj.input.classList.toggle('is-invalid', isInvalid);
      fieldObj.input.setAttribute('aria-invalid', String(isInvalid));

      if (fieldObj.error) {
        fieldObj.error.textContent = errorMessage;
      }

      return !isInvalid;
    }

    function validateSingleField(key) {
      const fieldObj = fields[key];
      if (!fieldObj || !fieldObj.input) return true;
      const rawVal = (fieldObj.input.value || '').trim();
      const errorMsg = fieldObj.validate(rawVal, fieldObj.input);
      return setFieldValidity(fieldObj, errorMsg);
    }

    function showStatusBanner(type, message) {
      if (!statusBox) return;
      statusBox.className = 'form-status';
      if (type === 'success') statusBox.classList.add('form-status--success');
      if (type === 'error') statusBox.classList.add('form-status--error');
      if (type === 'loading') statusBox.classList.add('form-status--loading');

      statusBox.textContent = message;
      statusBox.hidden = false;
    }

    function hideStatusBanner() {
      if (!statusBox) return;
      statusBox.hidden = true;
      statusBox.textContent = '';
    }

    // Sanitize phone input to digits only and attach live validation listeners
    if (fields.parentPhone.input) {
      fields.parentPhone.input.addEventListener('input', (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (e.target.value !== digitsOnly) {
          e.target.value = digitsOnly;
        }
      });
    }

    Object.keys(fields).forEach((key) => {
      const fieldObj = fields[key];
      if (!fieldObj.input) return;

      const eventType =
        fieldObj.input.type === 'checkbox' || fieldObj.input.tagName === 'SELECT'
          ? 'change'
          : 'blur';

      fieldObj.input.addEventListener(eventType, () => {
        validateSingleField(key);
      });

      fieldObj.input.addEventListener('input', () => {
        if (fieldObj.input.classList.contains('is-invalid')) {
          validateSingleField(key);
        }
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      hideStatusBanner();

      let isFormValid = true;
      let firstInvalidInput = null;

      Object.keys(fields).forEach((key) => {
        const valid = validateSingleField(key);
        if (!valid && !firstInvalidInput && fields[key].input) {
          isFormValid = false;
          firstInvalidInput = fields[key].input;
        } else if (!valid) {
          isFormValid = false;
        }
      });

      if (!isFormValid) {
        showStatusBanner(
          'error',
          'Please fix the highlighted fields below before submitting your enquiry.'
        );
        if (firstInvalidInput) {
          firstInvalidInput.focus();
        }
        return;
      }

      // Build validated enquiry payload (Prepared for Stage 6 Backend API)
      const transportInput = qs('#transport-required', form);
      const messageInput = qs('#enquiry-message', form);
      const demoRefId = `TVM-DEMO-${Date.now().toString().slice(-6)}`;

      const enquiryPayload = {
        referenceId: demoRefId,
        studentName: fields.studentName.input.value.trim(),
        parentName: fields.parentName.input.value.trim(),
        parentPhone: fields.parentPhone.input.value.trim(),
        parentEmail: fields.parentEmail.input ? fields.parentEmail.input.value.trim() : '',
        applyingClass: fields.applyingClass.input.value,
        transportRequired: transportInput ? transportInput.value : 'No',
        enquiryMessage: messageInput ? messageInput.value.trim() : '',
        submittedAt: new Date().toISOString(),
        mode: 'local-demo-stage-3',
      };

      // Disable submit button briefly to prevent double-taps
      const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit Admission Enquiry';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Validating Enquiry...';
      }

      showStatusBanner('loading', 'Validating details...');

      window.setTimeout(() => {
        // Safely store in browser localStorage for Stage 3-4 testing
        try {
          const existing = JSON.parse(localStorage.getItem('tvm_demo_enquiries') || '[]');
          existing.unshift(enquiryPayload);
          localStorage.setItem('tvm_demo_enquiries', JSON.stringify(existing.slice(0, 20)));
        } catch (_storageErr) {
          // Ignore storage errors if private browsing blocks localStorage
        }

        form.reset();
        Object.keys(fields).forEach((key) => setFieldValidity(fields[key], ''));

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }

        showStatusBanner(
          'success',
          `Demo Validation Successful (Ref: ${demoRefId}) for ${enquiryPayload.studentName} (${enquiryPayload.applyingClass}). Note: This enquiry is currently saved only in your browser for Stage 3 testing; real server database submission will be activated in Stage 6.`
        );

        if (statusBox) {
          statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 350);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 8. ACCESSIBLE FAQ ACCORDION (#faq)
   * --------------------------------------------------------------------------
   */
  function initFaqAccordion() {
    const faqContainer = qs('#faq-accordion');
    if (!faqContainer) return;

    const triggers = qsa('.faq-item__trigger', faqContainer);
    if (triggers.length === 0) return;

    function toggleFaq(targetBtn) {
      const isExpanded = targetBtn.getAttribute('aria-expanded') === 'true';
      const nextState = !isExpanded;

      // Close other open panels for clean single-open accordion experience
      triggers.forEach((btn) => {
        const panelId = btn.getAttribute('aria-controls');
        const panel = panelId ? qs(`#${panelId}`) : null;
        const shouldOpen = btn === targetBtn ? nextState : false;

        btn.setAttribute('aria-expanded', String(shouldOpen));
        if (panel) {
          panel.hidden = !shouldOpen;
        }
      });
    }

    triggers.forEach((btn, idx) => {
      btn.addEventListener('click', () => toggleFaq(btn));

      // Keyboard navigation between FAQ questions (Up/Down/Home/End)
      btn.addEventListener('keydown', (event) => {
        let targetIndex = null;

        if (event.key === 'ArrowDown') {
          targetIndex = (idx + 1) % triggers.length;
        } else if (event.key === 'ArrowUp') {
          targetIndex = (idx - 1 + triggers.length) % triggers.length;
        } else if (event.key === 'Home') {
          targetIndex = 0;
        } else if (event.key === 'End') {
          targetIndex = triggers.length - 1;
        }

        if (targetIndex !== null) {
          event.preventDefault();
          triggers[targetIndex].focus();
        }
      });
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 9. BACK-TO-TOP BUTTON & DYNAMIC FOOTER COPYRIGHT YEAR
   * --------------------------------------------------------------------------
   */
   function initUtilities() {
    const backToTopBtn = qs('#back-to-top-btn');
    const yearSpan = qs('#current-year');

    if (yearSpan) {
      yearSpan.textContent = String(new Date().getFullYear());
    }

    if (!backToTopBtn) return;

    function toggleBackToTop() {
      const scrollY = window.scrollY || window.pageYOffset;
      backToTopBtn.hidden = scrollY < 420;
    }

    window.addEventListener('scroll', toggleBackToTop, { passive: true });
    toggleBackToTop();

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });

      const skipLink = qs('.skip-link');
      const brandLink = qs('.brand');
      if (brandLink) {
        brandLink.focus({ preventScroll: true });
      } else if (skipLink) {
        skipLink.focus({ preventScroll: true });
      }
    });
  }

  /**
   * --------------------------------------------------------------------------
   * 10. INITIALIZE ALL MODULES ON DOM READY
   * --------------------------------------------------------------------------
   */
  function initApp() {
    initNavigation();
    initStatsCounter();
    initAcademicsFilter();
    initNoticesFilterAndSearch();
    initGalleryAndLightbox();
    initAdmissionForm();
    initFaqAccordion();
    initUtilities();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();


  /* === MOBILE OTP, OPTIONAL EMAIL OTP & ANTI-BOT CAPTCHA (Sequential Validation Fix) === */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('form');
    forms.forEach(function (form) {
      var studentNameInput = form.querySelector('input[name="studentName"], #student-name');
      var parentNameInput = form.querySelector('input[name="parentName"], #parent-name');
      var phoneInput = form.querySelector(
        'input[type="tel"], input[name*="phone" i], input[name*="mobile" i], input[id*="phone" i], input[id*="mobile" i]'
      );
      var emailInput = form.querySelector(
        'input[type="email"], input[name*="email" i], input[id*="email" i]'
      );
      var applyingClassSelect = form.querySelector('select[name="applyingClass"], #applying-class');
      var consentCheckbox = form.querySelector('input[name="consent"], #consent-checkbox');
      var submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type="button"])'
      );
      
      if (!phoneInput || !submitBtn) return;

      var isPhoneVerified = false;
      var generatedPhoneOTP = null;
      var isEmailVerified = false;
      var generatedEmailOTP = null;

      // 1. MOBILE OTP SETUP
      var phoneVerifyBox = document.createElement('div');
      phoneVerifyBox.className = 'verify-box';
      phoneVerifyBox.innerHTML =
        '<button type="button" class="btn-otp send-phone-otp">Send Mobile OTP</button>' +
        '<span class="verify-status phone-status">✓ Mobile Verified</span>' +
        '<div class="otp-input-wrap phone-otp-wrap">' +
        '<input type="text" class="otp-field phone-otp-input" placeholder="4-digit Mobile OTP dalein" maxlength="4">' +
        '<button type="button" class="btn-otp verify-phone-btn">Verify</button>' +
        '</div>';
      phoneInput.insertAdjacentElement('afterend', phoneVerifyBox);

      var sendPhoneBtn = phoneVerifyBox.querySelector('.send-phone-otp');
      var phoneStatus = phoneVerifyBox.querySelector('.phone-status');
      var phoneOtpWrap = phoneVerifyBox.querySelector('.phone-otp-wrap');
      var phoneOtpInput = phoneVerifyBox.querySelector('.phone-otp-input');
      var verifyPhoneBtn = phoneVerifyBox.querySelector('.verify-phone-btn');

      phoneInput.addEventListener('input', function () {
        isPhoneVerified = false;
        phoneStatus.classList.remove('is-verified');
        sendPhoneBtn.style.display = 'inline-block';
        sendPhoneBtn.textContent = 'Send Mobile OTP';
      });

      sendPhoneBtn.addEventListener('click', function () {
        var val = phoneInput.value.trim().replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(val) || /^(\d)\1{9}$/.test(val)) {
          alert('Please enter a valid 10-digit mobile number first!');
          phoneInput.focus();
          return;
        }
        generatedPhoneOTP = String(Math.floor(1000 + Math.random() * 9000));
        phoneOtpWrap.classList.add('is-active');
        sendPhoneBtn.textContent = 'Resend OTP';
        alert('Aapke Mobile Number (' + val + ') ka OTP hai: ' + generatedPhoneOTP);
      });

      verifyPhoneBtn.addEventListener('click', function () {
        if (phoneOtpInput.value.trim() === generatedPhoneOTP && generatedPhoneOTP !== null) {
          isPhoneVerified = true;
          phoneOtpWrap.classList.remove('is-active');
          sendPhoneBtn.style.display = 'none';
          phoneStatus.classList.add('is-verified');
        } else {
          alert('Incorrect mobile OTP! Please enter the correct OTP.');
        }
      });

      // 2. OPTIONAL EMAIL (GMAIL) OTP SETUP
      if (emailInput) {
        var emailVerifyBox = document.createElement('div');
        emailVerifyBox.className = 'verify-box';
        emailVerifyBox.style.display = 'none';
        emailVerifyBox.innerHTML =
          '<button type="button" class="btn-otp send-email-otp">Send Email OTP</button>' +
          '<span class="verify-status email-status">✓ Email Verified</span>' +
          '<div class="otp-input-wrap email-otp-wrap">' +
          '<input type="text" class="otp-field email-otp-input" placeholder="4-digit Email OTP dalein" maxlength="4">' +
          '<button type="button" class="btn-otp verify-email-btn">Verify</button>' +
          '</div>';
        emailInput.insertAdjacentElement('afterend', emailVerifyBox);

        var sendEmailBtn = emailVerifyBox.querySelector('.send-email-otp');
        var emailStatus = emailVerifyBox.querySelector('.email-status');
        var emailOtpWrap = emailVerifyBox.querySelector('.email-otp-wrap');
        var emailOtpInput = emailVerifyBox.querySelector('.email-otp-input');
        var verifyEmailBtn = emailVerifyBox.querySelector('.verify-email-btn');

        emailInput.addEventListener('input', function () {
          var val = emailInput.value.trim();
          isEmailVerified = false;
          emailStatus.classList.remove('is-verified');
          emailOtpWrap.classList.remove('is-active');
          sendEmailBtn.style.display = 'inline-block';
          sendEmailBtn.textContent = 'Send Email OTP';
          if (val.length > 0) {
            emailVerifyBox.style.display = 'flex';
          } else {
            emailVerifyBox.style.display = 'none';
          }
        });

        sendEmailBtn.addEventListener('click', function () {
          var val = emailInput.value.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            alert('Kripya sahi Email ID dalein!');
            emailInput.focus();
            return;
          }
          generatedEmailOTP = String(Math.floor(1000 + Math.random() * 9000));
          emailOtpWrap.classList.add('is-active');
          sendEmailBtn.textContent = 'Resend OTP';
          alert('The OTP for your email ID (' + val + ') is: ' + generatedEmailOTP);
        });

        verifyEmailBtn.addEventListener('click', function () {
          if (emailOtpInput.value.trim() === generatedEmailOTP && generatedEmailOTP !== null) {
            isEmailVerified = true;
            emailOtpWrap.classList.remove('is-active');
            sendEmailBtn.style.display = 'none';
            emailStatus.classList.add('is-verified');
          } else {
            alert('Incorrect email OTP! Please enter the correct OTP.');
          }
        });
      }

      // 3. ANTI-BOT CAPTCHA SETUP
      var currentCaptcha = '';
      var captchaContainer = document.createElement('div');
      captchaContainer.className = 'captcha-container';
      captchaContainer.innerHTML =
        '<div class="captcha-header">' +
        '<span class="captcha-code-box"></span>' +
        '<button type="button" class="btn-refresh-captcha" title="Naya Code">🔄</button>' +
        '</div>' +
        '<input type="text" class="otp-field captcha-input" placeholder="Upar likha Captcha code dalein" required>';
      submitBtn.insertAdjacentElement('beforebegin', captchaContainer);

      var captchaBox = captchaContainer.querySelector('.captcha-code-box');
      var refreshCaptchaBtn = captchaContainer.querySelector('.btn-refresh-captcha');
      var captchaInput = captchaContainer.querySelector('.captcha-input');

      function generateCaptcha() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        currentCaptcha = code;
        captchaBox.textContent = code;
        captchaInput.value = '';
      }
      refreshCaptchaBtn.addEventListener('click', generateCaptcha);
      generateCaptcha();

      // 4. SEQUENTIAL SUBMISSION & VALIDATION LOGIC
      form.addEventListener(
        'submit',
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();

          // Step 1: Student Name Check
          if (studentNameInput && studentNameInput.value.trim() === '') {
            alert("Please enter the Student's Full Name!");
            studentNameInput.focus();
            return;
          }

          // Step 2: Mobile Number Check
          if (phoneInput && phoneInput.value.trim() === '') {
            alert('Please enter the 10-Digit Mobile Number!');
            phoneInput.focus();
            return;
          }

          // Step 3: Mobile OTP Check
          if (!isPhoneVerified) {
            alert('Please verify your mobile number with OTP first!');
            phoneInput.focus();
            return;
          }

          // Step 4: Class Applying For Check
          if (applyingClassSelect && applyingClassSelect.value === '') {
            alert('Please select the Class Applying For!');
            applyingClassSelect.focus();
            return;
          }

          // Step 5: Parent / Guardian Name Check
          if (parentNameInput && parentNameInput.value.trim() === '') {
            alert('Please enter the Parent / Guardian Name!');
            parentNameInput.focus();
            return;
          }

          // Step 6: Email OTP Check (agar email daali hai to)
          if (emailInput && emailInput.value.trim().length > 0 && !isEmailVerified) {
            alert('Please verify your Email ID with OTP or leave it blank!');
            emailInput.focus();
            return;
          }

          // Step 7: Consent Checkbox Check
          if (consentCheckbox && !consentCheckbox.checked) {
            alert('Please check the consent box to proceed with your admission enquiry.');
            consentCheckbox.focus();
            return;
          }

          // Step 8: Captcha Verification Check
          if (captchaInput.value.trim().toUpperCase() !== currentCaptcha) {
            alert('Incorrect CAPTCHA code! Please enter the correct code.');
            generateCaptcha();
            captchaInput.focus();
            return;
          }

          // Form data prepare karna
          var formData = {
            _subject: 'New Website Inquiry / Admission Form - Takshashila Vidya Mandir',
            _template: 'table',
            _captcha: 'false'
          };
          var elements = form.querySelectorAll('input, select, textarea');
          elements.forEach(function (el, index) {
            if (
              el.classList.contains('otp-field') ||
              el.type === 'submit' ||
              el.type === 'button' ||
              el.type === 'hidden'
            ) {
              return;
            }
            var labelText = '';
            if (el.id) {
              var labelEl = form.querySelector('label[for="' + el.id + '"]');
              if (labelEl) labelText = labelEl.textContent.replace('*', '').trim();
            }
            if (!labelText && el.closest('label')) {
              labelText = el.closest('label').textContent.replace('*', '').trim();
            }
            if (!labelText) {
              labelText = el.name || el.placeholder || 'Field ' + (index + 1);
            }
            formData[labelText] = el.value.trim() || 'Not Filled';
          });
          
          formData['Mobile Verification Status'] = '✓ OTP Verified';
          formData['Email Verification Status'] =
            emailInput && emailInput.value.trim().length > 0
              ? '✓ OTP Verified'
              : 'Not Provided';
          formData['Submitted Date & Time'] = new Date().toLocaleString('en-IN');

                    // 1. Submitting State (Spinner + Disabled)
          var originalClasses = submitBtn.className;
          var originalText = submitBtn.innerHTML;

          submitBtn.disabled = true;
          submitBtn.className = originalClasses + ' btn--submitting';
          submitBtn.innerHTML = '<span class="btn-spinner"></span>Submitting...';

          // Send details via FormSubmit AJAX
          fetch('https://formsubmit.co/ajax/rohitsinghrajput.08.04@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify(formData)
          })
            .then(function (response) {
              return response.json();
            })
            .then(function (data) {
              // 2. Success State (Green Button + Checkmark)
              submitBtn.className = originalClasses + ' btn--success-state';
              submitBtn.innerHTML = '&#10003; Enquiry Submitted!';

              // Form fields aur OTP state reset karna
              form.reset();
              generateCaptcha();
              isPhoneVerified = false;
              phoneStatus.classList.remove('is-verified');
              sendPhoneBtn.style.display = 'inline-block';
              sendPhoneBtn.textContent = 'Send Mobile OTP';
              if (emailInput) {
                isEmailVerified = false;
                emailStatus.classList.remove('is-verified');
                emailVerifyBox.style.display = 'none';
              }

              // 4 second baad button ko wapas normal state me lana
              setTimeout(function () {
                submitBtn.disabled = false;
                submitBtn.className = originalClasses;
                submitBtn.innerHTML = originalText;
              }, 4000);
            })
            .catch(function (error) {
              // 3. Error State (Outline Red + Try Again)
              submitBtn.disabled = false;
              submitBtn.className = originalClasses + ' btn--error-state';
              submitBtn.innerHTML = 'Try Again';
            });
        },
        true
      );
    });
  });
})();
