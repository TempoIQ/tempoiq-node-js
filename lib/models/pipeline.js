'use strict';

function Pipeline() {
  this.functions = [];
}

Pipeline.prototype.aggregate = function(fun) {
  this.functions.push({
    name: "aggregation",
    arguments: [fun]
  });
}

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
