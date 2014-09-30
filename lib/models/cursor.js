'use strict';

var HttpResult = require('../session/http_result');

var _handleError = function(err, obj) {
  if (err) throw err;
}

function Cursor(obj, session, route, query, segmentKey) {
  this._obj = obj;
  this._session = session;
  this._route = route;
  this._query = query;
  this._segmentKey = segmentKey || "data";
}

Cursor.prototype._getSegment = function(callback) {
  var that = this;
  this._session.get(this._route, JSON.stringify(this._query), _handleError, function(result) {
    if (result.code == HttpResult.OK) {
      var json = JSON.parse(result.body);
      var payload = json[that._segmentKey];
      callback(payload);
      return {};
    }
  });
}

Cursor.prototype.forEachSegment = function(callback) {
  this._getSegment(callback);
}

Cursor.prototype.forEach = function(callback) {
  this.forEachSegment(function(segment) {
    segment.forEach(callback);
  });
}

Cursor.prototype.map = function(callback) {
  this.forEach(function(item) {
    return callback(item);
  });
}

module.exports = Cursor;
