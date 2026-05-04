console.log('✅ content.js загружен, проверяем chrome.storage');

// Проверка доступности API
function isStorageAvailable() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

// Функция с повторными попытками
function getStorage(callback, attempt = 0) {
  if (isStorageAvailable()) {
    callback();
  } else if (attempt < 10) {
    console.log(`chrome.storage недоступен, попытка ${attempt + 1}...`);
    setTimeout(() => getStorage(callback, attempt + 1), 100);
  } else {
    console.error('chrome.storage так и не стал доступен');
  }
}

// Константы
const REPLACED_CLASS = 'word-replaced-mark';

// Добавляем стили
const style = document.createElement('style');
style.textContent = `
  .${REPLACED_CLASS} {
    background-color: #90EE90 !important;
    font-weight: bold !important;
  }
`;
document.head.appendChild(style);

// Функция замены
function applyReplacements(rules) {
  console.log('applyReplacements вызвана с правилами:', rules);
  if (!rules || rules.length === 0) return;
  
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  
  nodes.forEach(node => {
    let text = node.textContent;
    let changed = false;
    
    rules.forEach(rule => {
      const regex = new RegExp(`\\b(${escapeRegex(rule.find)})\\b`, 'gi');
      if (regex.test(text)) {
        changed = true;
        text = text.replace(regex, `<span class="${REPLACED_CLASS}">${escapeHtml(rule.replace)}</span>`);
      }
    });
    
    if (changed) {
      const span = document.createElement('span');
      span.innerHTML = text;
      node.parentNode.replaceChild(span, node);
    }
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Слушаем сообщения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Сообщение в content.js:', request);
  if (request.action === "applyReplacements") {
    getStorage(() => {
      chrome.storage.local.get(['replaceRules'], (result) => {
        console.log('Правила из storage:', result.replaceRules);
        applyReplacements(result.replaceRules || []);
      });
    });
  }
  sendResponse({ok: true});
  return true;
});

// Инициализация при загрузке
getStorage(() => {
  chrome.storage.local.get(['replaceRules'], (result) => {
    console.log('Начальные правила:', result.replaceRules);
    if (result.replaceRules && result.replaceRules.length > 0) {
      setTimeout(() => applyReplacements(result.replaceRules), 500);
    }
  });
});