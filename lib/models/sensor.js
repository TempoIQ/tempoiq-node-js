'use strict';

function Sensor(key, params) {
  var p = params || {};
  this.key = key;
  this.name = p.name || "";
  this.attributes = p.attributes || {};
}

Sensor.fromJSON = function(json) {
  return new Sensor(json.key, json);
};

module.exports = Sensor;
