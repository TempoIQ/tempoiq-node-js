'use strict';

var TempoIQ = {};

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
    base.port = opts.port == undefined ? _defaultOptions["port"] : opts.port
  };

  base.createDevice = function(device, callback) {
    callback({
      key: "stubbed_key",
      name: "stubbed_name",
      attributes: {attr1: "value1"},
      sensors: []
    }, null);
  };

  _initialize();
  return base;
};

module.exports = TempoIQ;

