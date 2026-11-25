// ===================== STATE & DOM =====================
let isVulnerable = true;

const vulnBtn = document.getElementById('vuln-btn');
const fixedBtn = document.getElementById('fixed-btn');
const codeDisplay = document.getElementById('code-display');
const codeExplanation = document.getElementById('code-explanation');
const outputBox = document.getElementById('simulation-output');
const payloadInput = document.getElementById('payload-input');
const runCustomBtn = document.getElementById('run-custom-btn');

// ===================== CODE SHOWN IN THE "CODE" BOX =====================
// Each line: [text, type]  type: null (normal) | 'vuln' | 'fixed'
const VULN_CODE = [
    ['function merge(target, source) {', null],
    ['  for (let key in source) {', null],
    ['    if (typeof source[key] === "object" && source[key] !== null) {', null],
    ['      if (!target[key]) target[key] = {};', null],
    ['      merge(target[key], source[key]);   // ❌ no key check', 'vuln'],
    ['    } else {', null],
    ['      target[key] = source[key];', null],
    ['    }', null],
    ['  }', null],
    ['  return target;', null],
    ['}', null],
    ['// userInput comes from the user (e.g. URL / form)', null],
    ['const config = merge({}, JSON.parse(userInput));', 'vuln'],
];

const FIXED_CODE = [
    ['const BLOCKED = ["__proto__", "constructor", "prototype"];', 'fixed'],
    ['function merge(target, source) {', null],
    ['  for (const key of Object.keys(source)) {', null],
    ['    if (BLOCKED.includes(key)) continue;   // ✅ skip dangerous keys', 'fixed'],
    ['    if (typeof source[key] === "object" && source[key] !== null) {', null],
    ['      if (!Object.hasOwn(target, key)) target[key] = {};', 'fixed'],
    ['      merge(target[key], source[key]);', null],
    ['    } else {', null],
    ['      target[key] = source[key];', null],
    ['    }', null],
    ['  }', null],
    ['  return target;', null],
    ['}', null],
    ['const config = merge(Object.create(null), JSON.parse(userInput));', 'fixed'],
];

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderCode(lines) {
    codeDisplay.innerHTML = lines.map(([text, type]) => {
        if (!type) return escapeHTML(text) + '\n';
        // highlighted lines are block-level, so no trailing newline is needed
        return `<span class="highlight-line ${type}-line" style="display:block">${escapeHTML(text)}</span>`;
    }).join('');
}

// ===================== REAL MERGE FUNCTIONS (executed by the payloads) =====================
// Vulnerable: recursive merge with no key validation
function vulnerableMerge(target, source) {
    for (let key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key]) target[key] = {};
            vulnerableMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// Fixed: blocks dangerous keys + prototype-less target
const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];
function safeMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (BLOCKED_KEYS.includes(key)) continue;
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!Object.hasOwn(target, key)) target[key] = {};
            safeMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// ===================== PROTOTYPE SNAPSHOT / DIFF / RESTORE =====================
// Used so ANY payload (preset or typed by the user) can pollute Object.prototype
// for real during the test, then be detected and fully cleaned up afterwards.
function snapshotProto() {
    const snap = new Map();
    for (const name of Object.getOwnPropertyNames(Object.prototype)) {
        snap.set(name, Object.getOwnPropertyDescriptor(Object.prototype, name));
    }
    return snap;
}

function describeValue(v) {
    if (typeof v === 'function') return '[function]';
    try {
        const s = JSON.stringify(v);
        return s === undefined ? String(typeof v) : s;
    } catch (e) {
        return '[unprintable]';
    }
}

function collectChanges(snap) {
    const changes = [];
    for (const name of Object.getOwnPropertyNames(Object.prototype)) {
        const cur = Object.getOwnPropertyDescriptor(Object.prototype, name);
        const old = snap.get(name);
        if (!old) {
            changes.push({ name, kind: 'added', value: describeValue(cur.value) });
        } else if (old.value !== cur.value || old.get !== cur.get || old.set !== cur.set) {
            changes.push({ name, kind: 'modified', value: describeValue(cur.value) });
        }
    }
    return changes;
}

function restoreProto(snap) {
    for (const name of Object.getOwnPropertyNames(Object.prototype)) {
        if (!snap.has(name)) delete Object.prototype[name];
    }
    for (const [name, desc] of snap) {
        const cur = Object.getOwnPropertyDescriptor(Object.prototype, name);
        if (!cur || cur.value !== desc.value || cur.get !== desc.get || cur.set !== desc.set) {
            Object.defineProperty(Object.prototype, name, desc);
        }
    }
}

// ===================== PRESET PAYLOADS =====================
const PAYLOADS = {
    'Payload 1': {
        // Classic __proto__ pollution -> privilege escalation
        json: '{"__proto__": {"isAdmin": true}}',
        gadget: () => {
            const currentUser = { name: 'guest' };      // normal user, no isAdmin property
            return currentUser.isAdmin
                ? '🔓 <code>currentUser.isAdmin</code> is now <code>true</code>: a normal "guest" user is treated as ADMIN (privilege escalation).'
                : '';
        },
    },
    'Payload 2': {
        // constructor.prototype pollution -> DOM XSS gadget
        json: '{"constructor": {"prototype": {"html": "<img src=x onerror=alert(document.domain)>"}}}',
        gadget: () => {
            const widgetOptions = { title: 'Welcome' };  // developer never sets "html"
            return widgetOptions.html
                ? '💥 If the app does <code>element.innerHTML = widgetOptions.html</code>, this runs JavaScript in the victim\'s browser (DOM XSS).'
                : '';
        },
    },
};

// ===================== CORE: RUN ANY PAYLOAD =====================
function executePayload(jsonText, gadget) {
    
    const snap = snapshotProto();
    let changes = [];
    let gadgetMsg = '';
    let error = null;
    let probes = [];
    
    try {
        
        const parsed = JSON.parse(jsonText);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Payload must be a JSON object, e.g. {"__proto__": {"admin": true}}');
        }

        // Run the REAL merge function for the current mode
        if (isVulnerable) {
            vulnerableMerge({}, parsed);
        } else {
            safeMerge(Object.create(null), parsed);
        }

        // Read the results while the prototype is (possibly) polluted
        changes = collectChanges(snap);
        const fresh = {};   // a brand-new, empty object that never had these keys
        probes = changes.map(c => ({ name: c.name, value: describeValue(fresh[c.name]) }));
        if (gadget) gadgetMsg = gadget();
    } catch (err) {
        error = err;
    } finally {
        // Always clean up so the demo never breaks the real page
        restoreProto(snap);
    }

    // ----- Render the result (prototype is clean again here) -----
    const payloadLine = `<div><strong>Payload:</strong> <code>${escapeHTML(jsonText)}</code></div><br>`;

    if (error) {
        outputBox.className = 'output-box';
        outputBox.innerHTML = payloadLine + `❗ <strong>Invalid payload:</strong> ${escapeHTML(error.message)}`;
        return;
    }

    if (changes.length > 0) {
        const list = changes.map(c =>
            `• <code>Object.prototype.${escapeHTML(c.name)}</code> = <code>${escapeHTML(c.value)}</code> (${c.kind})`
        ).join('<br>');
        const proof = probes.map(p =>
            `<code>({}).${escapeHTML(p.name)}</code> → <code>${escapeHTML(p.value)}</code>`
        ).join('<br>');

        outputBox.className = 'output-box output-vuln';
        outputBox.innerHTML = payloadLine +
            `⚠️ <strong>CRITICAL: Prototype pollution succeeded!</strong><br>${list}<br><br>` +
            `<strong>Proof</strong> (a brand-new empty object inherits the attacker's values):<br>${proof}` +
            (gadgetMsg ? `<br><br>${gadgetMsg}` : '') +
            `<br><br><em>(The prototype was restored after this test.)</em>`;
    } else {
        outputBox.className = 'output-box output-fixed';
        outputBox.innerHTML = payloadLine + (isVulnerable
            ? `ℹ️ <strong>No pollution.</strong> This payload did not reach <code>Object.prototype</code>.<br>` +
              `Hint: use a <code>__proto__</code> or <code>constructor.prototype</code> key.`
            : `✅ <strong>Attack blocked.</strong> The dangerous keys were skipped, so <code>Object.prototype</code> is untouched.`);
    }
}

// Preset buttons (Payload 1 / Payload 2): also show the payload in the textbox
function runPayload(payloadName) {
    const p = PAYLOADS[payloadName];
    resetOutput();
    if (!p) return;
    payloadInput.value = p.json;
    // executePayload(p.json, p.gadget);
}

// Custom textbox
runCustomBtn.addEventListener('click', () => {
    executePayload(payloadInput.value.trim(), null);
});
payloadInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runCustomBtn.click();
});

// ===================== MODE SWITCHING =====================
function resetOutput() {
    outputBox.innerHTML = 'Waiting for action...';
    outputBox.className = 'output-box';
}

vulnBtn.addEventListener('click', () => {
    isVulnerable = true;
    vulnBtn.classList.add('active-vuln');
    fixedBtn.classList.remove('active-fixed');

    renderCode(VULN_CODE);
    codeExplanation.innerHTML =
        '<strong>Why it fails:</strong> <code>merge()</code> recursively copies every key, including ' +
        '<code>__proto__</code> and <code>constructor.prototype</code>. Attacker-controlled keys end up ' +
        'writing into <code>Object.prototype</code>, which every object inherits from.';
    resetOutput();
    payloadInput.value="";
    payloadInput.setAttribute("placeholder", '{"__proto__": {"role": "admin"}}');
});

fixedBtn.addEventListener('click', () => {
    isVulnerable = false;
    fixedBtn.classList.add('active-fixed');
    vulnBtn.classList.remove('active-vuln');

    renderCode(FIXED_CODE);
    codeExplanation.innerHTML =
        '<strong>The Fix:</strong> Dangerous keys (<code>__proto__</code>, <code>constructor</code>, ' +
        '<code>prototype</code>) are skipped, <code>Object.keys()</code> / <code>Object.hasOwn()</code> only ' +
        'touch own properties, and the target is created with <code>Object.create(null)</code> so it has no prototype to pollute.';
    resetOutput();
    payloadInput.value="";
    payloadInput.setAttribute("placeholder", '{"__proto__": {"role": "admin"}}');
});

// ===================== INITIAL RENDER =====================
renderCode(VULN_CODE);
