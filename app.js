/* -------------------------------------------------------------
 * HayotBank - Interactive Web Interactions (app.js)
 * ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Translations will be loaded from external JSON files under /i18n
  let translations = {};

  let currentLang = localStorage.getItem('lang') || 'uz';

  function updateLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    // Scan all data-translate elements
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      if (translations[lang][key]) {
        el.innerHTML = translations[lang][key];
      }
    });

    // Scan all placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
      const key = el.getAttribute('data-translate-placeholder');
      if (translations[lang][key]) {
        el.placeholder = translations[lang][key];
      }
    });

    // Scan all aria labels
    document.querySelectorAll('[data-translate-aria]').forEach(el => {
      const key = el.getAttribute('data-translate-aria');
      if (translations[lang]?.[key]) {
        el.setAttribute('aria-label', translations[lang][key]);
      }
    });

    // Refresh card holder default and preview on language change
    refreshCardHolderDefaults(lang);

    // Re-run calculator labels update
    if (typeof setupCalculator === 'function') {
      setupCalculator();
    }
  }

  // Bind dropdown event
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      localStorage.setItem('lang', selectedLang);
      updateLanguage(selectedLang);
    });
  }




  // Load external translations (i18n/uz.json, i18n/ru.json)
  async function loadTranslations() {
    try {
      const [uzRes, ruRes] = await Promise.all([
        fetch('i18n/uz.json'),
        fetch('i18n/ru.json')
      ]);
      if (!uzRes.ok || !ruRes.ok) throw new Error('Failed to fetch i18n files');
      const uz = await uzRes.json();
      const ru = await ruRes.json();
      translations = { uz, ru };
    } catch (err) {
      console.error('Failed to load translations:', err);
    }
  }


  // ==========================================
  // Navigation & Header Effects
  // ==========================================
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Sticky header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Dynamic active nav links on scroll
    let current = '';
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= (sectionTop - 150)) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').slice(1) === current) {
        link.classList.add('active');
      }
    });
  });

  // Mobile menu toggle burger click
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close mobile menu on navlink click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });


  // ==========================================
  // 3D Card Parallax Mouse Tilt (clean, SOLID/DRY)
  // ==========================================
  (function() {
    const wrapper = document.getElementById('card-3d-wrapper');
    const card = document.getElementById('card-3d');

    if (!wrapper || !card) return;

    class Card3D {
      constructor(wrapperEl, cardEl, options = {}) {
        this.wrapper = wrapperEl;
        this.card = cardEl;
        this.maxTilt = options.maxTilt ?? 15; // degrees per axis (half-range)
        this.transitionDuration = options.transitionDuration ?? 500; // ms
        this.pointer = { x: 0, y: 0 };
        this.dimensions = null;
        this.rafId = null;

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onEnter = this.onEnter.bind(this);
        this.onLeave = this.onLeave.bind(this);
        this.onResize = this.onResize.bind(this);
        this.update = this.update.bind(this);
      }

      init() {
        this.wrapper.addEventListener('mousemove', this.onMouseMove);
        this.wrapper.addEventListener('mouseenter', this.onEnter);
        this.wrapper.addEventListener('mouseleave', this.onLeave);
        window.addEventListener('resize', this.onResize);
      }

      destroy() {
        this.wrapper.removeEventListener('mousemove', this.onMouseMove);
        this.wrapper.removeEventListener('mouseenter', this.onEnter);
        this.wrapper.removeEventListener('mouseleave', this.onLeave);
        window.removeEventListener('resize', this.onResize);
        if (this.rafId) cancelAnimationFrame(this.rafId);
      }

      ensureDimensions() {
        this.dimensions = this.wrapper.getBoundingClientRect();
      }

      onResize() {
        // update cached rect on resize
        this.ensureDimensions();
      }

      onEnter() {
        this.ensureDimensions();
        this.card.style.transition = 'none';
      }

      onLeave() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.card.style.transition = `transform ${this.transitionDuration}ms ease`;
        this.card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        // reset glow to center
        this.card.style.setProperty('--mouse-x', '50%');
        this.card.style.setProperty('--mouse-y', '50%');
      }

      onMouseMove(e) {
        if (!this.dimensions) this.ensureDimensions();
        const rect = this.dimensions;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.pointer.x = x;
        this.pointer.y = y;
        this.pointer.width = rect.width;
        this.pointer.height = rect.height;

        if (!this.rafId) this.rafId = requestAnimationFrame(this.update);
      }

      update() {
        this.rafId = null;
        const { x, y, width, height } = this.pointer;
        if (!width || !height) return;

        const normX = (x / width) - 0.5; // -0.5 .. 0.5
        const normY = (y / height) - 0.5; // -0.5 .. 0.5

        const rotateX = -normY * this.maxTilt * 2; // full range +/- maxTilt*2
        const rotateY = normX * this.maxTilt * 2;

        this.card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const percentX = (x / width) * 100;
        const percentY = (y / height) * 100;
        this.card.style.setProperty('--mouse-x', `${percentX}%`);
        this.card.style.setProperty('--mouse-y', `${percentY}%`);
      }
    }

    // Initialize instance
    const card3dInstance = new Card3D(wrapper, card, { maxTilt: 15, transitionDuration: 500 });
    card3dInstance.init();
  })();


  // ==========================================
  // Card Customizer Logic
  // ==========================================
  const holderInput = document.getElementById('card-holder-input');
  const previewName = document.getElementById('preview-card-name');
  const colorDots = document.querySelectorAll('.color-dot');

  function getDefaultHolderName(lang = currentLang) {
    const translationName = translations[lang]?.default_card_holder_name;
    if (translationName) return translationName;
    return lang === 'uz' ? 'Javlonbek Abdullaev' : 'Жавлонбек Абдуллаев';
  }

  function updateHolderPreview() {
    if (!holderInput || !previewName) return;
    const inputValue = holderInput.value.trim();
    const defaultName = getDefaultHolderName();
    previewName.textContent = inputValue === '' ? defaultName.toUpperCase() : inputValue.toUpperCase();
  }

  function refreshCardHolderDefaults(lang = currentLang) {
    if (!holderInput || !previewName) return;
    const currentValue = holderInput.value.trim();
    const previousDefaultUz = getDefaultHolderName('uz');
    const previousDefaultRu = getDefaultHolderName('ru');
    if (
      currentValue === '' ||
      currentValue.toUpperCase() === previousDefaultUz.toUpperCase() ||
      currentValue.toUpperCase() === previousDefaultRu.toUpperCase()
    ) {
      holderInput.value = getDefaultHolderName(lang);
    }
    updateHolderPreview();
  }

  if (holderInput && previewName) {
    holderInput.value = getDefaultHolderName();
    updateHolderPreview();

    holderInput.addEventListener('input', () => {
      updateHolderPreview();
    });
  }

  // Card theme dots switcher
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      // Set active dot
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      // Update card theme class
      const themeColor = dot.getAttribute('data-color');
      card3d.className = 'card-3d'; // reset
      card3d.classList.add(themeColor);
    });
  });


  // ==========================================
  // Dual-mode Loan/Deposit Calculator
  // ==========================================
  const calcTabs = document.querySelectorAll('.calc-tab');
  const amountInput = document.getElementById('calc-amount');
  const durationInput = document.getElementById('calc-duration');
  const amountLabel = document.getElementById('amount-label-text');
  const amountValueText = document.getElementById('amount-value-display');
  const durationValueText = document.getElementById('duration-value-display');
  const rateDisplay = document.getElementById('rate-display');
  const totalReturnLabel = document.getElementById('total-return-label-text');
  const totalReturnDisplay = document.getElementById('total-return-display');
  const paymentLabel = document.getElementById('payment-label-text');
  const monthlyPaymentDisplay = document.getElementById('monthly-payment-display');

  let calcMode = 'loan'; // 'loan' or 'deposit'

  // Format currency helpers
  function formatMoney(num) {
    return new Intl.NumberFormat('uz-UZ').format(num) + ' UZS';
  }

  // Define limits & defaults (localized dynamic parameters)
  const calcConfigs = {
    loan: {
      minAmount: 1000000,
      maxAmount: 150000000,
      amountStep: 1000000,
      amountDefault: 30000000,
      minDuration: 3,
      maxDuration: 36,
      durationStep: 1,
      durationDefault: 12,
      rate: 22, // 22% annual
      labels: {
        uz: {
          amountLabel: 'Kredit miqdori',
          paymentLabel: 'Oylik to\'lov',
          totalReturnLabel: 'Umumiy qaytariladigan mablag\'',
          month: 'oy'
        },
        ru: {
          amountLabel: 'Сумма кредита',
          paymentLabel: 'Ежемесячный платеж',
          totalReturnLabel: 'Общая сумма к возврату',
          month: 'мес.'
        }
      }
    },
    deposit: {
      minAmount: 500000,
      maxAmount: 300000000,
      amountStep: 1000000,
      amountDefault: 50000000,
      minDuration: 3,
      maxDuration: 24,
      durationStep: 1,
      durationDefault: 12,
      rate: 24, // 24% annual
      labels: {
        uz: {
          amountLabel: 'Omonat miqdori',
          paymentLabel: 'Oylik daromad',
          totalReturnLabel: 'Jami mablag\'',
          month: 'oy'
        },
        ru: {
          amountLabel: 'Сумма вклада',
          paymentLabel: 'Ежемесячный доход',
          totalReturnLabel: 'Общая сумма накоплений',
          month: 'мес.'
        }
      }
    }
  };

  // Toggle mode tabs
  calcTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      calcTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      calcMode = tab.getAttribute('data-type');
      
      setupCalculator();
    });
  });

  // Apply configs to range inputs based on current mode
  window.setupCalculator = function() {
    const cfg = calcConfigs[calcMode];
    const labels = cfg.labels[currentLang];
    
    // Set ranges attributes
    amountInput.min = cfg.minAmount;
    amountInput.max = cfg.maxAmount;
    amountInput.step = cfg.amountStep;

    durationInput.min = cfg.minDuration;
    durationInput.max = cfg.maxDuration;
    durationInput.step = cfg.durationStep;

    // Update labels
    amountLabel.textContent = labels.amountLabel;
    paymentLabel.textContent = labels.paymentLabel;
    totalReturnLabel.textContent = labels.totalReturnLabel;
    rateDisplay.textContent = `${cfg.rate}%`;

    // Reset range limits descriptions in DOM
    const amountLimits = amountInput.nextElementSibling.querySelectorAll('span');
    amountLimits[0].textContent = formatMoney(cfg.minAmount);
    amountLimits[1].textContent = formatMoney(cfg.maxAmount);

    const durationLimits = durationInput.nextElementSibling.querySelectorAll('span');
    durationLimits[0].textContent = `${cfg.minDuration} ${labels.month}`;
    durationLimits[1].textContent = `${cfg.maxDuration} ${labels.month}`;

    calculateValues();
  };

  // Calculator Math formulas
  function calculateValues() {
    const amount = parseFloat(amountInput.value);
    const duration = parseInt(durationInput.value);
    const cfg = calcConfigs[calcMode];
    const labels = cfg.labels[currentLang];

    // Live slider values display
    amountValueText.textContent = formatMoney(amount);
    durationValueText.textContent = `${duration} ${labels.month}`;

    if (calcMode === 'loan') {
      // Flat Loan formula: Total Qaytarish = Principal + (Principal * AnnualRate * YearFraction)
      const annualRateFraction = cfg.rate / 100;
      const durationYears = duration / 12;
      const totalInterest = amount * annualRateFraction * durationYears;
      const totalPayback = amount + totalInterest;
      const monthlyPayment = totalPayback / duration;

      totalReturnDisplay.textContent = formatMoney(Math.round(totalPayback));
      monthlyPaymentDisplay.textContent = formatMoney(Math.round(monthlyPayment));
    } else {
      // Deposit formula (Simple Annual Interest paid monthly):
      // Monthly Profit = (Principal * AnnualRate / 12)
      const annualRateFraction = cfg.rate / 100;
      const totalProfit = amount * annualRateFraction * (duration / 12);
      const monthlyProfit = totalProfit / duration;

      totalReturnDisplay.textContent = formatMoney(Math.round(amount + totalProfit));
      monthlyPaymentDisplay.textContent = formatMoney(Math.round(monthlyProfit));
    }
  }

  if (amountInput && durationInput) {
    amountInput.addEventListener('input', calculateValues);
    durationInput.addEventListener('input', calculateValues);
    // Init default state
    setupCalculator();
  }


  // ==========================================
  // Currency Converter Logic
  // ==========================================
  const convAmount = document.getElementById('converter-amount');
  const convResult = document.getElementById('converter-result');
  const convFrom = document.getElementById('converter-from');
  const convTo = document.getElementById('converter-to');

  // Dynamic rates (matching table data)
  const buyRates = {
    USD: 12620,
    EUR: 13540,
    RUB: 138.5,
    GBP: 16050,
    UZS: 1
  };

  const sellRates = {
    USD: 12680,
    EUR: 13620,
    RUB: 144.5,
    GBP: 16180,
    UZS: 1
  };

  function updateConversion() {
    if (!convAmount || !convResult) return;

    const amount = parseFloat(convAmount.value) || 0;
    const from = convFrom.value;
    const to = convTo.value;

    if (from === to) {
      convResult.value = amount.toLocaleString('uz-UZ');
      return;
    }

    // Convert source to UZS base
    let valueInUZS = from === 'UZS' ? amount : amount * buyRates[from];

    // Convert UZS base to target
    let finalValue = to === 'UZS' ? valueInUZS : valueInUZS / sellRates[to];

    // Format output cleanly
    if (to === 'UZS') {
      convResult.value = Math.round(finalValue).toLocaleString('uz-UZ');
    } else {
      convResult.value = finalValue.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
  }

  if (convAmount && convFrom && convTo) {
    convAmount.addEventListener('input', updateConversion);
    convFrom.addEventListener('change', updateConversion);
    convTo.addEventListener('change', updateConversion);
    updateConversion();
  }


  // ==========================================
  // Live Currency Display Rotation (2s cycle)
  // ==========================================
  const liveRates = [
    { currency: 'USD', flag: 'img/flag-usa.svg', rate: '12,680' },
    { currency: 'EUR', flag: 'img/flag-eu.svg', rate: '13,620' },
    { currency: 'RUB', flag: 'img/flag-ru.svg', rate: '144.5' },
    { currency: 'GBP', flag: 'img/flag-uk.svg', rate: '16,180' }
  ];

  let currentRateIndex = 1;
  const ratesLiveBadge = document.getElementById('rates-live-badge');

  if (ratesLiveBadge) {
    const flagImg = ratesLiveBadge.querySelector('.currency-flag');
    const rateText = ratesLiveBadge.querySelector('.live-rate-text');

    function updateLiveRate() {
      ratesLiveBadge.style.opacity = '0';
      ratesLiveBadge.style.transform = 'translateY(-5px)';
      
      setTimeout(() => {
        const item = liveRates[currentRateIndex];
        if (flagImg) {
          flagImg.src = item.flag;
          flagImg.alt = item.currency;
        }
        if (rateText) {
          rateText.textContent = `${item.currency} / UZS: ${item.rate}`;
        }
        
        ratesLiveBadge.style.opacity = '1';
        ratesLiveBadge.style.transform = 'translateY(0)';
        currentRateIndex = (currentRateIndex + 1) % liveRates.length;
      }, 300);
    }

    ratesLiveBadge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Cycle every 2 seconds
    setInterval(updateLiveRate, 2000);
  }

  // ==========================================
  // Chat-Style Testimonials Sequential Entry
  // ==========================================
  const chatFeed = document.getElementById('chat-feed');
  const chatMessages = document.querySelectorAll('.chat-message');

  if (chatFeed && chatMessages.length > 0) {
    chatMessages.forEach(msg => {
      msg.style.opacity = '0';
      msg.style.transform = 'translateY(15px)';
      msg.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    const chatObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chatMessages.forEach((msg, idx) => {
            setTimeout(() => {
              msg.style.opacity = '1';
              msg.style.transform = 'translateY(0)';
            }, idx * 450);
          });
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15
    });

    chatObserver.observe(chatFeed);
  }


  // ==========================================
  // FAQ Accordion Expanding
  // ==========================================
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const answer = question.nextElementSibling;
      const isActive = faqItem.classList.contains('active');

      // Close all other items first
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Toggle current item
      if (!isActive) {
        faqItem.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });


  // ==========================================
  // Scroll Reveal Animations
  // ==========================================
  const reveals = document.querySelectorAll('.scroll-reveal');

  if ('IntersectionObserver' in window && reveals.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(reveal => {
      revealObserver.observe(reveal);
    });
  } else {
    reveals.forEach(reveal => reveal.classList.add('revealed'));
  }


  // ==========================================
  // Newsletter Subscribe Notification
  // ==========================================
  const subForm = document.querySelector('.subscribe-form');
  if (subForm) {
    subForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = translations[currentLang].subscribe_alert;
      alert(message);
      subForm.reset();
    });
  }

  // Load translations and initialize language-dependent UI
  await loadTranslations();
  updateLanguage(currentLang);
  if (typeof setupCalculator === 'function') setupCalculator();
  if (typeof updateConversion === 'function') updateConversion();

});
