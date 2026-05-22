
const REPLACED_CLASS = 'word-replaced-mark';

const style = document.createElement('style');
style.textContent = `
  .${REPLACED_CLASS} {
    background-color: #90EE90 !important;
    font-weight: bold !important;
  }
  .${REPLACED_CLASS}::after {
    content: " 🔄";
  }
`;
document.head.appendChild(style);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function applyReplacements(rules) {
  if (!rules || rules.length === 0) return;
  
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  
  nodes.forEach(node => {
    let text = node.textContent;
    let changed = false;
    
    rules.forEach(rule => {
      const regex = new RegExp(`(${escapeRegex(rule.find)})`, 'gi');
      if (regex.test(text)) {
        changed = true;
        text = text.replace(regex, rule.replace);
      }
    });
    
    if (changed) {
      node.textContent = text;
    }
  });
}


function clearReplacements() {
  document.querySelectorAll(`.${REPLACED_CLASS}`).forEach(el => {
    const text = document.createTextNode(el.textContent);
    el.parentNode.replaceChild(text, el);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyReplacements") {
    chrome.storage.local.get(['replaceRules'], (result) => {
      clearReplacements();
      applyReplacements(result.replaceRules || []);
    });
  }
  if (request.action === "clearReplacements") {
    clearReplacements();
  }
  sendResponse({ok: true});
});

// Запуск при загрузке
chrome.storage.local.get(['replaceRules'], (result) => {
  if (result.replaceRules?.length) {
    setTimeout(() => applyReplacements(result.replaceRules), 200);
  }
});