'use strict';

var LiveSession = require('./session/live_session');
var HttpResult = require('./session/http_result');

var BulkWrite = require('./models/bulk_write');
var Cursor = require('./models/cursor');
var DataPoint = require('./models/datapoint');
var Device = require('./models/device');
var MultiStatus = require('./models/multi_status');
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
  var MEDIA_PREFIX = "application/prs.tempoiq";

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
   //   - deleteDatapoints
   //   - latest
  
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

  base._mediaTypes = function(types) {
    return {
      "Accept": types.accept.join(", "),
      "Content-Type": types.content
    };
  };

  base._mediaType = function(mediaResource, mediaVersion, suffix) {
    var suf = suffix || "json";
    return MEDIA_PREFIX + "." + mediaResource + "." + mediaVersion + "+" + suf;
  };

  // Create a Device in your TempoIQ backend
  //
  // @param {Device} device The device to create
  // @param {function(err, device)} called with the created device
  base.createDevice = function(device, callback) {
    base._session.post("/v2/devices", JSON.stringify(device), {}, callback, function(result) {
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
  // @param {function(err, deleted) called with whether the device was deleted or not
  base.deleteDevice = function(deviceKey, callback) {
    base._session.delete("/v2/devices/"+encodeURIComponent(deviceKey), null, {}, callback, function(result) {
      if (result.code == HttpResult.OK) {
        return { error: null, payload: true };
      }
    });
  };

  
  // Delete a set of devices by Selection criteria
  //
  // @param {Object} selection Device search criteria
  // @param {function(err, deleteSummary) callback Use deleteSummary.deleted to retrieve the number of devices deleted
  base.deleteDevices = function(selection, callback) {
    var query = new Query(selection, null, {name: "find", value: {quantifier: "all"}});
    base._session.delete("/v2/devices", JSON.stringify(query), {}, callback, function(result) {
      if (result.code == HttpResult.OK) {
        return { error: null, payload: JSON.parse(result.body) };
      }
    });
  };

  // Delete a range of datapoints within a device, by sensor
  //
  // @param {String} deviceKey Device key to delete from
  // @param {String} sensorKey Sensor key to delete within the device
  // @param {Date} start The start of the delete range
  // @param {Date} end The end of the delete range
  // @param {function(err)} callback
  base.deleteDatapoints = function(deviceKey, sensorKey, start, end, callback) {
    base._session.delete("/v2/devices/"+encodeURIComponent(deviceKey)+"/sensors/"+encodeURIComponent(sensorKey)+"/datapoints", JSON.stringify({start: start, stop: end}), {}, callback, function(result) {
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
    base._session.put("/v2/devices/"+encodeURIComponent(device.key), JSON.stringify(device), {}, callback, function(result) {
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
    base._session.get("/v2/devices/"+encodeURIComponent(deviceKey), null, {}, callback, function(result) {
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
  // @param {Object} options default object is:
  // {
  //   streamed: false
  // }
  // @param {function(err, devices)} callback List of devices if streamed == false
  //        {function(cursor)} callback Cursor of devices if streamed == true
  base.listDevices = function(selection, options, callback) {
    var base = this;

    var withOptions = function(sel, opt, cb) {
      var find = {quantifier: "all"};
      if (opt.limit) {
        find["limit"] = opt.limit;
      }
      var query = new Query(sel, null, {name: "find", value: find});
      var medias = base._mediaTypes({
        accept: [base._mediaType("device-collection", "v2"), base._mediaType("error", "v1")],
        content: base._mediaType("query", "v1")
      });
      var cursor = new Cursor(Device, base._session, "/v2/devices", query, medias);
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

  // Write multiple datapoints to multiple device sensors. This function
  // is generally useful for importing data to many devices at once.
  //
  // @param {BulkWrite} write BulkWrite with device / sensor data
  // @param {function(err, multiStatus)} callback Returns a MultiStatus with the results of the write
  base.writeBulk = function(write, callback) {
    base._session.post("/v2/write", JSON.stringify(write), {}, callback, function(result) {
      if (result.code == HttpResult.OK) {
        return { error: null, payload: new MultiStatus };
      } else if (result.code == HttpResult.MULTI) {
        return { error: null, payload: new MultiStatus(JSON.parse(result.body)) };
      }
    });
  };

  // Write to multiple sensors within a single device, at the same timestamp. Useful
  // for 'sampling' from all the sensors on a device and ensuring that the timestamps
  // align.
  //
  // @param {String} deviceKey Device key to write to
  // @param {Date} ts Timestamp that datapoints will be written at
  // @param {Object} values Object from sensorKey => value
  // @param {function(err)} callback Returns an error
  base.writeDevice = function(deviceKey, ts, values, callback) {
    var write = new BulkWrite;
    for (var sensorKey in values) {
      var value = values[sensorKey];
      write.push(deviceKey, sensorKey, new DataPoint(ts, value));
    }

    base.writeBulk(write, function(err, status) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  };

  // Read from a set of Device / Sensors, with an optional functional pipeline
  // to transform the values.
  //
  // @param {Object} selection Device selection, describes which devices / sensors we should operate on
  // @param {Date} start The start time for the read interval
  // @param {Date} end The end time for the read interval
  // @param {Object} options Default object is:
  // {
  //   streamed: false
  // }
  // @param {function(err, rows)} callback List of Rows if streamed == false
  //        {function(cursor)} callback Cursor of Rows if streamed == true
  base.read = function(selection, start, end, pipeline, options, callback) {
    var base = this;

    var withOptions = function(sel, st, en, pip, opt, cb) {
      var read = {start: start, stop: end};
      if (opt.limit) {
        read["limit"] = opt.limit;
      }
      var query = new Query(selection, pipeline, {name: "read", value: read});
      var medias = base._mediaTypes({
        accept: [base._mediaType("datapoint-collection", "v2"), base._mediaType("error", "v1")],
        content: base._mediaType("query", "v1")
      });
      var cursor = new Cursor(Row, base._session, "/v2/read", query, medias);
      if (opt.streamed) {
        cb(cursor);
      } else {
        cursor.toArray(cb);
      }
      cursor.run();
    };

    if (arguments.length == 5) {
      withOptions(selection, start, end, pipeline, {streamed: false}, options);
    } else {
      withOptions(selection, start, end, pipeline, options, callback);
    }
  };

  // Get a single data point from a set of Device / Sensors.
  //
  // @param {Object} selection Device selection, describes which devices / sensors we should operate on
  // @param {String} func The function for finding the point to return: latest, before, after, exact, etc.
  // @param {Date} timestamp The timestamp argument for the function (if required). Ignored for 'earliest' and 'latest.'
  // @param {Object} options Default object is:
  // {
  //   streamed: false
  // }
  // @param {function(err, rows)} callback List of Rows if streamed == false
  //        {function(cursor)} callback Cursor of Rows if streamed == true
  base.single = function(selection, func, timestamp, pipeline, options, callback) {
    var base = this;
    var withOptions = function(opts, cb) {
      var args = {'function': func};
      if (timestamp) {
        args['timestamp'] = timestamp;
      }
      var query = new Query(selection, pipeline, {name: "single", value: args});
      var cursor = new Cursor(Row, base._session, "/v2/single", query, {});
      if (opts.streamed) {
        cb(cursor);
      } else {
        cursor.toArray(cb);
      }
      cursor.run();
    };

    if (arguments.length == 5) {
      withOptions({streamed: false}, options);
    } else {
      withOptions(options, callback);
    }
  };

  // Get the latest value from a  set of Device / Sensors, with an optional functional pipeline
  // to transform the values.
  //
  // @param {Object} selection Device selection, describes which devices / sensors we should operate on
  // @param {Object} options Default object is:
  // {
  //   streamed: false
  // }
  // @param {function(err, rows)} callback List of Rows if streamed == false
  //        {function(cursor)} callback Cursor of Rows if streamed == true
  base.latest = function(selection, pipeline, options, callback) {
    var base = this;
    if (arguments.length == 3) {
      base.single(selection, 'latest', null, pipeline, options);
    } else {
      base.single(selection, 'latest', null, pipeline, options, callback);
    }
  };

  _initialize();
  return base;
};

module.exports = TempoIQ;

