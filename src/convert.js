// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

var config = [];

function main() {
  console.log('Start...');

  config = parseConfig(window.location.href);

  var promiseLoadNaClModule = $.Deferred(function (defer) {
    function onLoad() {
      console.log('NaCl module was loaded');
      config.module = $('#k2pdfopt')[0];
      defer.resolve(null);
    };
    var $l = $('#listener')[0];
    $l.addEventListener('load', onLoad, true);
    $l.addEventListener('message', handleMessage, true);
    $('<embed/>', {attr: {
      name: 'nacl_module',
      id: 'k2pdfopt',
      width: 0,
      height: 0,
      src: 'k2pdfopt.nmf',
      type: 'application/x-nacl'
    }}).appendTo($l);
  }).promise();

  var promiseFetch = $.Deferred(fetch).promise();

  $.when(promiseLoadNaClModule, promiseFetch).then(function (_, fileInfo) {
    console.log('Fetched ' + config.fileUri);
    convert(fileInfo);
  }, function() {
    console.log('Could not fetch remote file');
    // TODO(clchiou): Notify user that we could not fetch file
  });
}

function fetch(defer) {
  // TODO(clchiou): Choose file name extension from mine type
  var inputPdf = 'file.pdf';

  // TODO(clchiou): Show download progress and handle HTTP error
  var promiseHttpGet = $.Deferred(function (dfd) {
    console.log('Fire HTTP GET...');
    // TODO(clchiou): Try jquery get
    var httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', config.fileUri, true);
    httpRequest.responseType = 'blob';
    httpRequest.onload = function (e) {
      var blob = httpRequest.response;
      // TODO(clchiou): Extend to other eBook format
      if (blob.type === 'application/pdf') {
        console.log('Got HTTP response blob');
        dfd.resolve(blob);
      } else {
        console.log('Not a PDF file ' + config.fileUri);
        dfd.reject();
      }
    };
    httpRequest.send();
  }).promise();

  var promiseCreateInputFile = $.Deferred(function (dfd) {
    function onError(e) {
      logFileSystemError(e);
      dfd.reject();
    };
    callWithFileSystem(function (fs) {
      console.log('Create local file...');
      // Use random directory name to avoid conflicts
      var dir = String(Math.random());
      fs.root.getDirectory(dir, {create: true}, function (dirEntry) {
        dirEntry.getFile(inputPdf, {create: true}, function (inputFileEntry) {
          console.log('Local file was created');
          var fileInfo = {
            fs: fs, dirEntry: dirEntry, inputFileEntry: inputFileEntry
          };
          dfd.resolve(fileInfo);
        }, onError);
      }, onError);
    }, onError);
  }).promise();

  function writeLocalFile(blob, fileInfo) {
    console.log('Write blob to local file...');
    function onError(e) {
      logFileSystemError(e);
      defer.reject();
    };
    var dirEntry = fileInfo.dirEntry;
    var inputFileEntry = fileInfo.inputFileEntry;
    inputFileEntry.createWriter(function (fileWriter) {
      fileWriter.onwriteend = function(e) {
        console.log('Blob was written to local file');
        defer.resolve(fileInfo);
      };
      fileWriter.onerror = function (e) {
        console.log('Could not write to ' + inputPdf + ' due to ' +
                    e.toString());
        defer.reject();
      };
      fileWriter.write(blob);
    }, onError);
  };

  $.when(promiseHttpGet, promiseCreateInputFile).then(
      writeLocalFile, defer.reject);
}

function convert(fileInfo) {
  console.log('Convert file...');
  // TODO(clchiou): Show convert progress
  var outputPdf = getBasename(getPath(config.fileUri));
  var dirEntry = fileInfo.dirEntry;
  var inputFileEntry = fileInfo.inputFileEntry;
  dirEntry.getFile(outputPdf, {create: true}, function (outputFileEntry) {
    $.Deferred(function (defer) {
      console.log('Execute k2pdfopt...');
      postMessage(JSON.stringify({
        type: 'sys', action: 'k2pdfopt',
        input_path: inputFileEntry.fullPath,
        output_path: outputFileEntry.fullPath,
      }));
      config.defer_convert = defer;
    }).then(function () {
      console.log('k2pdfopt returned');
      postMessage(JSON.stringify({
        type: 'sys', action: 'quit'
      }));
      window.open(outputFileEntry.toURL('application/pdf'), '_self');
    });
  }, function (e) {
    logFileSystemError(e);
    // TODO(clchiou): Notify user that we could not convert the file
  });
}

function handleMessage(message) {
  if (typeof message.data !== 'string') {
    console.log('Message is not string type');
    return;
  }
  var request = JSON.parse(message.data);
  if (request.type === 'action' && request.action === 'read_directory') {
    listDirectory(request.path, function (fileNames) {
      var response = JSON.stringify({
        type: 'action', recipient: request.recipient, files: fileNames
      });
      postMessage(response);
    }, function (e) {
      console.log('Could not fulfill read_directory request');
    });
  } else if (request.type === 'info' &&
             request.name === 'thread_completed' &&
             request.whoami === 'execute_k2pdfopt') {
    if (typeof config.defer_convert === 'undefined') {
      console.log('No promise to fulfill for convert');
      // TODO(clchiou): Show whatever that is converted?
    } else {
      config.defer_convert.resolve();
    }
  } else if (request.type === 'info' &&
             request.name === 'progress_read_pages') {
    console.log("Read " + request.num_pages + " pages");
  } else if (request.type === 'info' &&
             request.name === 'progress_convert') {
    console.log("Convert page " + request.page_index + ", generated " +
        request.num_output_pages + " pages");
  } else if (request.type === 'error') {
    console.log('NaCl module encountered an error: ' + request.reason);
    // TODO(clchiou): Notify user that we couldn't make it
  } else {
    console.log('Could not recognize message ' + message.data);
  }
}

function postMessage(message) {
  if (typeof config.module === 'undefined') {
    console.log('Could not send message as NaCl module was not loaded yet');
    return;
  }
  config.module.postMessage(message);
}

function callWithFileSystem(onSuccess, onError) {
  var requestFileSystem = window.requestFileSystem ||
                          window.webkitRequestFileSystem;
  // TODO(clchiou): Pass quota (and other information) to NaCl module
  var quota = 64 * 1024 * 1024; // 64 MB
  requestFileSystem(window.TEMPORARY, quota, onSuccess, onError);
}

function listDirectory(path, onSuccess, onError) {
  function onError_(e) {
    logFileSystemError(e);
    onError(e);
  };
  callWithFileSystem(function (fs) {
    function toArray(list) {
      return Array.prototype.slice.call(list || [], 0);
    };
    var entries = [];
    fs.root.getDirectory(path, {create: false}, function (dirEntry) {
      var dirReader = dirEntry.createReader();
      function readEntries() {
        dirReader.readEntries(function (results) {
          if (!results.length) {
            var fileNames = [];
            entries.sort().forEach(function (entry, i) {
              fileNames.push(entry.name);
            });
            onSuccess(fileNames);
          } else {
            entries = entries.concat(toArray(results));
            readEntries();
          }
        }, onError_);
      };
      readEntries();
    }, onError_);
  }, onError_);
}

function parseConfig(url) {
  var args = [];
  var params = url.slice(window.location.href.indexOf('?') + 1).split('&');
  var pair;
  for (var i = 0; i < params.length; i++) {
    pair = params[i].split('=');
    if (pair[0] === 'fileUri') {
      args.fileUri = decodeURIComponent(pair[1]);
    }
  }
  return args;
}

function getPath(url) {
  var element = document.createElement('a');
  element.href = url;
  return element.pathname;
}

function getBasename(path) {
  return path.split('/').reverse()[0];
}

function logFileSystemError(e) {
  var msg = '';
  switch (e.code) {
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
  console.log('File operation failed: ' + msg);
};

$(document).ready(main);
