function highlightWords(wordsToHighlight) {
  if (!wordsToHighlight || wordsToHighlight.length === 0) return;
  
  // Проходим по всем текстовым узлам на странице
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Игнорируем уже обработанные узлы
        if (node.parentElement && node.parentElement.classList && 
            node.parentElement.classList.contains('highlighted-word')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const nodesToReplace = [];
  while (walker.nextNode()) {
    nodesToReplace.push(walker.currentNode);
  }
  
  nodesToReplace.forEach(node => {
    let text = node.textContent;
    let modified = false;
    
    wordsToHighlight.forEach(word => {
      const regex = new RegExp(`\\b(${escapeRegex(word)})\\b`, 'gi');
      if (regex.test(text)) {
        modified = true;
        text = text.replace(regex, match => {
          return `<span class="highlighted-word" style="font-weight: bold; background-color: yellow;">${match}</span>`;
        });
      }
    });
    
    if (modified) {
      const span = document.createElement('span');
      span.innerHTML = text;
      node.parentNode.replaceChild(span, node);
    }
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlight" && request.word) {
    chrome.storage.local.get(['words'], (result) => {
      highlightWords([request.word]);
    });
  } else if (request.action === "highlightAll") {
    chrome.storage.local.get(['words'], (result) => {
      highlightWords(result.words || []);
    });
  }
});

// При загрузке страницы выделяем все сохранённые слова
chrome.storage.local.get(['words'], (result) => {
  if (result.words && result.words.length > 0) {
    highlightWords(result.words);
  }
});