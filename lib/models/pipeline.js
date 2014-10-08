'use strict';

// Used to transform a stream of devices using a list of
// function transformations.
function Pipeline() {
  this.functions = [];
}

// DataPoint aggregation
// @param {String} - Function to aggregate by. One of:
//  * count - The number of datapoints across sensors
//  * sum - Summation of all datapoints across sensors
//  * mult - Multiplication of all datapoints across sensors
//  * min - The smallest datapoint value across sensors
//  * max - The largest datapoint value across sensors
//  * stddev - The standard deviation of the datapoint values across sensors
//  * ss - Sum of squares of all datapoints across sensors
//  * range - The maximum value less the minimum value of the datapoint values across sensors
//  * percentile,N (where N is what percentile to calculate) - Percentile of datapoint values across sensors
Pipeline.prototype.aggregate = function(fun) {
  this.functions.push({
    name: "aggregation",
    arguments: [fun]
  });
}

// Rollup a stream of DataPoints to a given period

// @param {String} period The duration of each rollup. Specified by:
//   * A number and unit of time: EG - '1min' '10days'.
//   * A valid ISO8601 duration
// @param {String} function Function to rollup by. One of:
//   * count - The number of datapoints in the period
//   * sum - Summation of all datapoint values in the period
//   * mult - Multiplication of all datapoint values in the period
//   * min - The smallest datapoint value in the period
//   * max - The largest datapoint value in the period
//   * stddev - The standard deviation of the datapoint values in the period
//   * ss - Sum of squares of all datapoint values in the period
//   * range - The maximum value less the minimum value of the datapoint values in the period
//   * percentile,N (where N is what percentile to calculate) - Percentile of datapoint values in period
// @param {Date} start The beginning of the rollup interval
Pipeline.prototype.rollup = function(period, fun, start) {
  this.functions.push({
    name: "rollup",
    arguments: [
      fun,
      period,
      start.toISOString()
    ]
  });
}

// Interpolate missing data within a sensor, based on

// @param {String} period The duration of each rollup. Specified by:
//   * A number and unit of time: EG - '1min' '10days'.
//   * A valid ISO8601 duration
// @param {String} function The type of interpolation to perform. One of:
//   * linear - Perform linear interpolation
//   * zoh - Zero order hold interpolation
// @param {Date} start The beginning of the interpolation range
// @param {Date} end The end of the interpolation range
Pipeline.prototype.interpolate = function(period, fun, start, end) {
  this.functions.push({
    name: "interpolate",
    arguments: [
      fun,
      period,
      start.toISOString(),
      end.toISOString(),
    ]
  });
}

Pipeline.prototype.toJSON = function() {
  return {
    functions: this.functions
  }
}

module.exports = Pipeline;
