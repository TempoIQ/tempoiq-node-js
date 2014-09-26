'use strict';

function Device(key, params) {
  var p = params || {};
  this.key = key;
  this.name = p.name || "";
  this.attributes = p.attributes || {};
  this.sensors = p.sensors || [];
}

Device.fromJSON = function(json) {
  return new Device(json.key, json);
};

module.exports = Device;
