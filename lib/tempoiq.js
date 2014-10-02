'use strict';

var LiveSession = require('./session/live_session');
var HttpResult = require('./session/http_result');

var BulkWrite = require('./models/bulk_write');
var Cursor = require('./models/cursor');
var DataPoint = require('./models/datapoint');
var Device = require('./models/device');
var Pipeline = require('./models/pipeline');
var Query = require('./models/query');
var Row = require('./models/row');
var Sensor = require('./models/sensor');

var TempoIQ = {
  BulkWrite: BulkWrite,
  DataPoint: DataPoint,
  Device: Device,
  Pipeline: Pipeline,
  Sensor: Sensor
};

TempoIQ.Client = function(key, secret, host, opts) {
  var base = this;
  var _defaultOptions = {
    port: 443,
    secure: true
  };

   // Client is the main interface to your TempoIQ backend.
   // ----------------------------------------------------
   
   // The client is broken down into two main sections:
  
   // [Device Provisioning]
   //   - createDevice
   //   - updateDevice
   //   - deleteDevice
   //   - deleteDevices
   //   - getDevice
   //   - listDevices
  
   // [DataPoint Reading / Writing]
   //   - writeBulk
   //   - writeDevice
   //   - read
  
   // == Key Concepts:
  
  // === Selection - A way to describe a grouping of related objects. Used primarily in Device / Sensor queries.

  var _initialize = function() {
    if (opts == undefined) {
      opts = _defaultOptions;
    }

    // Your TempoIQ backend key (String)
    base.key = key;

    // TempoIQ backend secret (String)
    base.secret = secret;

    // TempoIQ backend host, found on your TempoIQ backend dashboard (String)
    base.host = host;

    // TempoIQ backend port
    base.port = opts.port == undefined ? _defaultOptions.port : opts.port;

    // Whether to use SSL or not. Defauls to true.
    base.secure = opts.secure == undefined ? _defaultOptions.secure : opts.secure;

    // Makes backend calls, defaults to LiveSession.
    base._session = opts.session == undefined ? new LiveSession(key, secret, host, base.port, {secure: base.secure}) : opts.session;
  };


  // Create a Device in your TempoIQ backend
  //
  // @param {Device} device The device to create
  // @callback {function(err, device)} called with the created device
  base.createDevice = function(device, callback) {
    base._session.post("/v2/devices", JSON.stringify(device), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      } else if (result.code == HttpResult.NOT_FOUND) {
	return { error: new Error("Device not found"), payload: null };
      }
    });
  };

  // Delete a device by key
  //
  // @param {String} deviceKey The device key to delete
  // @callback {function(err, deleted) called with whether the device was deleted or not
  base.deleteDevice = function(deviceKey, callback) {
    base._session.delete("/v2/devices/"+encodeURIComponent(deviceKey), null, callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: true };
      }
    });
  };

  
  // Delete a set of devices by Selection criteria
  //
  // @param {Object} selection Device search criteria
  // @callback {function(err, deleteSummary) use deleteSummary.deleted to retrieve the number of devices deleted
  base.deleteDevices = function(selection, callback) {
    var query = new Query(selection, null, {name: "find", value: {quantifier: "all"}});
    base._session.delete("/v2/devices", JSON.stringify(query), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: JSON.parse(result.body) };
      }
    });
  };

  // Update a device
  //
  // @param {Device} Updated device object
  // @param {function(err, device) called with the updated device
  base.updateDevice = function(device, callback) {
    base._session.put("/v2/devices/"+encodeURIComponent(device.key), JSON.stringify(device), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      }
    });
  };

  // Fetch a device by key
  //
  // @param {String} deviceKey The device key to fetch by
  // @param {function(err, device) called with the found device
  base.getDevice = function(deviceKey, callback) {
    base._session.get("/v2/devices/"+encodeURIComponent(deviceKey), null, callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      } else if (result.code == HttpResult.NOT_FOUND) {
	return { error: null, payload: null };
      }
    });
  };

  // Search for a set of devices based on Selection criteria.
  // If you call with the default options, the callback will
  // yield you an array of Devices. If you call with option
  // streamed: true, you will be yielded a Cursor object
  // that implements the EventEmitter interface and has
  // the following events:
  //
  // Event 'data' - yields a device
  // Event 'end' - the end of the stream
  // Event 'error' - the stream is in error
  //
  // @param {Object} selection Device search criteria
  // @param {Object} default object is:
  // {
  //   streamed: false
  // }
  base.listDevices = function(selection, options, callback) {
    var base = this;

    var withOptions = function(sel, opt, cb) {
      var query = new Query(sel, null, {name: "find", value: {quantifier: "all"}});
      var cursor = new Cursor(Device, base._session, "/v2/devices", query);
      if (opt.streamed) {
	cb(cursor);
      } else {
	cursor.toArray(cb);
      }
      cursor.run();
    };

    if (arguments.length == 2) {
      withOptions(selection, {streamed: false}, options);
    } else {
      withOptions(selection, options, callback);
    }
  };

  base.writeBulk = function(write, callback) {
    base._session.post("/v2/write", JSON.stringify(write), callback, function(result) {
      if (result.code == HttpResult.OK) {
	var status = {success: true, partialSuccess: false, failures: []};
	return { error: null, payload: status };
      } else if (result.code == HttpResult.MULTI) {
	var status = {success: false, partialSuccess: true, failures: []};
	return { error: null, payload: status };
      }
    });
  };

  base.writeDevice = function(deviceKey, ts, values, callback) {
    var write = new BulkWrite;
    for (var sensorKey in values) {
      var value = values[sensorKey];
      write.push(deviceKey, sensorKey, new DataPoint(ts, value));
    }

    base.writeBulk(write, function(err, status) {
      if (err) {
	callback(err, null);
      } else {
	callback(null, status.success);
      }
    });
  };

  base.read = function(selection, pipeline, start, end, options, callback) {
    var query = new Query(selection, pipeline, {name: "read", value: {start: start, stop: end}});
    var cursor = new Cursor(Row, base._session, "/v2/read", query);
    callback(cursor);
    cursor.run();
  };

  _initialize();
  return base;
};

module.exports = TempoIQ;

