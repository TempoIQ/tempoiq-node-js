'use strict';

// Used to write DataPoints into your TempoIQ backend.
function BulkWrite() {
  this.data = {};
}

// Add a DataPoint to the request

// @param {String} deviceKey The device key to write to
// @param {String} sensorKey The sensor key within the device to write to
// @param {DataPoint} datapoint The datapoint to write
BulkWrite.prototype.push = function(deviceKey, sensorKey, datapoint) {
  var sensors = this.data[deviceKey];
  if (sensors == undefined) {
    sensors = {};
    this.data[deviceKey] = sensors;
  }
  
  var points = sensors[sensorKey];
  if (points == undefined) {
    points = [];
    sensors[sensorKey] = points;
  }

  points.push(datapoint);
}

BulkWrite.prototype.toJSON = function() {
  return this.data;
}

module.exports = BulkWrite;
