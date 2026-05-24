/* ============================================
   DARK MODE TOGGLE
   ============================================ */
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

setTheme(getPreferredTheme());

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'light' ? 'dark' : 'light');
});

/* ============================================
   MOBILE NAV
   ============================================ */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navMenu.classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navMenu.classList.remove('open');
  });
});

/* ============================================
   ACTIVE NAV LINK (scroll spy)
   ============================================ */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveLink() {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveLink);

/* ============================================
   SCROLL REVEAL
   ============================================ */
function isInView(el) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight - 80;
}

const animatedElements = document.querySelectorAll('.blog-card, .about-image, .about-text');

function revealOnScroll() {
  animatedElements.forEach(el => {
    if (isInView(el) && !el.classList.contains('visible')) {
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => el.classList.add('visible'), delay * 120);
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

/* ============================================
   CONTACT FORM
   ============================================ */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('.form-input');
    const btn = form.querySelector('.form-btn');
    const original = btn.textContent;
    btn.textContent = '✓ 已订阅';
    btn.style.pointerEvents = 'none';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.pointerEvents = '';
      input.value = '';
    }, 2000);
  });
}

/* ============================================
   WECHAT MODAL
   ============================================ */
const wechatModal = document.getElementById('wechatModal');
const wechatBtns = document.querySelectorAll('#wechatBtn, #wechatFooterBtn');
const wechatClose = document.getElementById('wechatModalClose');

wechatBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    wechatModal.classList.add('open');
  });
});

wechatClose.addEventListener('click', () => {
  wechatModal.classList.remove('open');
});

wechatModal.addEventListener('click', e => {
  if (e.target === wechatModal) {
    wechatModal.classList.remove('open');
  }
});
