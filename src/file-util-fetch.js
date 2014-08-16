// Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
// Use of this source code is governed by the GNU General Public License
// as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.


(function (FileUtil, $, HttpRequest, Progress, Log) {
  'use strict';

  var FetchState;

  Log.d('Install FileUtil.fetch');
  FileUtil.fetch = function (url, type) {
    Log.d('FileUtil.fetch: url=' + url + ', type=' + type);
    var state = new FetchState(url, type);
    return $.Deferred(state.fetch.bind(state)).promise();
  };

  FetchState = function (url, type, path) {
    if (!(this instanceof FetchState)) {
      return new FetchState(url, type);
    }
    this.url = url;
    this.type = type;
    this.path = path;
    this.deferred_ = undefined;
    this.request_ = undefined;
  };

  FetchState.prototype.fetch = function (deferred) {
    Progress.to({checkpoint: 'write-file-begin'});
    this.deferred_ = deferred;
    this.request_ = new HttpRequest(this.url, this.type);
    $.when(this.request_.get(), FileUtil.touch(this.path)).then(
      this.write_.bind(this),
      this.deferred_.reject
    );
  };

  FetchState.prototype.write_ = function () {
    FileUtil.getFileEntry(this.path).createWriter(
      this.onWriter_.bind(this),
      this.onWriteError_.bind(this)
    );
  };

  FetchState.prototype.onWriter_ = function (writer) {
    writer.onwriteend = this.onWriteEnd_.bind(this);
    writer.onerror = this.onWriteError_.bind(this);
    writer.write(this.request_.blob);
  };

  FetchState.prototype.onWriteEnd_ = function () {
    Log.d('FetchState.onWriteEnd_: path=' + this.path);
    Progress.to({checkpoint: 'write-file-end'});
    this.deferred_.resolve();
  };

  FetchState.prototype.onWriteError_ = function (error) {
    Log.d('FetchState.onWriteError_: path=' + this.path);
    Progress.error('Could not write to local file due to ' +
      FileUtil.convertError(error));
    this.deferred_.reject();
  };
}(FileUtil, jQuery, HttpRequest, Progress, Log));
