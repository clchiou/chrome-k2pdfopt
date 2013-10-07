// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function FileToucher(fileName) {
  var self = this;

  var deferred = null;

  // Use random directory name to avoid conflicts
  var dirName = String(Math.random());

  var dirEntry = null;
  self.getDirEntry = function () { return dirEntry; }

  var fileEntry = null;
  self.getFileEntry = function () { return fileEntry; }

  function touch() {
    console.log('Start: Touch file: path=' + dirName + '/' + fileName);
    return $.Deferred(doFsCreate).promise();
  }
  self.touch = touch;

  function doFsCreate(deferred_arg) {
    deferred = deferred_arg;
    callWithFileSystem(onFsCreate, onFsError);
  }

  function onFsCreate(fileSystem) {
    fileSystem.root.getDirectory(dirName, {create: true},
        onDirCreate, onFsError);
  }

  function onDirCreate(dirEntry_arg) {
    dirEntry = dirEntry_arg;
    dirEntry.getFile(fileName, {create: true},
        onFileCreate, onFsError);
  }

  function onFileCreate(fileEntry_arg) {
    fileEntry = fileEntry_arg;
    deferred.resolve();
    console.log('Done : Touch file');
  }

  function onFsError(error) {
    showFsError(error);
    deferred.reject();
  }

  return self;
}
