// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function Converter() {
  this.fileUri = null;
  this.module = null;
  this.fetcher = null;
  this.dirLister = null;
  this.deferred = null;
  this.fileEntry = null;
}


Converter.prototype.onReady = function() {
  console.log('Start...');

  this.fileUri = getFileUri(window.location.href);
  if (!this.fileUri) {
    STATUS.showError('Could not find PDF URL.');
    return;
  }
  STATUS.showInfo('Convert ' + getBasename(this.fileUri) +
      ' for easy Kindle reading.');

  this.module = new NaclModule();
  this.fetcher = new FileFetcher(this.fileUri);
  this.dirLister = new DirLister(this.module);

  this.module.register(this.onRequest.bind(this));
  this.module.register(this.dirLister.onRequest.bind(this.dirLister));
  this.module.register(STATUS.onRequest.bind(STATUS));

  $.when(this.module.load(), this.fetcher.fetch()).then(
      this._onResolve.bind(this), this._onReject.bind(this));
}


Converter.prototype._onResolve = function() {
  console.log('Convert file ' + this.fileUri);
  this.module.startWatchDog();

  var outputPdf = getBasename(getPath(this.fileUri));
  this.fetcher.dirEntry.getFile(outputPdf, {create: true},
      this._onGetFile.bind(this), showFsError.bind(this));
}


Converter.prototype._onGetFile = function(fileEntry) {
  this.fileEntry = fileEntry;
  $.Deferred(this._doK2pdfopt.bind(this)).then(this._doneK2pdfopt.bind(this));
}


Converter.prototype._doK2pdfopt = function(deferred) {
  console.log('Start k2pdfopt...');
  this.deferred = deferred;
  this.module.postMessage(JSON.stringify({
    type: 'sys',
    action: 'k2pdfopt',
    input_path: this.fetcher.fileEntry.fullPath,
    output_path: this.fileEntry.fullPath
  }));
}


Converter.prototype._doneK2pdfopt = function() {
  console.log('Done k2pdfopt');
  this.module.postMessage(JSON.stringify({
    type: 'sys',
    action: 'quit'
  }));
  if (!STATUS.hasError) {
    window.open(this.fileEntry.toURL('application/pdf'), '_self');
  }
}


Converter.prototype._onReject= function() {
  console.log('Could not convert for some reason.');
  STATUS.showError('Could not convert for some reason.');
}


Converter.prototype.onRequest = function(request) {
  if (request.type   === 'info' &&
      request.name   === 'thread_completed' &&
      request.whoami === 'execute_k2pdfopt') {
    if (!this.deferred) {
      console.log('No promise to fulfill for convert');
      // TODO(clchiou): Show whatever that is converted?
    } else {
      this.deferred.resolve();
    }
    return true;
  }

  return false;
}


CONVERTER = new Converter();


function main() {
  STATUS.onReady();
  CONVERTER.onReady();
}


$(document).ready(main);
