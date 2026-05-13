/**
 * Global tooltip system using position:fixed to avoid viewport clipping.
 * Replaces CSS ::after pseudo-element tooltips for [data-tooltip] elements.
 * Automatically flips below the trigger if near the top edge.
 * Clamps left/right inside viewport with 8px margin.
 */

let tooltipEl = null;
let hideTimer = null;

function getOrCreateTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = '__ck_tooltip__';
  Object.assign(tooltipEl.style, {
    position: 'fixed',
    zIndex: '99999',
    background: 'rgba(15,23,42,0.96)',
    color: '#f8fafc',
    border: '1px solid rgba(148,163,184,0.35)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, "Cascadia Code", "Fira Mono", monospace',
    maxWidth: '280px',
    whiteSpace: 'normal',
    lineHeight: '1.4',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.12s',
    wordBreak: 'break-word',
  });
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(trigger, text) {
  clearTimeout(hideTimer);
  const el = getOrCreateTooltip();
  el.textContent = text;
  el.style.opacity = '0';
  el.style.display = 'block';

  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const gap = 6;

  // Measure tooltip dimensions after setting content
  const tw = el.offsetWidth || 200;
  const th = el.offsetHeight || 30;

  // Default: place above trigger
  let top = rect.top - th - gap;
  let left = rect.left + rect.width / 2 - tw / 2;

  // Flip below if too close to top edge
  if (top < margin) {
    top = rect.bottom + gap;
  }

  // Clamp horizontally inside viewport
  const vw = window.innerWidth;
  if (left < margin) left = margin;
  if (left + tw > vw - margin) left = vw - tw - margin;

  // Clamp vertically
  const vh = window.innerHeight;
  if (top + th > vh - margin) top = vh - th - margin;
  if (top < margin) top = margin;

  el.style.top = `${Math.round(top)}px`;
  el.style.left = `${Math.round(left)}px`;
  el.style.opacity = '1';
}

function hideTooltip() {
  hideTimer = setTimeout(() => {
    if (tooltipEl) tooltipEl.style.opacity = '0';
  }, 60);
}

function findTooltipTarget(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.dataset && node.dataset.tooltip) return node;
    node = node.parentElement;
  }
  return null;
}

export function initTooltips() {
  document.addEventListener('mouseover', (e) => {
    const target = findTooltipTarget(e.target);
    if (target) {
      showTooltip(target, target.dataset.tooltip);
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    const target = findTooltipTarget(e.target);
    if (target) hideTooltip();
  }, true);

  document.addEventListener('click', hideTooltip, true);
  document.addEventListener('scroll', hideTooltip, true);
}
