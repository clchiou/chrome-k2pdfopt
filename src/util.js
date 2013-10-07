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


function getBaseName(path) {
  return path.split('/').reverse()[0];
}


function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}
