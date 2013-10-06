// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function Status() {
  this.hasError = false;
  this.numPages = null;
}


Status.prototype.onReady = function() {
  $('#progressbar').progressbar({value: false});
}


Status.prototype.onRequest = function(request) {
  if (request.type === 'info' &&
      request.name === 'progress_read_pages') {
    console.log('Read ' + request.num_pages + ' pages');
    this.numPages = request.num_pages;
    this.setProgress({type: 'pages_read'});
    return true;
  }

  if (request.type === 'info' &&
      request.name === 'progress_convert') {
    console.log('Convert page ' + request.page_index + ', generated ' +
        request.num_output_pages + ' pages');
    this.setProgress({
      type: 'pages_converted',
      page_index: request.page_index
    });
    return true;
  }

  return false;
}


Status.prototype.showInfo = function(message) {
  if (this.hasError) {
    return;
  }
  $('#messagebar')
    .addClass('ui-state-highlight')
    .html('<p>' +
        '<span id="message" class="ui-icon ui-icon-info"></span>' +
        '<strong>Info:</strong> ' + message +
        '</p>');
}


Status.prototype.showError = function(message) {
  if (this.hasError) {
    return;
  }
  this.hasError = true;
  $('#progressbar').progressbar('value', false);
  $('#messagebar')
    .removeClass('ui-state-highlight')
    .addClass('ui-state-error')
    .html('<p>' +
        '<span id="message" class="ui-icon ui-icon-alert"></span>' +
        '<strong>Alert:</strong> ' + message +
        '</p>');
}


Status.prototype.setProgress = function(progress) {
  if (this.hasError) {
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
    value = 15 + 85 * progress.page_index / this.numPages;
  }
  progressbar.progressbar('value', value);
}


STATUS = new Status();
