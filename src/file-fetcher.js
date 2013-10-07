// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function FileFetcher(fileUri) {
  var self = this;

  var deferred = null;

  // TODO(clchiou): Choose file name extension from mine type
  var fileName = 'file.pdf';

  var getter = null;

  var toucher = null;
  self.getDirEntry = function() { return toucher.getDirEntry(); }
  self.getFileEntry = function() { return toucher.getFileEntry(); }

  function fetch() {
    console.log('Start: Fetch file: uri=' + fileUri);
    return $.Deferred(doFetch).promise();
  }
  self.fetch = fetch;

  function doFetch(deferred_arg) {
    deferred = deferred_arg;
    getter = new HttpGetter(fileUri);
    toucher = new FileToucher(fileName);
    $.when(getter.get(), toucher.touch()).then(
        doWriteLocalFile, deferred.reject);
  }

  function doWriteLocalFile() {
    toucher.getFileEntry().createWriter(onWriter, onWriteError);
  }

  function onWriter(writer) {
    writer.onwriteend = onWriteSuccess;
    writer.onerror = onWriteError;
    writer.write(getter.getPdfBlob());
  }

  function onWriteSuccess() {
    STATUS.setProgress({type: 'file_written'});
    deferred.resolve();
    console.log('Done : Fetch file');
  }

  function onWriteError(error) {
    showFsError(error);
    deferred.reject();
  }

  return self;
}
