// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function Status() {
  var self = this;

  var hasError = false;
  self.getHasError = function() { return hasError; }

  var numPages = null;

  function onReady() {
    $('#progressbar').progressbar({value: false});
  }
  self.onReady = onReady;

  function onRequest(request) {
    if (request.type === 'info' &&
        request.name === 'progress_read_pages') {
      numPages = request.num_pages;
      console.log('Status: Read pages: numPages=' + numPages);
      setProgress({type: 'pages_read'});
      return true;
    }

    if (request.type === 'info' &&
        request.name === 'progress_convert') {
      console.log('Status: Convert pages: pageIndex=' + request.page_index +
          ' numOutputPages=' + request.num_output_pages);
      setProgress({
        type: 'pages_converted',
        page_index: request.page_index
      });
      return true;
    }

    return false;
  }
  self.onRequest = onRequest;

  function showInfo(message) {
    console.log('Status: info=' + message);
    if (hasError) {
      return;
    }
    $('#messagebar')
      .addClass('ui-state-highlight')
      .html('<p>' +
          '<span id="message" class="ui-icon ui-icon-info"></span>' +
          '<strong>Info:</strong> ' + message +
          '</p>');
  }
  self.showInfo = showInfo;

  function showError(message) {
    console.log('Status: error=' + message);
    if (hasError) {
      return;
    }
    hasError = true;
    $('#progressbar').progressbar('value', false);
    $('#messagebar')
      .removeClass('ui-state-highlight')
      .addClass('ui-state-error')
      .html('<p>' +
          '<span id="message" class="ui-icon ui-icon-alert"></span>' +
          '<strong>Alert:</strong> ' + message +
          '</p>');
  }
  self.showError = showError;

  function setProgress(progress) {
    console.log('Status: progress=' + JSON.stringify(progress));
    if (hasError) {
      return;
    }
    var progressbar = $('#progressbar');
    var value = progressbar.progressbar('value');
    if (progress.type === 'nacl_module_loaded') {
      value += 5;
    } else if (progress.type === 'file_downloaded') {
      value += 2.5;
    } else if (progress.type === 'file_written') {
      value += 2.5;
    } else if (progress.type === 'pages_read') {
      value += 5;
    } else if (progress.type === 'pages_converted') {
      value = 15 + 85 * progress.page_index / numPages;
    }
    progressbar.progressbar('value', value);
  }
  self.setProgress = setProgress;

  return self;
}


STATUS = new Status();
