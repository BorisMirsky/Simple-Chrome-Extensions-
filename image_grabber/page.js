
chrome.runtime.onMessage
    .addListener(function(message,sender,sendResponse) { 
        addImagesToContainer(message);               
        sendResponse("OK");
    });

/**
 * Функция, которая будет генерировать HTML-разметку
 * списка изображений
 * @ param {} urls - Массив путей к изображениям
 */


function addImagesToContainer(urls) {
    // TODO Создать HTML-разметку в элементе <div> с
    // классом container для показа
    // списка изображений и выбора изображений,
    // для выгрузки в ZIP-архив
    document.write(JSON.stringify(urls));
}