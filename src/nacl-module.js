// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


function NaclModule() {
  this.module = null;
  this.callbacks = [];
  this.watchDogId = null;
  this.pong = null;
  this.deferred = null;
}


NaclModule.prototype.register = function(callback) {
  this.callbacks.push(callback);
}


NaclModule.prototype.load = function() {
  return $.Deferred(this._dolLoad.bind(this));
}


NaclModule.prototype._dolLoad = function(deferred) {
  console.log('Load NaCl module...');
  this.deferred = deferred;
  var listener = $('#listener')[0];
  listener.addEventListener('load', this._onLoad.bind(this), true);
  listener.addEventListener('message', this.handleMessage.bind(this), true);
  $('<embed/>', {attr: {
    name: 'nacl_module',
    id: 'k2pdfopt',
    width: 0,
    height: 0,
    src: 'k2pdfopt.nmf',
    type: 'application/x-nacl'
  }}).appendTo(listener);
}


NaclModule.prototype._onLoad = function() {
  console.log('Load NaCl module successfully');
  this.module = $('#k2pdfopt')[0];
  STATUS.setProgress({type: 'nacl_module_loaded'});
  this.deferred.resolve();
}


NaclModule.prototype.startWatchDog = function() {
  this.watchDogId = window.setInterval(this._onWatchDog.bind(this), 2500);
  this.pong = false;
  this.postMessage(JSON.stringify({type: 'ping'}));
}


NaclModule.prototype._onWatchDog = function() {
  if (!this.pong) {
    STATUS.showError('NaCl module is not responding.');
    clearInterval(this.watchDogId);
    return;
  }
  this.pong = false;
  this.postMessage(JSON.stringify({type: 'ping'}));
}


NaclModule.prototype.handleMessage = function(message) {
  if (typeof message.data !== 'string') {
    console.log('Message is not string type');
    return;
  }
  console.log('Receive message ' + message.data);
  var request = JSON.parse(message.data);

  if (request.type === 'pong') {
    this.pong = true;
    return;
  }

  if (request.type === 'error') {
    console.log('NaCl module encountered an error: ' + request.reason);
    this.showError(request.reason);
    return;
  }

  for (var i = 0; i < this.callbacks.length; i++) {
    if (this.callbacks[i](request))
      return;
  }

  console.log('Could not recognize message ' + message.data);
}


NaclModule.prototype.postMessage = function(message) {
  if (!this.module) {
    console.log('Could not send message as NaCl module was not loaded yet');
    return;
  }
  this.module.postMessage(message);
}
