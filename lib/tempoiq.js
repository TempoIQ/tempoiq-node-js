'use strict';

var TempoIQ = {};

var LiveSession = require('./session/live_session');
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
    base._session.get("/v2/devices", null, callback, function(json) {
      return Device.fromJSON(json);
    });
  };

  base.Device = Device;

  _initialize();
  return base;
};

module.exports = TempoIQ;

