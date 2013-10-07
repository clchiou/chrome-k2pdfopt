// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function Converter() {
  var self = this;

  var deferred = null;

  var fileUri = null;

  var model = null;

  var fileEntry = null;

  var fetcher = null;

  var module = null;
  self.getModule = function() { return module; }

  function onReady() {
    console.log('Start: Convert PDF file');

    fileUri = getComponent(window.location.href, 'fileUri');
    if (!fileUri) {
      STATUS.showError('Could not find PDF URL.');
      return;
    }

    model = getComponent(window.location.href, 'model');
    console.log('Converter: model=' + model);

    var base = getBaseName(fileUri);
    STATUS.showInfo('Convert ' + base + ' for easy Kindle reading.');

    module = new NaclModule();
    fetcher = new FileFetcher(fileUri);

    module.register(onRequest);
    module.register(STATUS.onRequest);

    $.when(module.load(), fetcher.fetch()).then(onResolve, onReject);
  }
  self.onReady = onReady;

  function onResolve() {
    fetcher.getDirEntry().getFile(getBaseName(getPath(fileUri)), {create: true},
        onGetFile, showFsError);
  }

  function onGetFile(fileEntry_arg) {
    fileEntry = fileEntry_arg;
    $.Deferred(doConvert).then(doneConvert);
  }

  function doConvert(deferred_arg) {
    deferred = deferred_arg;
    module.start(fetcher.getFileEntry().fullPath, fileEntry.fullPath, model);
  }

  function doneConvert() {
    module.stop();
    if (!STATUS.getHasError()) {
      window.open(fileEntry.toURL('application/pdf'), '_self');
      console.log('Done : Convert PDF file');
    }
  }

  function onReject() {
    console.log('Converter: Could not convert for some reason.');
    STATUS.showError('Could not convert for some reason.');
  }

  function onRequest(request) {
    if (request.type   === 'info' &&
        request.name   === 'thread_completed' &&
        request.whoami === 'execute_k2pdfopt') {
      if (!deferred) {
        console.log('Converter: No promise to fulfill');
        // TODO(clchiou): Show whatever that is converted?
      } else {
        deferred.resolve();
      }
      return true;
    }

    return false;
  }

  return self;
}


function main() {
  STATUS.onReady();

  var converter = new Converter();
  converter.onReady();

  var module = converter.getModule();
  var dirLister = new DirLister(module);
  module.register(dirLister.onRequest);
}


$(document).ready(main);
