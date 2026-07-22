// Header shadow on scroll
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
navToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
nav?.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  })
);

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
