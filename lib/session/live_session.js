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

LiveSession.prototype.delete = function(route, body, callback, transform) {
  this._execute('DELETE', route, body, callback, transform);
};

LiveSession.prototype.put = function(route, body, callback, transform) {
  this._execute('PUT', route, body, callback, transform);
};

LiveSession.prototype._execute =  function(verb, route, body, callback, transform) {
  var headers = {
    'Accept-Encoding': 'gzip',
    'User-Agent': 'tempoiq-nodejs/0.0.1',
    'Content-Type': 'application/json',
    'Content-Length': body == null ? '0' : Buffer.byteLength(body).toString()
  };
  var options = {
    hostname: this.host,
    port: this.port,
    path: route,
    method: verb,
    auth: this.key+':'+this.secret,
    headers: headers
  };

  var req = this.connection.request(options, function(response) {
    var chunks = [];
    response.on('data', function(chunk) {
      chunks.push(chunk);
    }).on('end', function() {
      var _makeResult = function(res, body, cb) {
	var result = new HttpResult(response.statusCode, response.headers, body);
	var transformed = transform(result);
	if (transformed != undefined) {
	  cb(transformed.error, transformed.payload);
	} else {
	  var error = new Error("Unexpected response code: " + response.statusCode + '. ' + body);
	  cb(error, null);
	}
      };

      var buffer = Buffer.concat(chunks);
      var encoding = response.headers['content-encoding'];
      if (encoding == 'gzip') {
	zlib.gunzip(buffer, function(err, unzipped) {
	  if (err) {
	    callback(err, null);
	  } else {
	    var body = unzipped.toString();
	    _makeResult(response, body, callback);
	  }
	});
      } else if (encoding == 'deflate') {
	zlib.inflate(buffer, function(err, inflated) {
	  if (err) {
	    callback(err, null);
	  } else {
	    var body = inflated.toString();
	    _makeResult(response, body, callback);
	  }
	});
      } else {
	_makeResult(response, buffer.toString(), callback);
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
