'use strict';

var LiveSession = require('./session/live_session');
var HttpResult = require('./session/http_result');

var BulkWrite = require('./models/bulk_write');
var Cursor = require('./models/cursor');
var DataPoint = require('./models/datapoint');
var Device = require('./models/device');
var Pipeline = require('./models/pipeline');
var Query = require('./models/query');
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

  var _initialize = function() {
    if (opts == undefined) {
      opts = _defaultOptions;
    }

    base.key = key;
    base.secret = secret;
    base.host = host;
    base.port = opts.port == undefined ? _defaultOptions.port : opts.port;
    base.secure = opts.secure == undefined ? _defaultOptions.secure : opts.secure;
    base._session = opts.session == undefined ? new LiveSession(key, secret, host, base.port, {secure: base.secure}) : opts.session;
  };

  base.createDevice = function(device, callback) {
    base._session.post("/v2/devices", JSON.stringify(device), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      } else if (result.code == HttpResult.NOT_FOUND) {
	return { error: new Error("Device not found"), payload: null };
      }
    });
  };

  base.deleteDevices = function(selection, callback) {
    var query = new Query(selection, null, {name: "find", value: {quantifier: "all"}});
    base._session.delete("/v2/devices", JSON.stringify(query), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: JSON.parse(result.body) };
      }
    });
  };

  base.updateDevice = function(device, callback) {
    // TODO: Figure out how to avoid letting people mutate the key
    base._session.put("/v2/devices/"+encodeURIComponent(device.key), JSON.stringify(device), callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      }
    });
  };

  base.getDevice = function(deviceKey, callback) {
    base._session.get("/v2/devices/"+encodeURIComponent(deviceKey), null, callback, function(result) {
      if (result.code == HttpResult.OK) {
	return { error: null, payload: Device.fromJSON(JSON.parse(result.body)) };
      } else if (result.code == HttpResult.NOT_FOUND) {
	return { error: null, payload: null };
      }
    });
  };

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

  base.writeDevice = function(deviceKey, sensorKey, ts, values, callback) {
    var write = new BulkWrite;
    for (key in values) {
      var value = values[key];
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

  _initialize();
  return base;
};

module.exports = TempoIQ;

