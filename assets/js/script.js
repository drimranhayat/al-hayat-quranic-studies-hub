(function () {
  'use strict';
  const basePath = window.ALHAYAT_BASE_PATH || '';
  const topics = window.ALHAYAT_TOPICS || [];
  const categories = window.ALHAYAT_CATEGORIES || [];
  const groups = window.ALHAYAT_MENU_GROUPS || [];
  const contentLabels = {'Notes':'نوٹس','MCQs':'MCQs','Short Q&A':'مختصر سوالات','One-Line Answers':'ایک سطری جوابات','Mini Test':'منی ٹیسٹ','Study Tool':'مطالعہ ٹول'};
  const levelLabels = {Beginner:'ابتدائی', Intermediate:'درمیانی', Advanced:'اعلیٰ'};
  const escapeHTML = value => String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const url = path => basePath + path;
  function topicCard(topic) {
    const badges = topic.contentType.map(type => `<span class="mini-badge">${escapeHTML(contentLabels[type] || type)}</span>`).join('');
    return `<article class="topic-card" data-card-topic><a href="${escapeHTML(url(topic.url))}"><span class="card-kicker">${escapeHTML(topic.subcategory)}</span><h3>${escapeHTML(topic.titleUrdu)}</h3><p>${escapeHTML(topic.category)} کا منظم سبق، مشق اور تکرار کا مکمل سانچہ۔</p><div class="card-meta"><span class="level-badge">${escapeHTML(levelLabels[topic.level] || topic.level)}</span>${badges}</div></a></article>`;
  }
  function buildMegaPanels() {
    document.querySelectorAll('[data-mega-panel]').forEach(panel => {
      const group = groups.find(item => item.key === panel.getAttribute('data-mega-panel'));
      if (!group) return;
      panel.innerHTML = `<div class="mega-grid">${group.folders.map(folder => {
        const cat = categories.find(item => item.folder === folder);
        if (!cat) return '';
        const bySub = topics.filter(topic => topic.folder === folder).reduce((acc, topic) => { (acc[topic.subcategory] ||= []).push(topic); return acc; }, {});
        const lists = Object.keys(bySub).map(sub => `<div class="mega-subgroup"><strong>${escapeHTML(sub)}</strong><ul>${bySub[sub].map(topic => `<li><a href="${escapeHTML(url(topic.url))}">${escapeHTML(topic.titleUrdu)}</a></li>`).join('')}</ul></div>`).join('');
        return `<section class="mega-column"><h3><a href="${escapeHTML(url(cat.url))}">${escapeHTML(cat.titleUrdu)}</a></h3>${lists}</section>`;
      }).join('')}</div>`;
    });
  }
  function setupNavigation() {
    const body = document.body;
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) mobileToggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      mobileToggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.mega-trigger').forEach(trigger => {
      const item = trigger.closest('.has-mega');
      trigger.addEventListener('click', event => {
        event.preventDefault();
        const open = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(open));
        document.querySelectorAll('.has-mega').forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open');
            const otherTrigger = other.querySelector('.mega-trigger');
            if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          }
        });
      });
      trigger.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          item.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.has-mega')) {
        document.querySelectorAll('.has-mega').forEach(item => {
          item.classList.remove('is-open');
          const trigger = item.querySelector('.mega-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }
  function setupTopicBrowsers() {
    document.querySelectorAll('[data-topic-browser]').forEach(browser => {
      const search = browser.querySelector('.topic-search-input');
      const categorySelect = browser.querySelector('.topic-category-filter');
      const subSelect = browser.querySelector('.topic-subcategory-filter');
      const contentSelect = browser.querySelector('.topic-content-filter');
      const levelSelect = browser.querySelector('.topic-level-filter');
      const results = browser.querySelector('[data-topic-results]');
      const summary = browser.querySelector('[data-result-summary]');
      const defaultFolder = browser.getAttribute('data-default-folder') || '';
      const limit = Number(browser.getAttribute('data-limit') || 0);
      const params = new URLSearchParams(location.search);
      if (params.get('q') && search) search.value = params.get('q');
      if (defaultFolder && categorySelect) {
        const cat = categories.find(item => item.folder === defaultFolder);
        if (cat) categorySelect.value = cat.titleUrdu;
      }
      function refreshSubcategories() {
        if (!subSelect) return;
        const category = categorySelect ? categorySelect.value : '';
        const relevant = topics.filter(topic => (!defaultFolder || topic.folder === defaultFolder) && (!category || topic.category === category));
        const current = subSelect.value;
        const subs = Array.from(new Set(relevant.map(topic => topic.subcategory))).sort();
        subSelect.innerHTML = '<option value="">تمام ذیلی ابواب</option>' + subs.map(sub => `<option value="${escapeHTML(sub)}">${escapeHTML(sub)}</option>`).join('');
        if (subs.includes(current)) subSelect.value = current;
      }
      function render() {
        const q = (search ? search.value : '').trim().toLowerCase();
        const category = categorySelect ? categorySelect.value : '';
        const sub = subSelect ? subSelect.value : '';
        const content = contentSelect ? contentSelect.value : '';
        const level = levelSelect ? levelSelect.value : '';
        let filtered = topics.filter(topic => {
          if (defaultFolder && topic.folder !== defaultFolder) return false;
          if (category && topic.category !== category) return false;
          if (sub && topic.subcategory !== sub) return false;
          if (content && !topic.contentType.includes(content)) return false;
          if (level && topic.level !== level) return false;
          if (q) {
            const haystack = [topic.titleUrdu, topic.rawTitle, topic.category, topic.subcategory, ...(topic.keywords || [])].join(' ').toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        });
        const total = filtered.length;
        if (limit) filtered = filtered.slice(0, limit);
        if (summary) summary.textContent = `${total} موضوعات دستیاب ہیں`;
        if (results) results.innerHTML = filtered.map(topicCard).join('') || '<p class="muted">کوئی موضوع نہیں ملا۔</p>';
      }
      [search, categorySelect, subSelect, contentSelect, levelSelect].forEach(control => {
        if (control) control.addEventListener('input', () => { refreshSubcategories(); render(); });
      });
      refreshSubcategories();
      render();
    });
  }
  function setupGlobalSearch() {
    document.querySelectorAll('.global-search').forEach(form => {
      form.addEventListener('submit', event => {
        const input = form.querySelector('input[type="search"]');
        const q = input ? input.value.trim() : '';
        const browser = document.querySelector('[data-topic-browser]');
        if (browser && q) {
          event.preventDefault();
          const localInput = browser.querySelector('.topic-search-input');
          if (localInput) {
            localInput.value = q;
            localInput.dispatchEvent(new Event('input', { bubbles: true }));
            browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  }
  function setupAudio() {
    let context = null;
    let interacted = false;
    const toggle = document.querySelector('.sound-toggle');
    let enabled = localStorage.getItem('alhayatSound') !== 'off';
    function updateToggle() {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.textContent = enabled ? 'آواز بند' : 'آواز چالو';
    }
    function ensureContext() {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume();
      return context;
    }
    function tone(kind) {
      if (!enabled || !interacted || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const audio = ensureContext();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = kind === 'hover' ? 520 : 660;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === 'hover' ? 0.018 : 0.028, audio.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.1);
    }
    document.addEventListener('pointerdown', () => { interacted = true; }, { once: true });
    if (toggle) toggle.addEventListener('click', () => {
      interacted = true;
      enabled = !enabled;
      localStorage.setItem('alhayatSound', enabled ? 'on' : 'off');
      updateToggle();
      tone('click');
    });
    document.addEventListener('mouseover', event => { if (event.target.closest('.btn, .topic-card, .practice-card, .nav-link, .subcategory-card')) tone('hover'); });
    document.addEventListener('click', event => { if (event.target.closest('button, a, .topic-card')) tone('click'); });
    updateToggle();
  }
  function setupTheme() {
    const toggle = document.querySelector('.theme-toggle');
    if (localStorage.getItem('alhayatTheme') === 'dark') document.body.classList.add('dark-mode');
    function update() {
      if (!toggle) return;
      const dark = document.body.classList.contains('dark-mode');
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.textContent = dark ? 'روشن' : 'گہرا';
    }
    if (toggle) toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('alhayatTheme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
      update();
    });
    update();
  }
  function setupBackToTop() {
    const button = document.getElementById('backToTop');
    if (!button) return;
    window.addEventListener('scroll', () => button.classList.toggle('is-visible', window.scrollY > 500), { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  function setupAnswersAndQuizzes() {
    document.addEventListener('click', event => {
      const answerButton = event.target.closest('.answer-toggle');
      if (!answerButton) return;
      const panel = answerButton.parentElement.querySelector('.answer-panel');
      if (!panel) return;
      const hidden = panel.hasAttribute('hidden');
      if (hidden) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      answerButton.textContent = hidden ? 'جواب چھپائیں' : 'جواب دکھائیں';
    });
    document.querySelectorAll('[data-quiz]').forEach(widget => {
      const cards = Array.from(widget.querySelectorAll('[data-quiz-card]'));
      const current = widget.querySelector('[data-quiz-current]');
      const total = widget.querySelector('[data-quiz-total]');
      const next = widget.querySelector('.quiz-next');
      const restart = widget.querySelector('.quiz-restart');
      let index = 0;
      if (total) total.textContent = String(cards.length);
      function show() {
        cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
        if (current) current.textContent = String(index + 1);
      }
      if (next) next.addEventListener('click', () => { index = (index + 1) % cards.length; show(); });
      if (restart) restart.addEventListener('click', () => { index = 0; show(); });
      show();
    });
  }
  buildMegaPanels();
  setupNavigation();
  setupTopicBrowsers();
  setupGlobalSearch();
  setupAudio();
  setupTheme();
  setupBackToTop();
  setupAnswersAndQuizzes();
})();
