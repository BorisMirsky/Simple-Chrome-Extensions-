// Глобальные константы
const HIGHLIGHT_CLASS = 'word-highlighter-mark';
const REPLACED_CLASS = 'word-replaced-mark';
const HIGHLIGHT_STYLE = `
  .${HIGHLIGHT_CLASS} {
    font-weight: bold !important;
    background-color: yellow !important;
    color: inherit !important;
    display: inline !important;
    transition: all 0.2s;
  }
  .${REPLACED_CLASS} {
    font-weight: bold !important;
    background-color: #90EE90 !important;
    color: #000 !important;
    display: inline !important;
    transition: all 0.2s;
    position: relative;
  }
  .${REPLACED_CLASS}:hover {
    background-color: #7CCD7C !important;
    cursor: help;
  }
  .${REPLACED_CLASS}::after {
    content: " 🔄";
    font-size: 0.9em;
    opacity: 0.7;
  }
  .tooltip {
    position: absolute;
    background: #333;
    color: #fff;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
    display: none;
  }
`;

// Добавляем стили
function addStyles() {
  if (!document.querySelector('#word-helper-styles')) {
    const style = document.createElement('style');
    style.id = 'word-helper-styles';
    style.textContent = HIGHLIGHT_STYLE;
    document.head.appendChild(style);
  }
}

// ========== Улучшенная функция замены с сортировкой правил ==========
function applyReplacements1(rules) {
  if (!rules || rules.length === 0) return;
  
  // ВАЖНО: Сортируем правила по длине исходного слова (от длинных к коротким)
  // Это предотвращает проблемы с перекрывающимися заменами
  const sortedRules = [...rules].sort((a, b) => b.find.length - a.find.length);
  
  const textNodes = getTextNodes(document.body, true);
  let replacedCount = 0;
  const processedRanges = []; // Отслеживаем уже обработанные диапазоны
  
  textNodes.forEach(node => {
    let text = node.textContent;
    let modified = false;
    let lastIndex = 0;
    let result = '';
    
    // Создаём карту замен для этого узла
    const replacements = [];
    
    // Находим все совпадения для всех правил
    sortedRules.forEach(rule => {
      const regex = new RegExp(`\\b(${escapeRegex(rule.find)})\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // Проверяем, не перекрывается ли это совпадение с уже найденными
        const isOverlapping = replacements.some(r => 
          (match.index >= r.start && match.index < r.end) ||
          (r.start >= match.index && r.start < match.index + match[0].length)
        );
        
        if (!isOverlapping) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            original: match[0],
            replacement: rule.replace
          });
        }
      }
    });
    
    // Сортируем замены по начальной позиции
    replacements.sort((a, b) => a.start - b.start);
    
    // Применяем замены
    if (replacements.length > 0) {
      modified = true;
      let lastPos = 0;
      let htmlResult = '';
      
      replacements.forEach(rep => {
        // Добавляем текст до замены
        htmlResult += escapeHtml(text.substring(lastPos, rep.start));
        // Добавляем заменённый текст с подсветкой
        htmlResult += `<span class="${REPLACED_CLASS}" data-original="${escapeHtml(rep.original)}" data-replaced="${escapeHtml(rep.replacement)}">${escapeHtml(rep.replacement)}</span>`;
        lastPos = rep.end;
        replacedCount++;
      });
      
      // Добавляем оставшийся текст
      htmlResult += escapeHtml(text.substring(lastPos));
      
      if (htmlResult !== text) {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = htmlResult;
        node.parentNode.replaceChild(wrapper, node);
      }
    }
  });
  
  if (replacedCount > 0) {
    console.log(`✅ Применено ${replacedCount} замен (с учётом разной длины слов)`);
  }
  return replacedCount;
}


// ========== Упрощённая и исправленная функция замены ==========
function applyReplacements(rules) {
  console.log('applyReplacements вызвана с правилами:', rules);
  
  if (!rules || rules.length === 0) {
    console.log('Нет правил замены');
    return;
  }
  
  // Сортируем от длинных к коротким
  const sortedRules = [...rules].sort((a, b) => b.find.length - a.find.length);
  
  // Получаем все текстовые узлы
  const textNodes = getTextNodes(document.body, true);
  console.log('Найдено текстовых узлов:', textNodes.length);
  
  let totalReplacements = 0;
  
  textNodes.forEach(node => {
    let text = node.textContent;
    let modified = false;
    
    sortedRules.forEach(rule => {
      const regex = new RegExp(`\\b(${escapeRegex(rule.find)})\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        modified = true;
        totalReplacements += matches.length;
        text = text.replace(regex, (match) => {
          console.log(`Замена: "${match}" → "${rule.replace}"`);
          return `<span class="${REPLACED_CLASS}" data-original="${escapeHtml(match)}" data-replaced="${escapeHtml(rule.replace)}">${escapeHtml(rule.replace)}</span>`;
        });
      }
    });
    
    if (modified) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = text;
      node.parentNode.replaceChild(wrapper, node);
    }
  });
  
  console.log(`✅ Выполнено замен: ${totalReplacements}`);
}



// ========== Обработка замен с разной длиной в динамическом контенте ==========
let pendingUpdate = false;
let updateTimeout = null;

function safeReplaceAndHighlight() {
  if (pendingUpdate) return;
  pendingUpdate = true;
  
  // Используем debounce для оптимизации
  if (updateTimeout) clearTimeout(updateTimeout);
  
  updateTimeout = setTimeout(() => {
    chrome.storage.local.get(['highlightWords', 'replaceRules'], (result) => {
      // Сохраняем позицию скролла
      const scrollPos = window.scrollY;
      
      // Временно отключаем MutationObserver, чтобы избежать циклов
      if (observer) observer.disconnect();
      
      // Применяем изменения
      if (result.highlightWords && result.highlightWords.length > 0) {
        clearAllHighlights();
        highlightWords(result.highlightWords);
      }
      
      if (result.replaceRules && result.replaceRules.length > 0) {
        clearReplacements();
        applyReplacements(result.replaceRules);
      }
      
      // Восстанавливаем позицию скролла
      window.scrollTo(0, scrollPos);
      
      // Включаем observer обратно
      if (observer) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
      
      pendingUpdate = false;
    });
  }, 300);
}

// ========== Улучшенная функция получения текстовых узлов ==========
function getTextNodes(node, includeReplaced = false) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Пропускаем пустые узлы
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Пропускаем узлы внутри определённых тегов
        if (node.parentElement) {
          const parentTag = node.parentElement.tagName;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || 
              parentTag === 'CODE' || parentTag === 'PRE' ||
              parentTag === 'TEXTAREA' || parentTag === 'INPUT') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Пропускаем уже обработанные узлы (если не нужно их включать)
          if (node.parentElement.classList) {
            if (node.parentElement.classList.contains(HIGHLIGHT_CLASS)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!includeReplaced && node.parentElement.classList.contains(REPLACED_CLASS)) {
              return NodeFilter.FILTER_REJECT;
            }
          }
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  
  return textNodes;
}

// ========== Вспомогательные функции ==========
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearAllHighlights() {
  const highlightedElements = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlightedElements.forEach(element => {
    const textNode = document.createTextNode(element.textContent);
    element.parentNode.replaceChild(textNode, element);
  });
}

function clearReplacements() {
  const replacedElements = document.querySelectorAll(`.${REPLACED_CLASS}`);
  replacedElements.forEach(element => {
    const originalText = element.getAttribute('data-original') || element.textContent;
    const textNode = document.createTextNode(originalText);
    element.parentNode.replaceChild(textNode, element);
  });
}

function highlightWords(wordsToHighlight) {
  if (!wordsToHighlight || wordsToHighlight.length === 0) return;
  
  const textNodes = getTextNodes(document.body, false);
  
  textNodes.forEach(node => {
    let text = node.textContent;
    let modified = false;
    
    wordsToHighlight.forEach(word => {
      const regex = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'gi');
      if (regex.test(text)) {
        modified = true;
        text = text.replace(regex, match => {
          return `<span class="${HIGHLIGHT_CLASS}" data-original="${match}">${match}</span>`;
        });
      }
    });
    
    if (modified) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = text;
      node.parentNode.replaceChild(wrapper, node);
    }
  });
}

function removeHighlightForWord(wordToRemove) {
  const highlightedElements = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlightedElements.forEach(element => {
    if (element.textContent.toLowerCase() === wordToRemove.toLowerCase()) {
      const textNode = document.createTextNode(element.textContent);
      element.parentNode.replaceChild(textNode, element);
    }
  });
}

// ========== Обработка сообщений ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Получено сообщение:', request);
  
  switch(request.action) {
    case "highlightAll":
      safeReplaceAndHighlight();
      break;
      
    case "applyReplacements":
      safeReplaceAndHighlight();
      break;
      
    case "clearHighlights":
      clearAllHighlights();
      break;
      
    case "clearReplacements":
      clearReplacements();
      break;
      
    case "removeHighlight":
      if (request.word) {
        removeHighlightForWord(request.word);
      }
      break;
      
    default:
      console.log('Неизвестное действие:', request.action);
  }
  
  sendResponse({success: true});
  return true;
});

// ========== Инициализация с observer ==========
let observer = null;

function initialize() {
  addStyles();
  
  // Первоначальное применение
  setTimeout(() => {
    chrome.storage.local.get(['highlightWords', 'replaceRules'], (result) => {
      if (result.highlightWords && result.highlightWords.length > 0) {
        highlightWords(result.highlightWords);
      }
      if (result.replaceRules && result.replaceRules.length > 0) {
        applyReplacements(result.replaceRules);
      }
    });
  }, 100);
  
  // Наблюдаем за изменениями DOM
  observer = new MutationObserver((mutations) => {
    // Проверяем, есть ли реальные изменения текста
    let hasTextChanges = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        hasTextChanges = true;
        break;
      }
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE || 
              (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim())) {
            hasTextChanges = true;
            break;
          }
        }
      }
    }
    
    if (hasTextChanges) {
      safeReplaceAndHighlight();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}