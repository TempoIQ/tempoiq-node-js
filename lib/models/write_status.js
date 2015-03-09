'use strict';

// WriteStatus is used in cases where an operation might partially succeed
// and partially fail. It provides several helper functions to introspect the
// failure and take appropriate action. (Log failure, resend DataPoints, etc.)
function WriteStatus(status) {
  this.status = status;
}

// Was the request a total success?
WriteStatus.prototype.isSuccess = function() {
  for (var deviceKey in this.status) {
    if (this.status[deviceKey].success === false) {
      return false;
    }
  }
  return true;
}

// Did the request have partial failures?
WriteStatus.prototype.isPartialSuccess = function() {
  return !this.isSuccess();
}

// Retrieve the failures
// @returns Object {deviceKey: message}
WriteStatus.prototype.failures = function() {
  var failures = {};
  for (var deviceKey in this.status) {
    if (this.status[deviceKey].success === false) {
      failures[deviceKey] = this.status[deviceKey].message;
    }
  }
  return failures;
}

WriteStatus.prototype._filterBy = function(deviceState) {
  var results = {};
  for (var deviceKey in this.status) {
    if (this.status[deviceKey].device_state === deviceState) {
      results[deviceKey] = this.status[deviceKey];
    }
  }
  return results;
}

WriteStatus.prototype.existing = function() {
  return this._filterBy('existing');
}

WriteStatus.prototype.modified = function() {
  return this._filterBy('modified');
}

WriteStatus.prototype.created = function() {
  return this._filterBy('created');
}

module.exports = WriteStatus;

