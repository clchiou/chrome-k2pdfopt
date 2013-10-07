// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function HttpGetter(fileUri) {
  var self = this;

  var deferred = null;

  var httpRequest = null;

  var pdfBlob = null;
  self.getPdfBlob = function() { return pdfBlob; }

  function get() {
    console.log('Start: HTTP GET: uri=' + fileUri);
    return $.Deferred(doHttpGet).promise();
  }
  self.get = get;

  function doHttpGet(deferred_arg) {
    // TODO(clchiou): Try jquery get
    deferred = deferred_arg;
    httpRequest = new XMLHttpRequest();
    httpRequest.responseType = 'blob';
    httpRequest.addEventListener('load', onHttpLoad, false);
    httpRequest.addEventListener('error', onHttpError, false);
    httpRequest.open('GET', fileUri, true);
    httpRequest.send();
  }

  function onHttpLoad(error) {
    // TODO(clchiou): Extend to other eBook format
    pdfBlob = httpRequest.response;
    if (pdfBlob.type === 'application/pdf') {
      STATUS.setProgress({type: 'file_downloaded'});
      deferred.resolve();
      console.log('Done : HTTP GET');
    } else {
      STATUS.showError('Could not convert non-PDF file ' + fileUri);
      deferred.reject();
    }
  }

  function onHttpError(error) {
    STATUS.showError('Could not download ' + fileUri);
    deferred.reject();
  }

  return self;
}
