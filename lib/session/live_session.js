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
    callback(null, transform({
      key: "stubbed_key",
      name: "stubbed_name",
      attributes: {attr1: "value1"},
      sensors: []
    }));
  };

  var _execute = function(verb, route, body, callback, transform) {
    var headers = {
      'Accept-Encoding': 'gzip',
      'User-Agent': 'tempoiq-nodejs/0.0.1',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    var options = {
      hostname: base.host,
      port: base.port,
      path: route,
      method: verb,
      headers: headers
    };

    http.request(options, function(response) {
    });
  };

  _initialize();
  return base;
};

module.exports = LiveSession;
