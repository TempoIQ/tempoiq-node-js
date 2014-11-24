'use strict';

var crypto = require('crypto');

var HttpResult = require('./http_result');

function StubbedSession(consumeStubs) {
  this.consumeStubs = consumeStubs;
  this.activeStubs = {};
}

StubbedSession.prototype.stub = function(verb, route, code, body, headers) {
  var newStub = {
    body: body,
    code: code,
    headers: headers
  };

  var stubs = this.activeStubs[this._keyFor(verb, route)];
  if (!stubs) {
    this.activeStubs[this._keyFor(verb, route)] = [newStub];
  } else {
    stubs.push(newStub);
  }
}

StubbedSession.prototype.get = function(route, body, headers, callback, transform) {
  return this._lookupStub('GET', route, body, callback, transform);
}

StubbedSession.prototype.post = function(route, body, headers, callback, transform) {
  return this._lookupStub('POST', route, body, callback, transform);
}

StubbedSession.prototype.delete = function(route, body, headers, callback, transform) {
  return this._lookupStub('DELETE', route, body, callback, transform);
}

StubbedSession.prototype.put = function(route, body, headers, callback, transform) {
  return this._lookupStub('PUT', route, body, callback, transform);
}

StubbedSession.prototype._lookupStub = function(verb, route, body, callback, transform) {
  var stubs = this.activeStubs[this._keyFor(verb, route)];
  if (stubs == undefined || stubs.length == 0) {
    callback(new Error("Real HTTP Connections are not allowed. "+verb+" "+route+" didn't match any active stubs"), null);
  } else {
    var foundStub = this.consumeStubs ? stubs.shift() : stubs[0];
    var result = new HttpResult(foundStub.code, foundStub.headers, foundStub.body);
    var transformed = transform(result);
    if (transformed != undefined) {
      callback(transformed.error, transformed.payload);
    } else {
      var error = new Error("Unexpected response code: " + foundStub.code + '. ' + foundStub.body);
      callback(error, null);
    }
  }
}

StubbedSession.prototype._keyFor = function(verb, route) {
  var shasum = crypto.createHash('sha1');
  shasum.update(verb+route)
  return shasum.digest('hex');
}

module.exports = StubbedSession;
