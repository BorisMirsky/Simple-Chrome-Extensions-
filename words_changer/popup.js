// Добавление слова
document.getElementById('addBtn').addEventListener('click', () => {
  const word = document.getElementById('wordInput').value.trim();
  if (word) {
    chrome.storage.local.get(['words'], (result) => {
      const words = result.words || [];
      if (!words.includes(word)) {
        words.push(word);
        chrome.storage.local.set({ words: words }, () => {
          displayWords();
          // Отправляем сообщение на активную вкладку для немедленного выделения
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "highlight", word: word});
          });
        });
      }
    });
  }
});

// Принудительное выделение всех слов на странице
document.getElementById('highlightBtn').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "highlightAll"});
  });
});

function displayWords() {
  chrome.storage.local.get(['words'], (result) => {
    const words = result.words || [];
    document.getElementById('wordList').innerHTML = words.join(', ');
  });
}

displayWords();