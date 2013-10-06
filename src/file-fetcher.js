// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function FileFetcher(fileUri) {
  // TODO(clchiou): Choose file name extension from mine type
  this.fileName = 'file.pdf';
  this.fileUri = fileUri;
  this.httpRequest = null;
  this.pdfBlob = null;
  this.fileSystem = null;
  this.dirEntry = null;
  this.fileEntry = null;
  this.deferredFetch = null;
  this.deferredHttpGet = null;
  this.deferredCreateInputFile = null;
}


FileFetcher.prototype.fetch = function() {
  return $.Deferred(this._doFetch.bind(this)).promise();
}


FileFetcher.prototype._doFetch = function(deferredFetch) {
  console.log('Fetch PDF file...');
  this.deferredFetch = deferredFetch;
  var promiseHttpGet = $.Deferred(this._doHttpGet.bind(this)).promise();
  var promiseCreateInputFile = $.Deferred(
      this._doCreateInputFile.bind(this)).promise();
  $.when(promiseHttpGet, promiseCreateInputFile).then(
      this._doWriteLocalFile.bind(this),
      this.deferredFetch.reject);
}


FileFetcher.prototype._doHttpGet = function(deferredHttpGet) {
  // TODO(clchiou): Try jquery get
  console.log('Do HTTP GET for ' + this.fileUri);
  this.deferredHttpGet = deferredHttpGet;
  this.httpRequest = new XMLHttpRequest();
  this.httpRequest.responseType = 'blob';
  this.httpRequest.addEventListener('load',
      this._onHttpLoad.bind(this), false);
  this.httpRequest.addEventListener('error',
      this._onHttpError.bind(this), false);
  this.httpRequest.open('GET', this.fileUri, true);
  this.httpRequest.send();
}


FileFetcher.prototype._onHttpLoad = function(error) {
  // TODO(clchiou): Extend to other eBook format
  console.log('On HTTP load...');
  this.pdfBlob = this.httpRequest.response;
  if (this.pdfBlob.type === 'application/pdf') {
    console.log('Receive HTTP response of a PDF file');
    STATUS.setProgress({type: 'file_downloaded'});
    this.deferredHttpGet.resolve();
  } else {
    console.log('Receive HTTP response, but it is not a PDF file');
    STATUS.showError('Could not convert non-PDF file ' + this.fileUri);
    this.deferredHttpGet.reject();
  }
}


FileFetcher.prototype._onHttpError = function(error) {
  STATUS.showError('Could not download ' + this.fileUri);
  this.deferredHttpGet.reject();
}


FileFetcher.prototype._doCreateInputFile = function(deferredCreateInputFile) {
  console.log('Create input file...');
  this.deferredCreateInputFile = deferredCreateInputFile;
  callWithFileSystem(this._onFsCreate.bind(this), this._onFsError.bind(this));
}


FileFetcher.prototype._onFsCreate = function(fileSystem) {
  console.log('Create file system...');
  this.fileSystem = fileSystem;
  // Use random directory name to avoid conflicts
  var dir = String(Math.random());
  fileSystem.root.getDirectory(dir, {create: true},
      this._onDirCreate.bind(this), this._onFsError.bind(this));
}


FileFetcher.prototype._onDirCreate = function(dirEntry) {
  console.log('On directory create...');
  this.dirEntry = dirEntry;
  this.dirEntry.getFile(this.fileName, {create: true},
      this._onFileCreate.bind(this), this._onFsError.bind(this));
}


FileFetcher.prototype._onFileCreate = function(fileEntry) {
  console.log('Create local file successfully');
  this.fileEntry = fileEntry;
  this.deferredCreateInputFile.resolve();
}


FileFetcher.prototype._onFsError = function(error) {
  showFsError(error);
  this.deferredCreateInputFile.reject();
}


FileFetcher.prototype._doWriteLocalFile = function() {
  console.log('Write PDF blob to local file...');
  this.fileEntry.createWriter(
      this._onWriter.bind(this), this._onWriteError.bind(this));
}


FileFetcher.prototype._onWriter = function(writer) {
  writer.onwriteend = (function(e) {
    console.log('Write PDF blob to disk successfully');
    STATUS.setProgress({type: 'file_written'});
    this.deferredFetch.resolve();
  }).bind(this);
  writer.onerror = (function (e) {
    var msg = 'Could not write to ' + this.fileName + ' due to ' + e.toString();
    console.log(msg);
    STATUS.showError(msg);
    this.deferredFetch.reject();
  }).bind(this);
  writer.write(this.pdfBlob);
}


FileFetcher.prototype._onWriteError = function(error) {
  showFsError(error);
  this.deferredFetch.reject();
}
