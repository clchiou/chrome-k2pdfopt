// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

function main() {
  $('#convert a').click(function () {
    chrome.runtime.sendMessage({
      type: 'convert',
      url: document.location.href
    });
  });
  $('#config div').hover(function () {
    $(this).addClass('ui-state-hover');
  }, function () {
    $(this).removeClass('ui-state-hover');
  }).click(function () {
    // TODO(clchiou): Bring up config window
  });
}

$(document).ready(main);
