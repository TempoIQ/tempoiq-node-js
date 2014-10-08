'use strict';

// The core type of TempoIQ. Holds a timestamp and a value.
function DataPoint(ts, value) {
  // Timestamp of the DataPoint [Date]
  this.t = ts;
  // Value [Number]
  this.v = value;
}

module.exports = DataPoint;
