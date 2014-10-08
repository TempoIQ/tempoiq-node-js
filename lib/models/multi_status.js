'use strict';

// MultiStatus is used in cases where an operation might partially succeed
// and partially fail. It provides several helper functions to introspect the
// failure and take appropriate action. (Log failure, resend DataPoints, etc.)
function MultiStatus(status) {
  this.status = status;
}

// Was the request a total success?
MultiStatus.prototype.isSuccess = function() {
  return !this.status;
}

// Did the request have partial failures?
MultiStatus.prototype.isPartialSuccess = function() {
  return !this.isSuccess();
}

// Retrieve the failures
// @returns Object {deviceKey: message}
MultiStatus.prototype.failures = function() {
  var failures = {};
  for (var deviceKey in this.status) {
    failures[deviceKey] = this.status[deviceKey].message;
  }
  return failures;
}

module.exports = MultiStatus;

