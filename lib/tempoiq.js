'use strict';

var TempoIQ = {};

var LiveSession = require('./session/live_session');
var HttpResult = require('./session/http_result');
var Device = require('./models/device');

TempoIQ.Client = function(key, secret, host, opts) {
  var base = this;
  var _defaultOptions = {
    port: 443,
    secure: true
  };

  var _initialize = function() {
    if (opts == undefined) {
      opts = _defaultOptions;
    }

    base.key = key;
    base.secret = secret;
    base.host = host;
    base.port = opts.port == undefined ? _defaultOptions.port : opts.port;
    base.secure = opts.secure == undefined ? _defaultOptions.secure : opts.secure;
    base._session = opts.session == undefined ? new LiveSession(key, secret, host, base.port, {secure: base.secure}) : opts.session;
  };

  base.createDevice = function(device, callback) {
    base._session.post("/v2/devices", JSON.stringify(device), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) }
      } else if (result.code == HttpResult.NOT_FOUND) {
	return { error: new Error("Device not found"), payload: null }
      }
    });
  };

  base.deleteDevices = function(selection, callback) {
    var query = {
      search: {
	select: "devices",
	filters: selection
      },
      find: {
	quantifier: "all"
      }
    };

    base._session.delete("/v2/devices", JSON.stringify(query), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: JSON.parse(result.body) }
      }
    });
  };

  base.Device = Device;

  _initialize();
  return base;
};

module.exports = TempoIQ;

