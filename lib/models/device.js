'use strict';

// The top level container for a group of sensors.
function Device(key, params) {
  var p = params || {};
  // The primary key of the device [String]
  this.key = key;

  // Human readable name of the device [String] EG - "My Device"
  this.name = p.name || "";

  // Indexable attributes. Useful for grouping related Devices.
  // EG - {location: '445-w-Erie', model: 'TX75', region: 'Southwest'}
  this.attributes = p.attributes || {};
  this.sensors = p.sensors || [];
}

Device.fromJSON = function(json) {
  return new Device(json.key, json);
};

module.exports = Device;
