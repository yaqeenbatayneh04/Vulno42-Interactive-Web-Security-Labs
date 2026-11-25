'use strict';
// Lab 1: DOM-based open redirect. Navigation is simulated; no URL is opened.
const DEMO_ORIGIN = 'https://vulno42.local';
const ALLOWED_PATHS = Object.freeze(['/dashboard', '/profile']);
const PRESETS = Object.freeze({
  safe: '/dashboard',
  external: 'https://example.org/fake-login',
  protocol: '//example.org/fake-login'
});

// The following helpers contain the actual decision logic used by the demo.
function vulnerableRedirect(next) {
  const params = new URLSearchParams({ next: String(next).trim() });
  const destination = params.get('next');
  if (!destination) return { allowed: false, reason: 'Missing destination' };
  // BUG: checking for a value does not validate the destination.
  return { allowed: true, destination };
}

function fixedRedirect(next) {
  const params = new URLSearchParams({ next: String(next).trim() });
  const destination = params.get('next');
  // FIX: only exact, predefined internal destinations are allowed.
  if (!ALLOWED_PATHS.includes(destination)) {
    return { allowed: false, reason: 'Destination not in allowlist' };
  }
  return { allowed: true, destination };
}

const VULN_CODE = [
  'function redirectFromQuery(search) {',
  '  const params = new URLSearchParams(search);',
  '  const next = params.get("next");',
  '  if (!next) return;',
  '  // No validation of the destination',
  '  window.location.assign(next);',
  '}',
  'redirectFromQuery(window.location.search);'
];
const FIXED_CODE = [
  'const ALLOWED = ["/dashboard", "/profile"];',
  'function redirectFromQuery(search) {',
  '  const params = new URLSearchParams(search);',
  '  const next = params.get("next");',
  '  if (!next) return;',
  '  if (!ALLOWED.includes(next)) return;',
  '  window.location.assign(next);',
  '}',
  'redirectFromQuery(window.location.search);'
];

// Browser-only presentation. Never call location.assign in the demo.
if (typeof document !== 'undefined') {
  let isVulnerable = true;
  const byId = id => document.getElementById(id);
  const vulnBtn = byId('vuln-btn');
  const fixedBtn = byId('fixed-btn');
  const input = byId('redirect-input');
  const code = byId('code-display');
  const explanation = byId('code-explanation');
  const output = byId('simulation-output');
  const trace = byId('attack-trace');
  const address = byId('browser-address');
  const heading = byId('browser-heading');
  const message = byId('browser-message');

  function appendTrace(lines) {
    trace.replaceChildren();
    lines.forEach(line => {
      const item = document.createElement('li');
      item.textContent = line;
      trace.appendChild(item);
    });
  }
  function renderCode() {
    const lines = isVulnerable ? VULN_CODE : FIXED_CODE;
    const highlight = isVulnerable ? 5 : 5;
    code.replaceChildren();
    lines.forEach((line, index) => {
      if (index === highlight) {
        const span = document.createElement('span');
        span.className = `highlight-line ${isVulnerable ? 'vuln' : 'fixed'}-line`;
        span.textContent = line + '\n';
        code.appendChild(span);
      } else {
        code.appendChild(document.createTextNode(line + '\n'));
      }
    });
    explanation.textContent = isVulnerable
      ? 'Why it fails: location.assign(next) trusts the next parameter without checking its destination.'
      : 'The fix: an exact allowlist permits only /dashboard and /profile. Other values are rejected.';
  }
  function resetPreview() {
    output.className = 'output-box';
    output.textContent = 'Waiting for action...';
    address.textContent = DEMO_ORIGIN + '/login';
    heading.textContent = 'Waiting for action';
    message.textContent = 'No navigation will take place. This is a local preview.';
    appendTrace(['Select a payload, then click Test Redirect to see the decision steps.']);
  }
  function setMode(vulnerable) {
    isVulnerable = vulnerable;
    vulnBtn.classList.toggle('active-vuln', vulnerable);
    fixedBtn.classList.toggle('active-fixed', !vulnerable);
    vulnBtn.setAttribute('aria-pressed', String(vulnerable));
    fixedBtn.setAttribute('aria-pressed', String(!vulnerable));
    renderCode();
    input.value = '';
    resetPreview();
  }
  function simulate(raw) {
    const next = raw.trim();
    const result = isVulnerable ? vulnerableRedirect(next) : fixedRedirect(next);
    const steps = [
      `Read URL parameter: next=${next || '(empty)'}`,
      isVulnerable ? 'Vulnerable code checks only whether next exists.' : 'Fixed code compares next with the internal allowlist.'
    ];
    if (!result.allowed) {
      address.textContent = DEMO_ORIGIN + '/login';
      heading.textContent = 'Redirect blocked';
      message.textContent = result.reason + '. The browser stays on the trusted page.';
      output.className = 'output-box attack-blocked';
      output.textContent = '🛡️ BLOCKED — ' + result.reason;
      steps.push('Navigation denied. No destination is opened.');
    } else {
      let previewDestination;
      try { previewDestination = new URL(result.destination, DEMO_ORIGIN).href; }
      catch {
        address.textContent = DEMO_ORIGIN + '/login';
        heading.textContent = 'Invalid destination';
        message.textContent = 'The supplied destination cannot be parsed as a URL. No navigation occurs.';
        output.className = 'output-box attack-blocked';
        output.textContent = '🛡️ INVALID — Destination is not a valid URL.';
        steps.push('Destination cannot be parsed; no navigation occurs.');
        appendTrace(steps);
        return { allowed: false, reason: 'Invalid URL' };
      }
      address.textContent = previewDestination;
      heading.textContent = 'Redirect accepted (simulation)';
      message.textContent = 'A redirect to this destination would be allowed by the selected mode. No real navigation occurs.';
      const external = new URL(previewDestination).origin !== DEMO_ORIGIN;
      output.className = 'output-box ' + (external ? 'attack-success' : 'attack-blocked');
      output.textContent = external ? '⚠️ ATTACK SUCCEEDED — external destination accepted (simulated).' : '✅ Internal destination accepted (simulated).';
      steps.push('Destination accepted: ' + previewDestination + ' (preview only).');
    }
    appendTrace(steps);
    return result;
  }
  vulnBtn.addEventListener('click', () => setMode(true));
  fixedBtn.addEventListener('click', () => setMode(false));
  document.querySelectorAll('[data-payload]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = PRESETS[button.dataset.payload];
      resetPreview();
    });
  });
  byId('redirect-form').addEventListener('submit', event => {
    event.preventDefault();
    simulate(input.value);
  });
  byId('reset-btn').addEventListener('click', () => {
    input.value = '';
    resetPreview();
  });
  setMode(true);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { vulnerableRedirect, fixedRedirect, ALLOWED_PATHS, PRESETS };
}
