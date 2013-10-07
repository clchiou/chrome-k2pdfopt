// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


// TODO(clchiou): Let user customize settings (width, height, etc.)
function main() {
  $('#convert a').click(function () {
    var model = null;
    if (!$('#config').is(':hidden')) {
      var elem = window.document.getElementById('config-model');
      model = elem.selectedOptions[0].value;
    }
    console.log('Popup: model=' + model);
    chrome.runtime.sendMessage({
      type: 'convert',
      url: document.location.href,
      model: model
    });
  });

  $('#config-icon div').hover(function () {
    $(this).addClass('ui-state-hover');
  }, function () {
    $(this).removeClass('ui-state-hover');
  }).click(function () {
    $('#config').toggle();
  });
}


$(document).ready(main);
