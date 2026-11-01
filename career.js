// case-file tabs
const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

const show = i => tabs.forEach((tab, k) => {
  tab.setAttribute('aria-selected', k === i);
  tab.tabIndex = k === i ? 0 : -1;
  panels[k].hidden = k !== i;
});
show(0);

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => show(i));
  tab.addEventListener('keydown', e => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    const next = (i + step + tabs.length) % tabs.length;
    show(next);
    tabs[next].focus();
    e.preventDefault();
  });
});
