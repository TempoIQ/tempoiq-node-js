'use strict';

var http = require('http');
var https = require('https');
var zlib = require('zlib');

var LiveSession = function(key, secret, host, port, opts) {
  var base = this;

  var _initialize = function() {
    base.key = key;
    base.secret = secret;
    base.host = host;
    base.port = port;
    base.opts = opts;
    base.connection = opts.secure ? https : http;
    base.maxconnections = opts.maxconnections ? opts.maxconnections : 10;
    base.connection.globalAgent.maxSockets = base.maxconnections;
  };

  base.get = function(route, body, callback, transform) {
    _execute('GET', route, body, callback, transform);
  };

  base.post = function(route, body, callback, transform) {
    _execute('POST', route, body, callback, transform);
  };

  var _execute = function(verb, route, body, callback, transform) {
    var headers = {
//      'Accept-Encoding': 'gzip',
      'User-Agent': 'tempoiq-nodejs/0.0.1',
      'Content-Type': 'application/json',
      'Content-Length': body == null ? '0' : Buffer.byteLength(body).toString()
    };
    var options = {
      hostname: base.host,
      port: base.port,
      path: route,
      method: verb,
      auth: base.key+':'+base.secret,
      headers: headers
    };

    var req = http.request(options, function(response) {
      var buffer = [];
      response.on('data', function(chunk) {
	buffer.push(chunk.toString());
      }).on('end', function() {
	// TODO: Correct error code?
	if (response.statusCode == 200) {
	  callback(null, transform(JSON.parse(buffer.join(''))));
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

  _initialize();
  return base;
};

module.exports = LiveSession;
