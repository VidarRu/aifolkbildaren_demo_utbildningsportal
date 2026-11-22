/* AI i folkbibliotekets praktik – interaktion
   Utfällning, scrollanimationer, videospelare
   och bockar för uppgifterna med framstegsmätare och medalj. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Tema ─────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* privat läge */ }
    });
  }

  /* ── Ord-för-ord-animation i delarnas rubriker ──────────────────── */
  document.querySelectorAll('.part-title').forEach(function (title) {
    var i = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'w';
            span.style.setProperty('--i', i++);
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrap(child);
        }
      });
    })(title);
  });

  document.querySelectorAll('.stagger').forEach(function (el) {
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 10)); });
  });
  document.querySelectorAll('.flow, .bars, .bookshelf').forEach(function (el) {
    el.querySelectorAll(':scope > li, :scope > .bar, :scope > .book').forEach(function (c, i) { c.style.setProperty('--i', i); });
  });

  /* ── Scrollanimationer ──────────────────────────────────────────── */
  var revealSel = '[data-reveal], .stagger, .part-head, .flow, .bars, .bookshelf, .timeline, [data-count]';
  function startReveals() {
    var revealEls = document.querySelectorAll(revealSel);
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          if (e.target.hasAttribute('data-count')) countUp(e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  /* ── Utfällbara rutor ──────────────────────────────────────────── */
  function setOpen(acc, open) {
    var btn = acc.querySelector(':scope > .acc-btn');
    acc.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  document.querySelectorAll('.acc').forEach(function (acc) {
    var btn = acc.querySelector(':scope > .acc-btn');
    if (!btn) return;
    setOpen(acc, acc.hasAttribute('data-open'));
    btn.addEventListener('click', function () {
      var opening = !acc.classList.contains('open');
      var grid = acc.parentElement && acc.parentElement.classList.contains('acc-grid') ? acc.parentElement : null;
      // I ett rutnät är en ruta öppen åt gången; den öppnade brer ut sig över hela raden
      if (grid && opening) {
        Array.prototype.forEach.call(grid.children, function (sib) { if (sib !== acc && sib.classList.contains('open')) setOpen(sib, false); });
      }
      if (grid && opening) {
        var content = acc.querySelector('.acc-content');
        if (content) content.classList.toggle('cols', content.textContent.trim().length > 650);
      }
      setOpen(acc, opening);
      if (grid && opening) {
        requestAnimationFrame(function () {
          var r = acc.getBoundingClientRect();
          var navH = 80;
          if (r.top < navH || r.top > window.innerHeight * 0.7) {
            window.scrollBy({ top: r.top - navH - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
          }
        });
      }
    });
  });

  function openAndScroll(id) {
    var acc = document.getElementById(id);
    if (!acc || !acc.classList.contains('acc')) return false;
    setOpen(acc, true);
    acc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  document.querySelectorAll('tr[data-open]').forEach(function (tr) {
    tr.addEventListener('click', function () { openAndScroll(tr.getAttribute('data-open')); });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id && openAndScroll(id)) e.preventDefault();
  });
  if (location.hash) openAndScroll(location.hash.slice(1));

  /* ── Meny: aktiv del, förlopp och skuggning ───────────────────── */
  var nav = document.querySelector('.topnav');
  var progress = document.querySelector('.progress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.navlinks a'));
  var parts = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  var shelves = Array.prototype.slice.call(document.querySelectorAll('.shelf-bg'));
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);

    var current = null;
    var probe = y + window.innerHeight * 0.3;
    parts.forEach(function (p) { if (p.offsetTop <= probe) current = p; });
    navLinks.forEach(function (a) {
      var on = current && a.getAttribute('href') === '#' + current.id;
      a.classList.toggle('active', !!on);
      if (on && a.scrollIntoView && nav && window.innerWidth < 820) {
        var box = a.parentNode;
        var left = a.offsetLeft - box.clientWidth / 2 + a.clientWidth / 2;
        if (Math.abs(box.scrollLeft - left) > 40) box.scrollTo({ left: left, behavior: 'smooth' });
      }
    });

    if (!reduceMotion) {
      var vh = window.innerHeight;
      shelves.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var center = (r.top + r.height / 2 - vh / 2) / vh;
        s.style.setProperty('--py', (center * -60).toFixed(1) + 'px');
      });
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── Böckerna i hero följer muspekaren lite ────────────────────── */
  var shelf = document.querySelector('.bookshelf');
  if (shelf && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    shelf.addEventListener('pointermove', function (e) {
      var r = shelf.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      shelf.style.perspectiveOrigin = (50 + x * 40) + '% 40%';
    });
  }

  /* ── Affischer i större format ─────────────────────────────────── */
  var box = document.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    var img = box.querySelector('img');
    var pdf = box.querySelector('[data-lb-pdf]');
    var jpg = box.querySelector('[data-lb-jpg]');
    document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        img.src = btn.getAttribute('data-full');
        img.alt = btn.getAttribute('data-title') || '';
        var pdfHref = btn.getAttribute('data-pdf');
        pdf.hidden = jpg.hidden = !pdfHref;
        if (pdfHref) { pdf.href = pdfHref; jpg.href = btn.getAttribute('data-full'); }
        box.showModal();
      });
    });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.hasAttribute('data-lb-close')) box.close(); });
  }

  /* ── Demovideo: laddas först när man klickar ───────────────────── */
  document.querySelectorAll('.video[data-src]').forEach(function (v) {
    var btn = v.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var vid = document.createElement('video');
      vid.src = v.getAttribute('data-src');
      vid.controls = true;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Video');
      v.replaceChild(vid, btn);
      var p = vid.play();
      if (p && p.catch) p.catch(function () { /* autoplay nekades, kontrollerna finns */ });
    });
  });

  /* ── Demo: material som inte ingår ─────────────────────────────── */
  var toast = document.querySelector('.demo-toast');
  var toastTimer;
  document.querySelectorAll('[data-demo]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (!toast) return;
      toast.hidden = false;
      toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    });
  });

  /* ── Uppgifter: bocka av, se framstegen och få en medalj ───────── */
  /* Workshops och hemuppgifter har data-task. Bockarna sparas bara i
     den här webbläsaren (localStorage) och syns inte för någon annan. */
  var TASKS_KEY = 'aifp-demo-uppgifter';
  var tasks = Array.prototype.slice.call(document.querySelectorAll('[data-task][id]'));
  var navProgress = document.querySelector('.nav-progress');
  var medal = document.getElementById('medal');
  var medalBtn = document.querySelector('[data-medal-open]');
  var done = {};
  try {
    var saved = JSON.parse(localStorage.getItem(TASKS_KEY));
    if (Array.isArray(saved)) saved.forEach(function (id) { done[id] = true; });
  } catch (e) { /* privat läge eller trasigt värde */ }

  function saveTasks() {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(Object.keys(done))); } catch (e) { /* privat läge */ }
  }

  function showMedal() {
    if (!medal || typeof medal.showModal !== 'function' || medal.open) return;
    var confetti = medal.querySelector('.confetti');
    confetti.textContent = '';
    if (!reduceMotion) {
      var colors = ['var(--c-del1)', 'var(--c-del2)', 'var(--c-del3)', 'var(--c-bonus)', 'var(--c-res)', '#f2c14e'];
      for (var i = 0; i < 46; i++) {
        var bit = document.createElement('i');
        bit.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
        bit.style.setProperty('--dx', ((Math.random() - 0.5) * 8).toFixed(1) + 'rem');
        bit.style.setProperty('--r', Math.round((Math.random() - 0.5) * 1080) + 'deg');
        bit.style.setProperty('--t', (2.2 + Math.random() * 1.8).toFixed(2) + 's');
        bit.style.setProperty('--d', (Math.random() * 0.8).toFixed(2) + 's');
        bit.style.setProperty('--c', colors[i % colors.length]);
        confetti.appendChild(bit);
      }
    }
    medal.showModal();
  }

  function updateTasks(justChecked) {
    var count = 0;
    tasks.forEach(function (el) {
      var isDone = !!done[el.id];
      if (isDone) count++;
      el.classList.toggle('is-done', isDone);
      var sr = el.querySelector(':scope > .acc-btn .task-sr');
      if (sr) sr.textContent = isDone ? ' (genomförd)' : '';
      var row = document.querySelector('tr[data-open="' + el.id + '"]');
      if (row) row.classList.toggle('is-done', isDone);
    });
    var total = tasks.length;
    var pct = total ? Math.floor(count / total * 100) : 0;
    var complete = total > 0 && count === total;

    if (navProgress) {
      var bar = navProgress.querySelector('.np-bar');
      bar.style.setProperty('--p', pct);
      bar.setAttribute('aria-valuenow', pct);
      bar.setAttribute('aria-valuetext', pct + ' %, ' + count + ' av ' + total + ' uppgifter genomförda');
      navProgress.querySelector('.np-pct').textContent = pct + ' %';
      navProgress.title = count + ' av ' + total + ' workshopövningar och hemuppgifter genomförda';
      navProgress.classList.toggle('complete', complete);
    }
    if (medalBtn) medalBtn.hidden = !complete;
    // Grattisrutan visas när den sista bocken sätts, inte vid sidladdning
    if (complete && justChecked) setTimeout(showMedal, reduceMotion ? 0 : 450);
  }

  var checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>';
  tasks.forEach(function (el) {
    var host = el.classList.contains('acc')
      ? el.querySelector(':scope > .acc-panel .acc-content')
      : el.querySelector('.block-body');
    if (!host) return;
    var label = document.createElement('label');
    label.className = 'task-done';
    label.innerHTML = '<input type="checkbox"><span class="task-box" aria-hidden="true">' + checkSvg + '</span><span>Uppgiften genomförd</span>';
    var input = label.querySelector('input');
    input.checked = !!done[el.id];
    input.addEventListener('change', function () {
      if (input.checked) done[el.id] = true; else delete done[el.id];
      saveTasks();
      updateTasks(input.checked);
    });
    host.appendChild(label);
    var head = el.querySelector(':scope > .acc-btn .acc-head');
    if (head) {
      var sr = document.createElement('span');
      sr.className = 'sr-only task-sr';
      head.appendChild(sr);
    }
  });

  if (medalBtn) medalBtn.addEventListener('click', showMedal);
  if (medal) {
    medal.addEventListener('click', function (e) {
      if (e.target === medal || e.target.hasAttribute('data-medal-close')) medal.close();
    });
  }
  updateTasks(false);

  /* ── Demoversionen har ingen startsida med lösenord ────────────── */
  root.classList.add('unlocked');
  onScroll();
  startReveals();
})();
