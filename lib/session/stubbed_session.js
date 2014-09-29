'use strict';

var crypto = require('crypto');

var HttpResult = require('./http_result');

function StubbedSession() {
  this.active_stubs = {};
}

StubbedSession.prototype.stub = function(verb, route, code, body, headers) {
  this.active_stubs[this._key_for(verb, route)] = {
    body: body,
    code: code,
    headers: headers
  }
}

StubbedSession.prototype.get = function(route, body, callback, transform) {
  return this._lookup_stub('GET', route, body, callback, transform);
}

StubbedSession.prototype.post = function(route, body, callback, transform) {
  return this._lookup_stub('POST', route, body, callback, transform);
}

StubbedSession.prototype.delete = function(route, body, callback, transform) {
  return this._lookup_stub('DELETE', route, body, callback, transform);
}

StubbedSession.prototype._lookup_stub = function(verb, route, body, callback, transform) {
  var stub = this.active_stubs[this._key_for(verb, route)];
  if (stub == undefined) {
    callback(new Error("Real HTTP Connections are not allowed. "+verb+" "+route+" didn't match any active stubs"), null);
  } else {
    var result = new HttpResult(stub.code, stub.headers, stub.body);
    var transformed = transform(result);
    if (transformed != undefined) {
      callback(transformed.error, transformed.payload);
    } else {
      var error = new Error("Unexpected response code: " + stub.code + '. ' + stub.body);
      callback(error, null);
    }
  }
}

StubbedSession.prototype._key_for = function(verb, route) {
  var shasum = crypto.createHash('sha1');
  shasum.update(verb+route)
  return shasum.digest('hex');
}

module.exports = StubbedSession;
