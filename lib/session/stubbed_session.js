'use strict';

var crypto = require('crypto');

var HttpResult = require('./http_result');

function StubbedSession(consumeStubs) {
  this.consumeStubs = consumeStubs;
  this.activeStubs = {};
}

StubbedSession.prototype.stub = function(verb, route, code, body, headers) {
  var stub = {
    body: body,
    code: code,
    headers: headers
  };

  var stubs = this.activeStubs[this._keyFor(verb, route)];
  if (!stubs) {
    this.activeStubs[this._keyFor(verb, route)] = [stub];
  } else {
    stubs.push(stub);
  }
}

StubbedSession.prototype.get = function(route, body, callback, transform) {
  return this._lookupStub('GET', route, body, callback, transform);
}

StubbedSession.prototype.post = function(route, body, callback, transform) {
  return this._lookupStub('POST', route, body, callback, transform);
}

StubbedSession.prototype.delete = function(route, body, callback, transform) {
  return this._lookupStub('DELETE', route, body, callback, transform);
}

StubbedSession.prototype.put = function(route, body, callback, transform) {
  return this._lookupStub('PUT', route, body, callback, transform);
}

StubbedSession.prototype._lookupStub = function(verb, route, body, callback, transform) {
  var stubs = this.activeStubs[this._keyFor(verb, route)];
  if (stubs == undefined) {
    callback(new Error("Real HTTP Connections are not allowed. "+verb+" "+route+" didn't match any active stubs"), null);
  } else {
    var stub = this.consumeStubs ? stubs.pop() : stubs[0];
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

StubbedSession.prototype._keyFor = function(verb, route) {
  var shasum = crypto.createHash('sha1');
  shasum.update(verb+route)
  return shasum.digest('hex');
}

module.exports = StubbedSession;
