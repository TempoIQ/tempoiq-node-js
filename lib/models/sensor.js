'use strict';

// The container for a stream of time series DataPoints.
function Sensor(key, params) {
  var p = params || {};
  // The sensor primary key [String]
  this.key = key;

  // Human readable name of the sensor [String] EG - "Thermometer 1"
  this.name = p.name || "";

  // Indexable attributes. Useful for grouping related sensors.
  // EG - {unit: "F", model: 'FHZ343'}
  this.attributes = p.attributes || {};
}

Sensor.fromJSON = function(json) {
  return new Sensor(json.key, json);
};

module.exports = Sensor;
