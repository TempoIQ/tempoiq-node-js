'use strict';

function MultiStatus(status) {
  this.status = status;
}

MultiStatus.prototype.isSuccess = function() {
  return !this.status;
}

MultiStatus.prototype.isPartialSuccess = function() {
  return !this.isSuccess();
}

MultiStatus.prototype.failures = function() {
  var failures = {};
  for (var deviceKey in this.status) {
    failures[deviceKey] = this.status[deviceKey].message;
  }
  return failures;
}

module.exports = MultiStatus;

