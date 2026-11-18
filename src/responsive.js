import './responsive.css';

// Let native mobile pickers handle selection while showing the complete selected
// text on the page. Labels, form values, validation and keyboard access stay native.
document.querySelectorAll('.labor-calculator select').forEach(select => {
  const shell = document.createElement('div');
  shell.className = 'select-shell';
  const readout = document.createElement('span');
  readout.className = 'select-shell__value';
  readout.setAttribute('aria-hidden', 'true');
  select.before(shell);
  shell.append(readout, select);
  const sync = () => { readout.textContent = select.selectedOptions[0]?.textContent || ''; };
  select.addEventListener('change', sync);
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected'] });
  sync();
});

// Keep the floating contact button away from form fields and mobile keyboards.
const mobile = window.matchMedia('(max-width: 1024px)');
const coveredForms = new Set();
const editable = 'input, select, textarea';
const syncFloatingContact = () => {
  const editing = document.activeElement?.matches(editable);
  document.body.classList.toggle('floating-contact-paused', mobile.matches && (coveredForms.size > 0 || editing));
};
const formObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) coveredForms.add(entry.target);
    else coveredForms.delete(entry.target);
  });
  syncFloatingContact();
}, { threshold: 0 });
document.querySelectorAll('#calculadora, #contactForm').forEach(form => formObserver.observe(form));
document.addEventListener('focusin', syncFloatingContact);
document.addEventListener('focusout', () => requestAnimationFrame(syncFloatingContact));
mobile.addEventListener('change', syncFloatingContact);

// Bring the start of the next step (or its validation message) below the sticky
// header, rather than leaving the visitor at the bottom of the previous step.
const calculator = document.getElementById('laborCalculator');
document.getElementById('calculatorForm')?.addEventListener('submit', () => {
  if (!mobile.matches) return;
  requestAnimationFrame(() => {
    const error = document.getElementById('calculatorErrors');
    const target = error && !error.hidden ? error : calculator.querySelector('.calculator-body');
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
});
