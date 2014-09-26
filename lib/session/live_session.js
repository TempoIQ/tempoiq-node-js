'use strict';

var http = require('http');
var https = require('https');
var zlib = require('zlib');

var HttpResult = require('./http_result');

function LiveSession(key, secret, host, port, opts) {
  this.key = key;
  this.secret = secret;
  this.host = host;
  this.port = port;
  this.opts = opts;
  this.connection = opts.secure ? https : http;
  this.maxconnections = opts.maxconnections ? opts.maxconnections : 10;
  this.connection.globalAgent.maxSockets = this.maxconnections;
}

LiveSession.prototype.stub = function() {
    // Live session. No op.
};

LiveSession.prototype.get = function(route, body, callback, transform) {
  this._execute('GET', route, body, callback, transform);
};

LiveSession.prototype.post = function(route, body, callback, transform) {
  this._execute('POST', route, body, callback, transform);
};

LiveSession.prototype._execute =  function(verb, route, body, callback, transform) {
  var headers = {
    //      'Accept-Encoding': 'gzip',
    'User-Agent': 'tempoiq-nodejs/0.0.1',
    'Content-Type': 'application/json',
    'Content-Length': body == null ? '0' : Buffer.byteLength(body).toString()
  };
  var options = {
    hostname: LiveSession.prototype.host,
    port: LiveSession.prototype.port,
    path: route,
    method: verb,
    auth: LiveSession.prototype.key+':'+LiveSession.prototype.secret,
    headers: headers
  };

  var req = http.request(options, function(response) {
    var buffer = [];
    response.on('data', function(chunk) {
      buffer.push(chunk.toString());
    }).on('end', function() {
      var result = new HttpResult(response.statusCode, response.headers, buffer.join(''));
      var transformed = transform(result);
      if (transformed != undefined) {
	callback(transformed.error, transformed.payload);
      } else {
	var error = new Error("Unexpected response code: " + response.statusCode + '. ' + buffer.join(''));
	callback(error, null);
      }
    });
  }).on('error', function(e) {
    callback(e, null);
  });

  if (body != null) {
    req.write(body);
  }

  req.end();
};

module.exports = LiveSession;
