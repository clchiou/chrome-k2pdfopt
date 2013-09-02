// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

var plugin = document.evaluate('//embed[@type="application/pdf"]',
    document, null, XPathResult.ANY_TYPE, null).iterateNext();
if (plugin) {
  chrome.runtime.sendMessage({type: 'popup', fileUri: plugin.src});
}
