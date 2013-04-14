// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

function fireConvert(fileUri) {
  fileUri = 'fileUri=' + encodeURIComponent(fileUri);
  chrome.tabs.create({url: 'convert.html?' + fileUri})
}

chrome.contextMenus.create({
  'id': 'chrome-k2pdfopt-menu-id',
  'title': 'Convert PDF for Kindle',
  'contexts': ['page', 'link'],
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  var targetUrl = info['linkUrl'] || info['frameUrl'] || info['pageUrl'] ||
                  tab.url;
  fireConvert(targetUrl)
});
