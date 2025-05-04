// Configuration
const TOXICITY_THRESHOLD = 0.7;
let isEnabled = true;
let model = null;

// Lightweight hate speech patterns (first line of defense)
const TOXIC_PATTERNS = [
  /\b(nigg|fag|retard|chink|spic|kike)\w*\b/i,
  /\b(kill|die|rape)\s+(yourself|u|you)\b/i,
  /\b(you('re|r)?\s+(ugly|fat|stupid|worthless)\b/i,
  /\b(women|jews|blacks?)\s+(should|must)\s+(die|burn)\b/i
];

// Initialize
chrome.storage.local.get(['enabled', 'useML'], initExtension);

async function initExtension({enabled = true, useML = false}) {
  isEnabled = enabled;
  if (isEnabled && useML) await loadModel();
  scanPage();
}

// Load TensorFlow.js model (only when needed)
async function loadModel() {
  if (model) return;
  
  // Load from embedded data (example - replace with your actual model data)
  const modelJson = {
    "modelTopology": {/*...*/},
    "weightsManifest": [{"paths":["group1-shard1of1.bin"]}]
  };
  
  model = await tf.loadGraphModel(
    tf.io.fromMemory(modelJson),
    {weightUrlConverter: () => "data:application/octet-stream;base64,ABCD..."}
  );
}

// Hybrid detection (patterns + ML)
async function isToxic(text) {
  // Fast pattern check first
  if (TOXIC_PATTERNS.some(regex => regex.test(text))) return true;
  
  // ML check if available
  if (model) {
    const input = tf.tensor([text]);
    const prediction = await model.predict(input);
    return prediction.dataSync()[0] > TOXICITY_THRESHOLD;
  }
  
  return false;
}

// Optimized page scanning
function scanPage() {
  if (!isEnabled) return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const batch = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue.trim();
    if (text) batch.push({node, text});
    
    // Process in batches of 20
    if (batch.length >= 20) {
      processBatch(batch.splice(0, 20));
    }
  }
  if (batch.length) processBatch(batch);
}

// Async batch processing
async function processBatch(items) {
  const promises = items.map(async ({node, text}) => {
    if (await isToxic(text)) blurNode(node);
  });
  await Promise.all(promises);
}

function blurNode(node) {
  if (node.parentNode.classList.contains('modari-blur')) return;
  
  const span = document.createElement('span');
  span.className = 'modari-blur';
  span.style.cssText = `
    filter: blur(5px);
    transition: filter 0.3s;
    cursor: pointer;
  `;
  span.title = "Hate speech detected (click to unblur)";
  span.onclick = (e) => {
    e.stopPropagation();
    span.replaceWith(span.textContent);
  };
  span.textContent = node.nodeValue;
  node.parentNode.replaceChild(span, node);
}

function removeBlurs() {
  document.querySelectorAll('.modari-blur').forEach(el => {
    el.replaceWith(el.textContent);
  });
}

// Event Listeners
chrome.storage.onChanged.addListener((changes) => {
  if ('enabled' in changes) {
    isEnabled = changes.enabled.newValue;
    if (isEnabled) scanPage();
    else removeBlurs();
  }
  if ('useML' in changes && changes.useML.newValue && isEnabled) {
    loadModel().then(scanPage);
  }
});

// Optimized mutation observer
const observer = new MutationObserver((mutations) => {
  if (isEnabled) {
    const shouldScan = mutations.some(mut => 
      mut.addedNodes.length > 0 || 
      mut.type === 'characterData'
    );
    if (shouldScan) scanPage();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Initial scan with debounce
let scanTimer;
function debouncedScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanPage, 500);
}
window.addEventListener('load', debouncedScan);