// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


var WATCH_DOG_TIMEOUT = 2500;


function NaclModule() {
  var self = this;

  var deferred = null;

  var module = null;

  var callbacks = [];

  var watchDogId = null;

  var pong = null;

  function register(callback) {
    callbacks.push(callback);
  }
  self.register = register;

  function load() {
    return $.Deferred(doLoad);
  }
  self.load = load;

  function start(inputPath, outputPath, model) {
    var message = {
      type: 'sys',
      action: 'k2pdfopt',
      input_path: inputPath,
      output_path: outputPath
    };
    if (model) {
      message.model = model;
    }
    postMessage(JSON.stringify(message));
    startWatchDog();
  }
  self.start = start;

  function stop() {
    stopWatchDog();
    postMessage(JSON.stringify({type: 'sys', action: 'quit'}));
  }
  self.stop = stop;

  function postMessage(message) {
    console.log('NaCl: module << message=' + message);
    if (!module) {
      console.log('NaCl: Module is not loaded yet');
      return;
    }
    module.postMessage(message);
  }
  self.postMessage = postMessage;

  function doLoad(deferred_arg) {
    console.log('Start: Load NaCl module');
    deferred = deferred_arg;

    var listener = $('#listener')[0];
    listener.addEventListener('load', onLoad, true);
    listener.addEventListener('message', handleMessage, true);
    $('<embed/>', {attr: {
      name: 'nacl_module',
      id: 'k2pdfopt',
      width: 0,
      height: 0,
      src: 'k2pdfopt.nmf',
      type: 'application/x-nacl'
    }}).appendTo(listener);
  }

  function onLoad() {
    module = $('#k2pdfopt')[0];
    STATUS.setProgress({type: 'nacl_module_loaded'});
    deferred.resolve();
    console.log('Done : Load NaCl module');
  }

  function startWatchDog() {
    watchDogId = window.setInterval(onWatchDog, WATCH_DOG_TIMEOUT);
    pong = false;
    postMessage(JSON.stringify({type: 'ping'}));
  }

  function stopWatchDog() {
    clearInterval(watchDogId);
  }

  function onWatchDog() {
    if (!pong) {
      STATUS.showError('NaCl module is not responding.');
      clearInterval(watchDogId);
      return;
    }
    pong = false;
    postMessage(JSON.stringify({type: 'ping'}));
  }

  function handleMessage(message) {
    if (typeof message.data !== 'string') {
      console.log('NaCl: Message is not string typed');
      return;
    }
    console.log('NaCl: module >> message=' + message.data.replace(/\n/g, ''));
    var request = JSON.parse(message.data);

    if (request.type === 'pong') {
      pong = true;
      return;
    }

    if (request.type === 'error') {
      console.log('NaCl: error=' + request.reason);
      showError(request.reason);
      return;
    }

    for (var i = 0; i < callbacks.length; i++) {
      if (callbacks[i](request))
        return;
    }

    console.log('NaCl: Could not recognize message');
  }

  return self;
}
