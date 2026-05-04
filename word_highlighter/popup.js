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
          // Применяем замены на текущей странице
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {action: "applyReplacements"});
            }
          });
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

// Удалить все правила
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
      rulesListDiv.innerHTML = '<div class="empty-state"> Нет правил замены<br></div>';
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

// Удаление отдельного правила
function deleteReplaceRule(index, rule) {
  chrome.storage.local.get(['replaceRules'], (result) => {
    const rules = result.replaceRules || [];
    rules.splice(index, 1);
    chrome.storage.local.set({ replaceRules: rules }, () => {
      displayReplaceRules();
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "clearReplacements"});
          chrome.tabs.sendMessage(tabs[0].id, {action: "applyReplacements"});
        }
      });
      showNotification(`Правило "${rule.find} → ${rule.replace}" удалено`, 'info');
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) existingNotification.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

// Поддержка Enter
document.getElementById('findWordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addReplaceRuleBtn').click();
});
document.getElementById('replaceWordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addReplaceRuleBtn').click();
});

// Загрузка
displayReplaceRules();