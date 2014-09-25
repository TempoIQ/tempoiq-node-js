'use strict';

var Device = function(key, params) {
  var base = this;

  var _initialize = function() {
    base.key = key;
    base.name = params.name;
    base.attributes = params.attributes;
    base.sensors = params.sensors;
  };

  _initialize();
  return base;
};

Device.fromJSON = function(json) {
  return new Device(json.key, json);
};

module.exports = Device;
