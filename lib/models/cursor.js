'use strict';

var util = require('util');
var HttpResult = require('../session/http_result');
var EventEmitter = require('events').EventEmitter;

util.inherits(Cursor, EventEmitter);

var _handleError = function(err, obj) {
  if (err) throw err;
}

function Cursor(obj, session, route, query, headers, segmentKey) {
  this._obj = obj;
  this._session = session;
  this._route = route;
  this._query = query;
  this._headers = headers || {};
  this._segmentKey = segmentKey || "data";
}

Cursor.prototype._handleRequest = function(base, result) {
  if (result.code == HttpResult.OK) {
    var json = JSON.parse(result.body);
    var payload = json[base._segmentKey];

    payload.forEach(function(item) {
      base.emit('data', base._obj.fromJSON(item));
    });

    if (json.next_page) {
      base._loadFromServer(base, json.next_page.next_query)
    } else {
      base.emit('end');
    }
    return {};
  } else {
    var err = new Error(result.body);
    err.code = result.code;
    base.emit('error', err);
  }
}

Cursor.prototype._loadFromServer = function(base, body) {
  var payload = JSON.stringify(body) || JSON.stringify(base._query)
  base._session.get(base._route, payload, base._headers, _handleError, function(result) {
    base._handleRequest(base, result)
    return {}
  });
}

Cursor.prototype.run = function() {
  var base = this;
  try {
    base._loadFromServer(base)
  } catch (e) {
    base.emit('error', e);
  }
}

Cursor.prototype.toArray = function(callback) {
  var buf = [];
  this.on('data', function(item) {
    buf.push(item);
  }).on('end', function() {
    callback(null, buf);
  }).on('error', function(e) {
    callback(e, null);
  });
}

module.exports = Cursor;
