'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = (n) => '£' + n.toFixed(2);

/* ---------- Image fallback (keeps the layout nice if a photo can't load) ---------- */
$$('img').forEach((img) => {
  img.addEventListener('error', () => img.classList.add('img-failed'), { once: true });
});

/* ---------- Preloader ---------- */
const preloader = $('[data-preloader]');
const finishLoading = () => {
  if (preloader.classList.contains('loaded')) return;
  preloader.classList.add('loaded');
  document.body.classList.remove('is-loading');
  startHero();
};
window.addEventListener('load', () => setTimeout(finishLoading, 400));
setTimeout(finishLoading, 4000); // never block the page on slow images

/* ---------- Header: solid on scroll, hide on scroll down ---------- */
const header = $('[data-header]');
const backTop = $('[data-back-top]');
const progress = $('[data-scroll-progress]');
let lastY = 0;
let ticking = false;

const onScroll = () => {
  const y = window.scrollY;
  header.classList.toggle('active', y > 50);
  header.classList.toggle('hide', y > lastY && y > 400 && !navbar.classList.contains('active'));
  backTop.classList.toggle('active', y > 600);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  lastY = y;
  updateParallax();
  ticking = false;
};
window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });

/* ---------- Mobile nav ---------- */
const navbar = $('[data-navbar]');
const navToggle = $('[data-nav-toggle]');
const overlay = $('[data-overlay]');

const setNav = (open) => {
  navbar.classList.toggle('active', open);
  overlay.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('no-scroll', open);
};
navToggle.addEventListener('click', () => setNav(!navbar.classList.contains('active')));
overlay.addEventListener('click', () => { setNav(false); setCart(false); });
$$('[data-nav-link]').forEach((link) => link.addEventListener('click', () => setNav(false)));

/* ---------- Scrollspy ---------- */
const navLinks = $$('[data-nav-link]');
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((l) => { const s = $(l.getAttribute('href')); if (s) spy.observe(s); });

/* ---------- Open / closed status (live) ---------- */
const updateStatus = () => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = mins >= 11 * 60 + 30 && mins < 23 * 60;
  $('[data-status-dot]').className = 'status-dot ' + (open ? 'open' : 'closed');
  $('[data-open-status]').textContent = open
    ? 'Open now · until 11:00 pm'
    : 'Closed · opens 11:30 am';
};
updateStatus();
setInterval(updateStatus, 60_000);

/* ---------- Hero slider ---------- */
const slides = $$('[data-hero-slide]');
const dotsWrap = $('[data-hero-dots]');
const heroBar = $('[data-hero-progress]');
const SLIDE_MS = 7000;
let current = 0;
let heroTimer = null;
let heroStart = 0;
let heroPaused = false;
let heroElapsed = 0;

slides.forEach((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Go to slide ${i + 1}`);
  b.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(b);
});
const dots = $$('button', dotsWrap);

function goTo(i) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (i + slides.length) % slides.length;
  // restart the Ken Burns animation
  const bg = $('.hero__bg', slides[current]);
  bg.style.animation = 'none'; void bg.offsetWidth; bg.style.animation = '';
  slides[current].classList.add('active');
  dots[current].classList.add('active');
  heroElapsed = 0;
  heroStart = performance.now();
}
function heroLoop(t) {
  if (!heroPaused) {
    const elapsed = heroElapsed + (t - heroStart);
    heroBar.style.width = Math.min(elapsed / SLIDE_MS, 1) * 100 + '%';
    if (elapsed >= SLIDE_MS) goTo(current + 1);
  }
  heroTimer = requestAnimationFrame(heroLoop);
}
function startHero() {
  if (heroTimer) return;
  goTo(0);
  if (!reduceMotion) heroTimer = requestAnimationFrame(heroLoop);
}
const hero = $('[data-hero]');
const pauseHero = (p) => {
  if (p === heroPaused) return;
  if (p) heroElapsed += performance.now() - heroStart; else heroStart = performance.now();
  heroPaused = p;
};
hero.addEventListener('mouseenter', () => pauseHero(true));
hero.addEventListener('mouseleave', () => pauseHero(false));
document.addEventListener('visibilitychange', () => pauseHero(document.hidden));
$('[data-next-btn]').addEventListener('click', () => goTo(current + 1));
$('[data-prev-btn]').addEventListener('click', () => goTo(current - 1));

// swipe
let touchX = null;
hero.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
hero.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
  touchX = null;
});

/* ---------- Scroll reveal ---------- */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
$$('[data-reveal]').forEach((el) => revealObs.observe(el));

/* ---------- Counters ---------- */
const countObs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const dur = 1800;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObs.unobserve(el);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => countObs.observe(el));

/* ---------- Parallax ---------- */
const parallaxEls = $$('[data-parallax]');
function updateParallax() {
  if (reduceMotion) return;
  const vh = window.innerHeight;
  parallaxEls.forEach((el) => {
    const rect = el.parentElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh) return;
    const offset = (rect.top + rect.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
    el.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
}
updateParallax();

/* ---------- 3D tilt cards ---------- */
if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ---------- Custom cursor ---------- */
const cursor = $('[data-cursor]');
const cursorDot = $('[data-cursor-dot]');
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursorDot.style.transform = `translate(${mx}px, ${my}px)`;
    document.body.classList.add('cursor-on');
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
  const follow = () => {
    cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  };
  follow();
  document.addEventListener('mouseover', (e) => {
    cursor.classList.toggle('hovering', !!e.target.closest('a, button, input, select, textarea, [data-lightbox]'));
  });
}

/* ---------- Menu data + filter + search ---------- */
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&h=200&q=70`;
const MENU = [
  { name: 'Greek Salad', cat: 'starters', price: 9.5, desc: 'Tomatoes, green pepper, onion, olives, feta', img: img('1540189549336-e6e99c3679fe'), tags: ['V'], badge: 'Seasonal' },
  { name: 'Grain Bowl', cat: 'starters', price: 8, desc: 'Roasted squash, quinoa, tahini, pomegranate', img: img('1512621776951-a57141f2eefd'), tags: ['V'] },
  { name: 'Market Plate', cat: 'starters', price: 11, desc: 'Chef’s pick of today’s small plates', img: img('1546069901-ba9599a7e63c'), tags: [] },
  { name: 'Dan Dan Noodles', cat: 'mains', price: 16, desc: 'Hand-pulled noodles, pork, sesame, Sichuan chilli oil', img: img('1569718212165-3a8278d5f624'), tags: ['🌶'], badge: 'New' },
  { name: 'Oak-fired Pizza', cat: 'mains', price: 15, desc: 'San Marzano, fior di latte, basil, 48h dough', img: img('1565299624946-b28f40a0ae38'), tags: ['V'] },
  { name: 'Ember Ribeye', cat: 'mains', price: 34, desc: '300g dry-aged ribeye, bone marrow butter, chips', img: img('1544025162-d76694265947'), tags: [] },
  { name: 'Brunch Stack', cat: 'mains', price: 13, desc: 'Poached eggs, avocado, sourdough, chilli crisp', img: img('1432139555190-58524dae6a55'), tags: ['🌶'] },
  { name: 'Glazed Donuts', cat: 'desserts', price: 7, desc: 'Brown-butter glaze, sea salt, vanilla custard', img: img('1551024601-bec78aea704b'), tags: ['V'] },
  { name: 'Chocolate Sundae', cat: 'desserts', price: 8.5, desc: 'Dark chocolate, smoked caramel, hazelnut', img: img('1563805042-7684c019e1cb'), tags: ['V'], badge: 'Popular' },
  { name: 'Yuzu Spritz', cat: 'drinks', price: 9, desc: 'Yuzu, prosecco, elderflower, soda', img: img('1551218808-94e220e084d2'), tags: [] },
  { name: 'Smoked Old Fashioned', cat: 'drinks', price: 12, desc: 'Bourbon, demerara, bitters, oak smoke', img: img('1559339352-11d035aa65de'), tags: [] },
];

const menuList = $('[data-menu-list]');
const menuEmpty = $('[data-menu-empty]');
const searchInput = $('[data-menu-search]');
let activeFilter = 'all';

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderMenu() {
  const q = searchInput.value.trim().toLowerCase();
  const items = MENU.filter((m) =>
    (activeFilter === 'all' || m.cat === activeFilter) &&
    (!q || (m.name + ' ' + m.desc).toLowerCase().includes(q)));

  menuList.innerHTML = items.map((m, i) => `
    <li class="menu-item" style="animation-delay:${i * 60}ms">
      <figure class="menu-item__img"><img src="${m.img}" alt="${escapeHtml(m.name)}" loading="lazy"></figure>
      <div>
        <div class="menu-item__head">
          <h3 class="menu-item__title">${escapeHtml(m.name)}</h3>
          ${m.badge ? `<span class="menu-item__badge">${m.badge}</span>` : ''}
          <span class="menu-item__dots"></span>
          <span class="menu-item__price">${money(m.price)}</span>
        </div>
        <p class="menu-item__desc">
          <span>${escapeHtml(m.desc)} ${m.tags.map((t) => `<span class="tag${t === '🌶' ? ' tag--hot' : ''}">${t}</span>`).join('')}</span>
          <button class="menu-item__add" data-add-to-cart data-name="${escapeHtml(m.name)}" data-price="${m.price}" aria-label="Add ${escapeHtml(m.name)} to order">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </p>
      </div>
    </li>`).join('');

  $$('img', menuList).forEach((im) => im.addEventListener('error', () => im.classList.add('img-failed'), { once: true }));
  menuEmpty.hidden = items.length > 0;
}

const tabs = $$('.menu__tab');
const indicator = $('[data-tab-indicator]');
function moveIndicator(tab) {
  indicator.style.width = tab.offsetWidth + 'px';
  indicator.style.height = tab.offsetHeight + 'px';
  indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
}
function setFilter(filter) {
  activeFilter = filter;
  tabs.forEach((t) => {
    const on = t.dataset.filter === filter;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    if (on) moveIndicator(t);
  });
  renderMenu();
}
tabs.forEach((t) => t.addEventListener('click', () => setFilter(t.dataset.filter)));
$$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => setFilter(a.dataset.filterLink)));
searchInput.addEventListener('input', renderMenu);
window.addEventListener('resize', () => moveIndicator($('.menu__tab.active')));
document.fonts?.ready.then(() => moveIndicator($('.menu__tab.active')));
setFilter('all');

/* ---------- Cart ---------- */
const cartEl = $('[data-cart]');
const cartList = $('[data-cart-list]');
const cartEmpty = $('[data-cart-empty]');
const cartTotal = $('[data-cart-total]');
const cartCount = $('[data-cart-count]');
const cartBtn = $('[data-cart-open]');
let cart = [];
try { cart = JSON.parse(localStorage.getItem('eo-cart')) || []; } catch { cart = []; }

function setCart(open) {
  cartEl.classList.toggle('active', open);
  cartEl.setAttribute('aria-hidden', String(!open));
  overlay.classList.toggle('active', open || navbar.classList.contains('active'));
  document.body.classList.toggle('no-scroll', open);
}
function saveCart() {
  try { localStorage.setItem('eo-cart', JSON.stringify(cart)); } catch { /* storage unavailable */ }
}
function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  cartCount.textContent = count;
  cartCount.classList.toggle('show', count > 0);
  cartTotal.textContent = money(total);
  cartEmpty.hidden = cart.length > 0;
  cartList.innerHTML = cart.map((i, idx) => `
    <li class="cart__item">
      <span class="cart__item-name">${escapeHtml(i.name)}</span>
      <span class="cart__item-price">${money(i.price * i.qty)}</span>
      <div class="qty">
        <button data-qty="-1" data-idx="${idx}" aria-label="Decrease">−</button>
        <span>${i.qty}</span>
        <button data-qty="1" data-idx="${idx}" aria-label="Increase">+</button>
      </div>
      <button class="cart__remove" data-remove="${idx}">Remove</button>
    </li>`).join('');
  saveCart();
}
function addToCart(name, price) {
  const found = cart.find((i) => i.name === name);
  if (found) found.qty++; else cart.push({ name, price, qty: 1 });
  renderCart();
  cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
  toast(`${name} added to your order`);
}
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add-to-cart]');
  if (add) addToCart(add.dataset.name, parseFloat(add.dataset.price));
});
cartList.addEventListener('click', (e) => {
  const q = e.target.closest('[data-qty]');
  const r = e.target.closest('[data-remove]');
  if (q) {
    const item = cart[+q.dataset.idx];
    item.qty += +q.dataset.qty;
    if (item.qty <= 0) cart.splice(+q.dataset.idx, 1);
  } else if (r) {
    cart.splice(+r.dataset.remove, 1);
  } else return;
  renderCart();
});
cartBtn.addEventListener('click', () => setCart(true));
$('[data-cart-close]').addEventListener('click', () => setCart(false));
$('[data-checkout]').addEventListener('click', () => {
  if (!cart.length) { toast('Add a dish first 🍜'); return; }
  const total = money(cart.reduce((s, i) => s + i.qty * i.price, 0));
  cart = []; renderCart(); setCart(false);
  showModal('Order placed!', `Your order (${total}) will be ready for pickup in about 25 minutes.`);
});
renderCart();

/* ---------- Gallery lightbox ---------- */
const lightbox = $('[data-lightbox-box]');
const lbImg = $('[data-lightbox-img]');
const galleryItems = $$('[data-lightbox]');
let lbIndex = 0;
const showLb = (i) => {
  lbIndex = (i + galleryItems.length) % galleryItems.length;
  const src = $('img', galleryItems[lbIndex]);
  lbImg.src = src.src.replace(/w=\d+/, 'w=1600');
  lbImg.alt = src.alt;
};
const setLb = (open) => {
  lightbox.classList.toggle('active', open);
  lightbox.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('no-scroll', open);
};
galleryItems.forEach((item, i) => item.addEventListener('click', () => { showLb(i); setLb(true); }));
$('[data-lightbox-close]').addEventListener('click', () => setLb(false));
$('[data-lightbox-prev]').addEventListener('click', () => showLb(lbIndex - 1));
$('[data-lightbox-next]').addEventListener('click', () => showLb(lbIndex + 1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) setLb(false); });

/* ---------- Testimonials ---------- */
const testiItems = $$('.testi__item');
const testiDotsWrap = $('[data-testi-dots]');
let testiIdx = 0;
testiItems.forEach((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Show review ${i + 1}`);
  b.addEventListener('click', () => showTesti(i));
  testiDotsWrap.appendChild(b);
});
const testiDots = $$('button', testiDotsWrap);
function showTesti(i) {
  testiItems[testiIdx].classList.remove('active');
  testiDots[testiIdx].classList.remove('active');
  testiIdx = (i + testiItems.length) % testiItems.length;
  testiItems[testiIdx].classList.add('active');
  testiDots[testiIdx].classList.add('active');
}
testiDots[0].classList.add('active');
if (!reduceMotion) setInterval(() => showTesti(testiIdx + 1), 6000);

/* ---------- Reservation form ---------- */
const form = $('[data-reservation-form]');
const dateInput = $('[data-date-input]');
const timeSelect = $('[data-time-select]');
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
dateInput.min = todayStr();
dateInput.value = todayStr();

function fillTimes() {
  const slots = [];
  for (let m = 11 * 60 + 30; m <= 22 * 60; m += 30) slots.push(m);
  const now = new Date();
  const isToday = dateInput.value === todayStr();
  const nowMins = now.getHours() * 60 + now.getMinutes() + 30; // need 30 min notice
  const prev = timeSelect.value;
  const available = slots.filter((m) => !isToday || m >= nowMins);
  timeSelect.innerHTML = available.length
    ? available.map((m) => {
        const h = Math.floor(m / 60), mm = m % 60;
        const label = `${((h + 11) % 12) + 1}:${pad(mm)} ${h < 12 ? 'am' : 'pm'}`;
        return `<option value="${pad(h)}:${pad(mm)}">${label}</option>`;
      }).join('')
    : '<option value="">Fully booked today — pick another date</option>';
  if ([...timeSelect.options].some((o) => o.value === prev)) timeSelect.value = prev;
}
dateInput.addEventListener('change', fillTimes);
fillTimes();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  const check = (input, valid) => {
    const field = input.closest('.field');
    field.classList.remove('invalid'); void field.offsetWidth;
    if (!valid) { field.classList.add('invalid'); ok = false; }
  };
  const { name, phone, guests } = form.elements;
  check(name, name.value.trim().length > 1);
  check(phone, /^[0-9+()\s-]{7,}$/.test(phone.value.trim()));
  check(dateInput, dateInput.value && dateInput.value >= todayStr());
  if (!timeSelect.value) { ok = false; toast('No times left that day — choose another date'); }
  if (!ok) return;

  const d = new Date(dateInput.value + 'T' + timeSelect.value);
  const when = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const party = guests.selectedOptions[0].textContent;
  const time = timeSelect.selectedOptions[0].textContent;
  showModal('Table booked!', `See you ${when} at ${time}, ${name.value.trim().split(' ')[0]}. Table for ${party}.`);
  form.reset();
  dateInput.value = todayStr();
  fillTimes();
});
$$('.field input').forEach((i) => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));

/* ---------- Newsletter ---------- */
$('[data-newsletter]').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('input', e.target);
  if (!/^\S+@\S+\.\S+$/.test(input.value)) { toast('Please enter a valid email'); input.focus(); return; }
  toast('You’re in! Check your inbox for 25% off ✨');
  input.value = '';
});

/* ---------- Modal + confetti ---------- */
const modal = $('[data-modal]');
function showModal(title, text) {
  $('[data-modal-title]').textContent = title;
  $('[data-modal-text]').textContent = text;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  $('[data-modal-close]').focus();
  confetti();
}
const closeModal = () => { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); };
$('[data-modal-close]').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

const canvas = $('[data-confetti]');
const ctx = canvas.getContext('2d');
function confetti() {
  if (reduceMotion) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#e4c590', '#f5e6c8', '#c9a15c', '#ffffff', '#b8864b'];
  const parts = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2, y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 18, vy: Math.random() * -18 - 4,
    size: Math.random() * 8 + 4, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 12,
    color: colors[(Math.random() * colors.length) | 0], life: 0,
  }));
  const step = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    parts.forEach((p) => {
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      if (p.y < innerHeight + 20) alive++;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(1 - p.life / 160, 0);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (alive && parts[0].life < 180) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  step();
}

/* ---------- Toast ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { setNav(false); setCart(false); setLb(false); closeModal(); }
  if (lightbox.classList.contains('active')) {
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    return;
  }
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
  if (window.scrollY < window.innerHeight * 0.8) {
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  }
});

/* ---------- Misc ---------- */
$('[data-year]').textContent = new Date().getFullYear();
onScroll();
