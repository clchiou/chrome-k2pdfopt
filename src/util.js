// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function callWithFileSystem(onSuccess, onError) {
  var requestFileSystem = window.requestFileSystem ||
                          window.webkitRequestFileSystem;
  // TODO(clchiou): Pass quota (and other information) to NaCl module
  var quota = 64 * 1024 * 1024; // 64 MB
  requestFileSystem(window.TEMPORARY, quota, onSuccess, onError);
}


function showFsError(error) {
  var msg = '';
  switch (error.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };
  console.log('Encounter file system error of ' + msg);
  STATUS.showError('Could not perform file system operation due to ' + msg);
}


function getFileUri(url) {
  var params = url.slice(url.indexOf('?') + 1).split('&');
  var pair;
  for (var i = 0; i < params.length; i++) {
    pair = params[i].split('=');
    if (pair[0] === 'fileUri') {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}


function getPath(url) {
  var element = document.createElement('a');
  element.href = url;
  return element.pathname;
}


function getBasename(path) {
  return path.split('/').reverse()[0];
}


function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}


// TODO(clchiou): Remove this class and use NaCl File API.
function DirLister(module) {
  this.module = module;
  this.request = null;
  this.entries = null;
  this.dirReader = null;
}


DirLister.prototype.onRequest = function(request) {
  if (request.type === 'action' &&
      request.action === 'read_directory') {
    this.request = request;
    this.entries = [];
    callWithFileSystem(
        this._onFileSystem.bind(this), this._onError.bind(this));
    return true;
  }

  return false;
}


DirLister.prototype._onFileSystem = function(fileSystem) {
  fileSystem.root.getDirectory(this.request.path, {create: false},
      this._onDirEntry.bind(this), this._onError.bind(this));
}


DirLister.prototype._onDirEntry = function(dirEntry) {
  this.dirReader = dirEntry.createReader();
  this._readDir();
}


DirLister.prototype._readDir = function() {
  this.dirReader.readEntries(
      this._onReadEntries.bind(this), this._onError.bind(this));
}


DirLister.prototype._onReadEntries = function(entries) {
  if (!results.length) {
    var fileNames = [];
    this.entries.sort().forEach(function (entry, i) {
      fileNames.push(entry.name);
    });
    var response = JSON.stringify({
      type: 'action',
      recipient: this.request.recipient,
      files: fileNames
    });
    this.module.postMessage(response);
    return;
  }

  this.entries = this.entries.concat(toArray(results));
  this.readDir();
}


DirLister.prototype._onError = function(error) {
  console.log('Could not fulfill read_directory request');
  showFsError(error);
}
