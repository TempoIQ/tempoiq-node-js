'use strict';

 // Represents all the data found at a single timestamp.

 // The hierarchy looks like:
 // - timestamp
 //   - deviceKey
 //     - [sensorKey | aggregationName] => value
function Row(ts, values) {
  this.ts = ts;
  this.values = values;
}

Row.fromJSON = function(json) {
  return new Row(new Date(json['t']), json['data']);
}

// Convenience method to select a single (device, [sensorKey | aggregationKey])
// value from within the row.
Row.prototype.value = function(deviceKey, readingKey) {
  return this.values[deviceKey][readingKey];
}

module.exports = Row;
