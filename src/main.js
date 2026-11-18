import './calculator/ui.js';
import './responsive.js';

// Header shadow on scroll
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
const setMobileMenu = open => {
  nav?.classList.toggle('is-open', open);
  navToggle?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('mobile-nav-open', open);
};
navToggle?.setAttribute('aria-controls', 'nav');
navToggle?.addEventListener('click', () => setMobileMenu(!nav.classList.contains('is-open')));
nav?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    setMobileMenu(false);
  })
);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
    setMobileMenu(false);
    navToggle?.focus();
  }
});
document.addEventListener('click', event => {
  if (nav?.classList.contains('is-open') && (!header.contains(event.target) || event.target.closest('a'))) setMobileMenu(false);
});
window.matchMedia('(min-width: 1025px)').addEventListener('change', event => {
  if (event.matches) setMobileMenu(false);
});

// Reveal on scroll (small, tasteful — no huge scroll distances)
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
revealEls.forEach((el) => io.observe(el));

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Contact form — builds a WhatsApp message from the filled fields
const WHATSAPP_NUMBER = '5532999055427';
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const nome = data.get('nome') || '';
  const sobrenome = data.get('sobrenome') || '';
  const email = data.get('email') || '';
  const telefone = data.get('telefone') || '';
  const mensagem = data.get('mensagem') || '';
  const podeLigar = data.get('pode_ligar') ? 'Sim' : 'Não';

  const text = [
    `Olá! Me chamo ${nome} ${sobrenome}.`,
    `Email: ${email}`,
    `Telefone: ${telefone}`,
    `Podem me ligar? ${podeLigar}`,
    '',
    `Meu caso: ${mensagem}`,
  ].join('\n');

  note.textContent = 'Abrindo o WhatsApp...';
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  form.reset();
});
