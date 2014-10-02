'use strict';

function Row(ts, values) {
  this.ts = ts;
  this.values = values;
}

Row.fromJSON = function(json) {
  return new Row(new Date(json['t']), json['data']);
}

Row.prototype.value = function(deviceKey, readingKey) {
  return this.values[deviceKey][readingKey];
}

module.exports = Row;
