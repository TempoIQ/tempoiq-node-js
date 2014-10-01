'use strict';

function BulkWrite() {
  this.data = {};
}

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
