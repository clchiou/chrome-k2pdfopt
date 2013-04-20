// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

function getFileUri(url) {
  var params = url.slice(url.indexOf('?') + 1).split('&');
  var pair;
  for (var i = 0; i < params.length; i++) {
    pair = params[i].split('=');
    if (pair[0] === 'fileUri') {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}

function onMessageCallback(message, sender, sendResponse) {
  var request = JSON.parse(message);
  if (request.type === 'popup') {
    chrome.pageAction.setPopup({
      tabId: sender.tab.id,
      popup: 'popup.html?fileUri=' + encodeURIComponent(request.fileUri),
    });
    chrome.pageAction.show(sender.tab.id);
  } else if (request.type === 'convert') {
    var fileUri = 'fileUri=' + encodeURIComponent(getFileUri(sender.tab.url));
    chrome.tabs.create({url: 'convert.html?' + fileUri})
  } else {
    console.log('Could not recognize message: ' + message);
  }
}

chrome.extension.onMessage.addListener(onMessageCallback);
