// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


var HttpRequest = (function ($, Progress, Log) {
  'use strict';

  var HttpRequest;

  HttpRequest = function (url, type) {
    if (!(this instanceof HttpRequest)) {
      return new HttpRequest(url, type);
    }
    this.url = url;
    this.type = type;
    this.blob = undefined;
    this.deferred_ = undefined;
    this.request_ = undefined;
  };

  HttpRequest.prototype.get = function () {
    Log.d('HttpRequest.get: url=' + this.url);
    return $.Deferred(this.get_.bind(this)).promise();
  };

  HttpRequest.prototype.get_ = function (deferred) {
    Progress.to({checkpoint: 'download-file-begin'});
    // TODO(clchiou): Try jquery get.
    this.deferred_ = deferred;
    this.request_ = new XMLHttpRequest();
    this.request_.responseType = 'blob';
    this.request_.addEventListener('load', this.onLoad_.bind(this), false);
    this.request_.addEventListener('error', this.onError_.bind(this), false);
    this.request_.open('GET', this.url, true);
    this.request_.send();
  };

  HttpRequest.prototype.onLoad_ = function () {
    // TODO(clchiou): Extend to other eBook format.
    this.blob = this.request_.response;
    if (this.blob.type === this.type) {
      Progress.to({checkpoint: 'download-file-end'});
      this.deferred_.resolve();
    } else {
      Log.e('HttpRequest.onLoad_: Could not match blob type:',
        'url=' + this.url, 'type=' + this.type, 'blob.type=' + this.blob.type);
      Progress.error('Could not match file type (' + this.blob.type + ')' +
        ' for url ' + this.url);
      this.deferred_.reject();
    }
  };

  HttpRequest.prototype.onError_ = function (error) {
    Log.e('HttpRequest.onError_: url=' + this.url + ', error=' + error);
    Progress.error('Could not download: ' + this.url);
    this.deferred_.reject();
  };

  return HttpRequest;
}(jQuery, Progress, Log));
