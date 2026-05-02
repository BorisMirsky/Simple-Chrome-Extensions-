// ========== Управление вкладками ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Обновляем активное содержимое
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// ========== Выделение слов ==========
// Добавление слова для выделения
document.getElementById('addHighlightBtn').addEventListener('click', () => {
  const word = document.getElementById('highlightWordInput').value.trim();
  if (word) {
    chrome.storage.local.get(['highlightWords'], (result) => {
      const words = result.highlightWords || [];
      if (!words.includes(word)) {
        words.push(word);
        chrome.storage.local.set({ highlightWords: words }, () => {
          document.getElementById('highlightWordInput').value = '';
          displayHighlightWords();
          // Отправляем на активную вкладку
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {action: "highlight", word: word});
            }
          });
          showNotification(`Слово "${word}" добавлено для выделения`, 'success');
        });
      } else {
        showNotification('Это слово уже есть в списке', 'warning');
      }
    });
  } else {
    showNotification('Пожалуйста, введите слово', 'error');
  }
});

// Применить выделение на странице
document.getElementById('highlightBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "highlightAll"});
      showNotification('Выделение обновлено', 'success');
    }
  });
});

// Очистить все выделения
document.getElementById('clearAllHighlightsBtn').addEventListener('click', () => {
  if (confirm('Удалить все слова из списка выделения?')) {
    chrome.storage.local.set({ highlightWords: [] }, () => {
      displayHighlightWords();
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "clearHighlights"});
        }
      });
      showNotification('Список выделения очищен', 'success');
    });
  }
});

// Отображение списка слов для выделения
function displayHighlightWords() {
  chrome.storage.local.get(['highlightWords'], (result) => {
    const words = result.highlightWords || [];
    const wordListDiv = document.getElementById('highlightWordList');
    
    if (words.length === 0) {
      wordListDiv.innerHTML = '<div class="empty-state">📝 Нет слов для выделения<br><small>Добавьте слово выше</small></div>';
      return;
    }
    
    wordListDiv.innerHTML = '';
    words.forEach((word, index) => {
      const wordItem = createWordItem(word, index, 'highlight');
      wordListDiv.appendChild(wordItem);
    });
  });
}

// ========== Замена слов ==========
// Добавление правила замены
document.getElementById('addReplaceRuleBtn').addEventListener('click', () => {
  const findWord = document.getElementById('findWordInput').value.trim();
  const replaceWord = document.getElementById('replaceWordInput').value.trim();
  
  if (findWord && replaceWord) {
    if (findWord === replaceWord) {
      showNotification('Исходное и заменяемое слово не могут быть одинаковыми', 'warning');
      return;
    }
    
    chrome.storage.local.get(['replaceRules'], (result) => {
      const rules = result.replaceRules || [];
      const exists = rules.some(rule => rule.find === findWord);
      
      if (!exists) {
        rules.push({ find: findWord, replace: replaceWord });
        chrome.storage.local.set({ replaceRules: rules }, () => {
          document.getElementById('findWordInput').value = '';
          document.getElementById('replaceWordInput').value = '';
          displayReplaceRules();
          showNotification(`Правило замены "${findWord} → ${replaceWord}" добавлено`, 'success');
        });
      } else {
        showNotification('Правило для этого слова уже существует', 'warning');
      }
    });
  } else {
    showNotification('Пожалуйста, заполните оба поля', 'error');
  }
});

// Применить замены на странице
document.getElementById('applyReplacementsBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "applyReplacements"});
      showNotification('Замены применены', 'success');
    }
  });
});

// Очистить все правила замены
document.getElementById('clearAllReplacementsBtn').addEventListener('click', () => {
  if (confirm('Удалить все правила замены?')) {
    chrome.storage.local.set({ replaceRules: [] }, () => {
      displayReplaceRules();
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "clearReplacements"});
        }
      });
      showNotification('Все правила замены удалены', 'success');
    });
  }
});

// Отображение правил замены
function displayReplaceRules() {
  chrome.storage.local.get(['replaceRules'], (result) => {
    const rules = result.replaceRules || [];
    const rulesListDiv = document.getElementById('replaceRulesList');
    
    if (rules.length === 0) {
      rulesListDiv.innerHTML = '<div class="empty-state">🔄 Нет правил замены<br><small>Добавьте правило выше</small></div>';
      return;
    }
    
    rulesListDiv.innerHTML = '';
    rules.forEach((rule, index) => {
      const ruleItem = document.createElement('div');
      ruleItem.className = 'word-item';
      
      const ruleText = document.createElement('span');
      ruleText.className = 'rule-text';
      ruleText.innerHTML = `<strong>${escapeHtml(rule.find)}</strong> <span class="rule-arrow">→</span> <strong style="color: #4CAF50;">${escapeHtml(rule.replace)}</strong>`;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Удалить';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', () => {
        deleteReplaceRule(index, rule);
      });
      
      ruleItem.appendChild(ruleText);
      ruleItem.appendChild(deleteBtn);
      rulesListDiv.appendChild(ruleItem);
    });
  });
}

// Удаление правила замены
function deleteReplaceRule(index, rule) {
  chrome.storage.local.get(['replaceRules'], (result) => {
    const rules = result.replaceRules || [];
    rules.splice(index, 1);
    chrome.storage.local.set({ replaceRules: rules }, () => {
      displayReplaceRules();
      // Обновляем страницу
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "removeReplacement", rule: rule});
          chrome.tabs.sendMessage(tabs[0].id, {action: "applyReplacements"});
        }
      });
      showNotification(`Правило "${rule.find} → ${rule.replace}" удалено`, 'info');
    });
  });
}

// Удаление слова из выделения
function deleteHighlightWord(index, word) {
  chrome.storage.local.get(['highlightWords'], (result) => {
    const words = result.highlightWords || [];
    words.splice(index, 1);
    chrome.storage.local.set({ highlightWords: words }, () => {
      displayHighlightWords();
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "removeHighlight", word: word});
          chrome.tabs.sendMessage(tabs[0].id, {action: "highlightAll"});
        }
      });
      showNotification(`Слово "${word}" удалено из выделения`, 'info');
    });
  });
}

// Создание элемента списка (общая функция)
function createWordItem(word, index, type) {
  const wordItem = document.createElement('div');
  wordItem.className = 'word-item';
  
  const wordText = document.createElement('span');
  wordText.className = 'word-text';
  wordText.textContent = word;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.className = 'delete-btn';
  deleteBtn.addEventListener('click', () => {
    if (type === 'highlight') {
      deleteHighlightWord(index, word);
    }
  });
  
  wordItem.appendChild(wordText);
  wordItem.appendChild(deleteBtn);
  return wordItem;
}

// Вспомогательные функции
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Поддержка Enter
document.getElementById('highlightWordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addHighlightBtn').click();
});

document.getElementById('findWordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addReplaceRuleBtn').click();
});

document.getElementById('replaceWordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addReplaceRuleBtn').click();
});

// Загрузка данных при открытии
displayHighlightWords();
displayReplaceRules();