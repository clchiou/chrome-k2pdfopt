// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

var config = [];

function main() {
  console.log('Start...');

  $('#progressbar').progressbar({value: false});

  config = parseConfig(window.location.href);
  if (!config.fileUri) {
    showError('Could not find PDF URL.');
    return;
  }
  showInfo('Convert ' + getBasename(config.fileUri) +
      ' for easy Kindle reading.');

  var promiseLoadNaClModule = $.Deferred(function (defer) {
    function onLoad() {
      console.log('NaCl module was loaded');
      config.module = $('#k2pdfopt')[0];
      setProgress({type: 'nacl_module_loaded'});
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
    console.log('Could not convert for some reason.');
    showError('Could not convert for some reason.');
  });
}

function fetch(defer) {
  // TODO(clchiou): Choose file name extension from mine type
  var inputPdf = 'file.pdf';

  var promiseHttpGet = $.Deferred(function (dfd) {
    console.log('Fire HTTP GET...');
    // TODO(clchiou): Try jquery get
    var httpRequest = new XMLHttpRequest();
    httpRequest.responseType = 'blob';
    httpRequest.addEventListener('load', function (e) {
      var blob = httpRequest.response;
      // TODO(clchiou): Extend to other eBook format
      if (blob.type === 'application/pdf') {
        console.log('Got HTTP response blob');
        setProgress({type: 'file_downloaded'});
        dfd.resolve(blob);
      } else {
        console.log('Not a PDF file ' + config.fileUri);
        showError('Could not convert non-PDF file ' + config.fileUri);
        dfd.reject();
      }
    }, false);
    httpRequest.addEventListener('error', function (e) {
      showError('Could not download ' + config.fileUri);
    }, false);
    httpRequest.open('GET', config.fileUri, true);
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
        setProgress({type: 'file_written'});
        defer.resolve(fileInfo);
      };
      fileWriter.onerror = function (e) {
        console.log('Could not write to ' + inputPdf + ' due to ' +
                    e.toString());
        showError('Could not write to ' + inputPdf + ' due to ' +
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
      if (!config.hasError) {
        window.open(outputFileEntry.toURL('application/pdf'), '_self');
      }
    });
  }, function (e) {
    logFileSystemError(e);
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
    console.log('Read ' + request.num_pages + ' pages');
    config.num_pages = request.num_pages;
    setProgress({type: 'pages_read'});
  } else if (request.type === 'info' &&
             request.name === 'progress_convert') {
    console.log('Convert page ' + request.page_index + ', generated ' +
        request.num_output_pages + ' pages');
    setProgress({type: 'pages_converted', page_index: request.page_index});
  } else if (request.type === 'error') {
    console.log('NaCl module encountered an error: ' + request.reason);
    showError(request.reason);
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
  var params = url.slice(url.indexOf('?') + 1).split('&');
  var pair;
  for (var i = 0; i < params.length; i++) {
    pair = params[i].split('=');
    if (pair[0] === 'fileUri') {
      args.fileUri = decodeURIComponent(pair[1]);
    }
  }
  return args;
}

function showInfo(message) {
  if (config.hasError) {
    return;
  }
  $('#messagebar')
    .addClass('ui-state-highlight')
    .html('<p>' +
        '<span id="message" class="ui-icon ui-icon-info"></span>' +
        '<strong>Info:</strong> ' + message +
        '</p>');
}

function showError(message) {
  if (config.hasError) {
    return;
  }
  config.hasError = true;
  $('#progressbar').progressbar('value', false);
  $('#messagebar')
    .removeClass('ui-state-highlight')
    .addClass('ui-state-error')
    .html('<p>' +
        '<span id="message" class="ui-icon ui-icon-alert"></span>' +
        '<strong>Alert:</strong> ' + message +
        '</p>');
}

function setProgress(progress) {
  if (config.hasError) {
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
    value = 15 + 85 * progress.page_index / config.num_pages;
  }
  progressbar.progressbar('value', value);
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
  showError('Could not perform file system operation due to ' + msg);
};

$(document).ready(main);
