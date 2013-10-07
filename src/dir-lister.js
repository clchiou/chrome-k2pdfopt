// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


// TODO(clchiou): Remove this class and use NaCl File API.
function DirLister(module) {
  var self = this;

  var request = null;

  var entries = null;

  var dirReader = null;

  function onRequest(request_arg) {
    if (request.type === 'action' &&
        request.action === 'read_directory') {
      console.log('Start: List dir: path=' + request.path);
      request = request_arg;
      entries = [];
      callWithFileSystem(onFsCreate, onError);
      return true;
    }

    return false;
  }
  self.onRequest = onRequest;

  function onFsCreate(fileSystem) {
    fileSystem.root.getDirectory(request.path, {create: false},
        onDirCreate, onError);
  }

  function onDirCreate(dirEntry) {
    dirReader = dirEntry.createReader();
    readDir();
  }

  function readDir() {
    dirReader.readEntries(onEntries, onError);
  }

  function onEntries(newEntries) {
    if (!newEntries.length) {
      var fileNames = [];
      entries.sort().forEach(function (entry) {
        fileNames.push(entry.name);
      });
      var response = JSON.stringify({
        type: 'action',
        recipient: request.recipient,
        files: fileNames
      });
      module.postMessage(response);
      console.log('Done : List dir');
    } else {
      entries = entries.concat(toArray(newEntries));
      readDir();
    }
  }

  function onError(error) {
    console.log('Could not fulfill read_directory request');
    showFsError(error);
  }

  return self;
}
