
let isVulnerable = true;

const vulnBtn = document.getElementById("vuln-btn");
const fixedBtn = document.getElementById("fixed-btn");
let targetLine = document.getElementById("target-line");
const codeExplanation = document.getElementById("code-explanation");
const outputBox = document.getElementById("simulation-output");
const emailInput = document.getElementById("emailInput");
const codeSection = document.getElementById("code-display");

//------------------Activate Vulnerable Mood
vulnBtn.addEventListener("click", () => {
  isVulnerable = true;

 vulnBtn.classList.add("active-vuln");
 fixedBtn.classList.remove("active-fixed");

codeSection.innerHTML = `function handleEmailSubmit(emailInput) {
if (isVulnerable) { <span class="highlight-line vuln-line" id="target-line">let regex = /^([a-zA-Z0-9]+)+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/; </span> 
 let attackType = getAttackType(userInput);
 if (attackType === "heavy") {
  outputBox.innerHTML = \`CRITICAL: Heavy ReDoS Attack detected!.\`;
  regex.test(userInput);
 }else if (attackType === "medium") {
       outputBox.innerHTML = \`WARNING: Medium ReDoS detected!\`;
       regex.test(userInput);
 }
 if (regex.test(userInput)) {
   outputBox.innerHTML = \`<strong>Valid Email:</strong> Normal email passed.\`;
 }else {
   outputBox.innerHTML = \`<strong>Invalid:</strong> Email format is incorrect.\`; }}}`;

  targetLine = document.getElementById("target-line");

  targetLine.className = "highlight-line vuln-line";
  targetLine.innerText = "let regex = /^([a-zA-Z0-9]+)+@[a-zA-Z0-9]+\\.[a-zA-Z]{2,}$/;";
  codeExplanation.innerHTML =
    `<strong>Why it fails:</strong><br>The regular expression has nested repetition which causes catastrophic backtracking on long inputs ,freezing execution.`;

  outputBox.innerHTML = "Waiting for action...";
  outputBox.className = "output-box";
  
  emailInput.value ="";
  resetTree();
});


//-----------------Activate Fixed Mood
fixedBtn.addEventListener("click", () => {
  isVulnerable = false;

  fixedBtn.classList.add("active-fixed");
  vulnBtn.classList.remove("active-vuln");
  
 codeSection.innerHTML = `function handleEmailSubmit(userInput) { 
if (isVulnerable == false) { <span class="highlight-line fixed-line" id="target-line">let regex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]{2,}$/; </span>
 const start = performance.now();
 const isValid = regex.test(userInput);
 const duration = performance.now() - start;
 let attackType = getAttackType(userInput);
 if (isValid) {
      outputBox.innerHTML = \` <strong>SECURE :</strong> Valid email accepted safely.\`;
 } else {
      if (attackType === "medium" || attackType == "heavy")
        outputBox.innerHTML = \` <strong>BLOCKED :</strong> Possible ReDoS Attack.\`;
   else
        outputBox.innerHTML = \` <strong>BLOCKED :</strong> Invalid format.\`;
 }}}`;

    targetLine = document.getElementById("target-line");

  targetLine.className = "highlight-line fixed-line";
  targetLine.innerText = "let regex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]{2,}$/;";
  
  codeExplanation.innerHTML =`<strong>The Fix:</strong><br> Removing nested repetition avoids catastrophic backtracking so regex matching stays linear.`;

  outputBox.innerHTML = "Waiting for action...";
  outputBox.className = "output-box";
  
  emailInput.value ="";
  resetTree();
});

// ----------------To activate the payload buttons
function runPayload(payloadName) {
  const yourEmail = document.getElementById("emailInput");

  if (payloadName == "Payload1") {
    yourEmail.value = "testEmail@gmail.com";
  } else if (payloadName == "Payload2") {
    yourEmail.value = "aaaaaaaaaaaaaaaaaaaaaaaaaa!"; 
  } else if (payloadName == "Payload3") {
    yourEmail.value =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"; 
  }
}

//--------------To determine the type of attack (Medium or Heavy)
function getAttackType(userInput) {
  if (userInput.length > 35) {
    return "heavy";
  } else if (userInput.length > 25) {
    return "medium";
  }
  return "none";
}

//-------------To handle the submit button
function handleEmailSubmit(event) {
  event.preventDefault();
  //const emailInput = document.getElementById("emailInput");
  const userInput = emailInput.value.trim();
  const outputBox = document.getElementById("simulation-output"); 

  outputBox.innerHTML = " ";
  outputBox.className = "output-box";
  
  let regex;
  
  //--Vulnerable Mode--
  if (isVulnerable) {
    regex = /^([a-zA-Z0-9]+)+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;
    let attackType = getAttackType(userInput);
    
    if (attackType === "heavy") {
      outputBox.innerHTML = ` <strong>CRITICAL :</strong> Heavy ReDoS Attack Successful! <br>Payload triggered vulnerability.`;
      outputBox.className = "output-box attack-success";
      
      requestAnimationFrame(() => {
        setTimeout(() => {
            regex.test(userInput);
        } , 50);
      });
      
      return;
    } 
    else if (attackType === "medium") {
      outputBox.innerHTML = ` <strong>WARNING :</strong> Medium ReDoS Payload detected!`;
      outputBox.className = "output-box attack-success";
      regex.test(userInput);
      return;
    }
    
    let isValid = regex.test(userInput);
    if (isValid) {
      outputBox.innerHTML = ` <strong>Valid Email :</strong> Normal email passed successfully.`;
      outputBox.className = "output-box attack-blocked";
    } 
    else {
      outputBox.innerHTML = ` <strong>Invalid :</strong> Email format is incorrect.`;
      outputBox.className = "output-box";
    }
  }
  //--Fixed Mode--
  else {
    regex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/;
    
    const start = performance.now();
    let isValid = regex.test(userInput);
    const duration = performance.now() - start;

    let attackType = getAttackType(userInput);
    
    if (isValid) {
      outputBox.innerHTML = ` <strong>SECURE :</strong> Valid email accepted safely.<br>Duration time : `+ duration;
      outputBox.className = "output-box attack-blocked";
    } else {
	 if (attackType === "medium" || attackType === "heavy")
            outputBox.innerHTML = ` <strong>BLOCKED :</strong> Possible ReDoS Attack rejected.<br>Duration time : `+ duration;
         else
            outputBox.innerHTML = ` <strong>BLOCKED :</strong> Invalid format rejected.<br>Duration time : `+ duration;

	outputBox.className = "output-box attack-blocked";
    }
  }
}



// #################### Backtracking  Visualizer ####################
// =====================================================
// Backtracking Visualizer (educational drawing only)
// It does NOT run the real regex engine steps; it redraws
// the same idea: ([a-zA-Z0-9]+)+ can split the text in many ways.
// =====================================================

const btInput = document.getElementById("btInput");
const btStart = document.getElementById("btStart");
const btOutput = document.getElementById("bt-output");

const BT_MAX = 6; // max chars drawn (more = too wide)
const SAFE_CHECK = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/; // linear, only used to know if the email matches
const SVG_NS = "http://www.w3.org/2000/svg";

let btTimer = null;

function resetTree() {
  clearInterval(btTimer);
  btOutput.innerHTML = "Enter text and press Start...";
}

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    e.setAttribute(k, attrs[k]);
  }
  if (parent) {
    parent.appendChild(e);
  }
  return e;
}

btStart.addEventListener("click", drawBacktrackTree);
btInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    drawBacktrackTree();
  }
});

function drawBacktrackTree() {
  clearInterval(btTimer);
  const input = btInput.value.trim();
  btOutput.innerHTML = "";

  // The part that ([a-zA-Z0-9]+)+ tries to split
  let run = 0;
  while (run < input.length && /[a-zA-Z0-9]/.test(input[run])) {
    run++;
  }

  if (run === 0) {
    btOutput.textContent = "Nothing to backtrack: the text must start with letters or digits.";
    return;
  }

  const n = Math.min(run, BT_MAX);
  const prefix = input.slice(0, n);
  const failChar = run < input.length ? input[run] : "end";
  const matches = SAFE_CHECK.test(input);
  const singlePath = !isVulnerable; // fixed mode: no nested group = only one way to match

  // ---- Build the tree + the list of animation steps (depth-first, greedy first) ----
  let root = null;
  let leaves = 0;
  const steps = [];

  function build(pos, parent, depth, label) {
    const node = {
      label: label,
      depth: depth,
      kids: [],
      x: 0
    };

    if (!parent) {
      root = node;
    } else {
      parent.kids.push(node);
    }

    steps.push(["show", node, parent]);

    // Reached the end of the group part
    if (pos === n) {
      node.leaf = true;
      node.x = leaves++;
      steps.push([matches ? "ok" : "fail", node]);
      return matches; // a match stops the search
    }

    const lowest = singlePath ? n - pos : 1;
    for (let k = n - pos; k >= lowest; k--) {
      if (build(pos + k, node, depth + 1, prefix.slice(pos, pos + k))) {
        return true;
      }
      steps.push(["back", node]);
    }

    return false;
  }

  build(0, null, 0, "start");

  // ---- Layout: leaves get slots, parents sit in the middle of their children ----
  (function place(node) {
    if (node.leaf) return;
    node.kids.forEach(place);
    node.x = (node.kids[0].x + node.kids[node.kids.length - 1].x) / 2;
  })(root);

  const GAP = 60;
  const LEVEL = 62;
  const W = Math.max(leaves, 1) * GAP + 20;
  const H = 30 + n * LEVEL + 50;

  const note = document.createElement("div");
  note.className = "bt-note";

  const holder = document.createElement("div");
  btOutput.appendChild(note);
  btOutput.appendChild(holder);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${W} ${H}`,
    width: W,
    height: H
  }, holder);

  const edges = svgEl("g", {}, svg);
  const nodes = svgEl("g", {}, svg);

  const X = (nd) => 30 + nd.x * GAP;
  const Y = (nd) => 26 + nd.depth * LEVEL;

  // ---- Play the steps one by one ----
  let i = 0;
  let lastBack = null;

  btTimer = setInterval(() => {
    if (lastBack) {
      lastBack.classList.remove("bt-back");
      lastBack = null;
    }

    if (i >= steps.length) {
      clearInterval(btTimer);
      if (singlePath) {
        note.textContent = "Fixed regex: one single path, no nested group, so no backtracking explosion.";
      } else if (matches) {
        note.textContent = "Match found on the first path: no heavy backtracking needed.";
      } else {
        const real = Math.pow(2, run - 1).toLocaleString();
        note.textContent = `All ${leaves} splits failed.` +
          (run > n ? ` (Drawn: first ${n} chars only. Your ${run} chars = ${real} splits!)` : "");
      }
      return;
    }

    const [type, nd, parent] = steps[i++];

    if (type === "show") {
      if (parent) {
        svgEl("line", {
          class: "bt-edge",
          x1: X(parent),
          y1: Y(parent) + 12,
          x2: X(nd),
          y2: Y(nd) - 12
        }, edges);
      }

      const g = svgEl("g", { class: "bt-node" }, nodes);
      svgEl("rect", {
        x: X(nd) - 24,
        y: Y(nd) - 12,
        width: 48,
        height: 24,
        rx: 6
      }, g);

      svgEl("text", {
        x: X(nd),
        y: Y(nd) + 4,
        "text-anchor": "middle"
      }, g).textContent = nd.label;

      nd.el = g;
      note.textContent = `Try group (${nd.label})`;

    } else if (type === "fail") {
      nd.el.classList.add("bt-fail");
      svgEl("text", {
        x: X(nd),
        y: Y(nd) + 30,
        "text-anchor": "middle"
      }, nd.el).textContent = "\u274C";

      note.textContent = `\u274C Next char '${failChar}' does not match, so backtrack`;

    } else if (type === "ok") {
      nd.el.classList.add("bt-ok");
      svgEl("text", {
        x: X(nd),
        y: Y(nd) + 30,
        "text-anchor": "middle"
      }, nd.el).textContent = "\u2705";

      note.textContent = "\u2705 Match";

    } else {
      nd.el.classList.add("bt-back");
      lastBack = nd.el;
      note.textContent = `\u21A9 Back to (${nd.label}): shorten the group and try another split`;
    }
  }, 380);
}

