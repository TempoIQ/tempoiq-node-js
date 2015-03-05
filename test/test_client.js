'use strict';

var assert = require("assert");
var tempoiq = require("../lib/tempoiq");

var StubbedSession = require("../lib/session/stubbed_session");
var LiveSession = require("../lib/session/live_session");

// Tag test devices with a unique-ish attribute and key prefix so they're 
// unlikely to conflict with existing devices in the backend
var devicePrefix = "b90467087145fd06";

var _getClient = function(consumeStubs) {
  if (process.env.INTEGRATION) {
    var creds = require('./integration-credentials.json')
    return tempoiq.Client(creds.key, creds.secret, creds.hostname, {port: creds.port, secure: creds.secure});
  } else {
    return tempoiq.Client("stubbed_key", "stubbed_secret", "stubbed_host", {secure: false, session: new StubbedSession(consumeStubs)})
  }
}

var _createDevice = function(client, key, callback, thisArgs ) {
  var stubbed_body = {
    key: devicePrefix + key,
    name: "My Awesome Device",
    attributes: {building: "1234"},
    sensors: [
      {
        key: "sensor1",
        name: "My Sensor",
        attributes: {unit: "F"}
      },
      {
        key: "sensor2",
        name: "My Sensor2",
        attributes: {unit: "C"}
      }
    ]
  };
  stubbed_body.attributes[devicePrefix] = devicePrefix;

  client._session.stub("POST", "/v2/devices", 200, JSON.stringify(stubbed_body), {});

  var props = {
    name: "My Awesome Device",
    attributes: {building: "1234"},
    sensors: [
      new tempoiq.Sensor("sensor1", {
        name: "My Sensor",
        attributes: {unit: "F"}
      }),
      new tempoiq.Sensor("sensor2", {
        name: "My Sensor2",
        attributes: {unit: "C"}
      })
    ]
  };
  props.attributes[devicePrefix] = devicePrefix;
  client.createDevice(new tempoiq.Device(devicePrefix + key, props), function(err, device) {
    if (err) throw err;
    callback(device);
  });
};

var _deleteDevices = function(client, callback) {
  var stubbed_body = {
    deleted: 1
  };
  client._session.stub("DELETE", "/v2/devices", 200, JSON.stringify(stubbed_body), {});

  var selection = {devices: {or: [{attributes: {}}, {key: devicePrefix + "upserted"}]}};
  selection.devices.or[0].attributes[devicePrefix] = devicePrefix;

  client.deleteDevices(selection, function(err, summary) {
    if (err) throw err;
    callback(summary);
  });
};

describe("Client", function() {
  beforeEach(function(done) {
    var client = _getClient();
    _deleteDevices(client, function(summary) {
      done();
    });
  });

  afterEach(function(done) {
    var client = _getClient();
    _deleteDevices(client, function(summary) {
      done();
    });
  });

  describe("Initialization", function() {
    it("creates the client with the correct construction parameters", function() {
      var client = tempoiq.Client("key", "secret", "host", {
        port: 80
      });
      assert.equal("key", client.key);
      assert.equal("secret", client.secret);
      assert.equal("host", client.host);
      assert.equal(80, client.port);
    });

    it("invokes callbacks even in the face of connection issues", function() {
      var opts = {
        port: 23432,
        secure: false
      };
      if (!process.env.INTEGRATION) {
        opts.session = new StubbedSession();
      }

      var client = tempoiq.Client("key", "secret", "not-found-hostname", opts);

      client.listDevices({devices: "all"}, function(err, devices) {
        if (!err) throw new Error("Should have received an error");
      });
    });
  })

  describe("Device provisioning", function() {
    it("creates a device", function(done) {
      var client = _getClient();
      var stubbedBody = {
        key: devicePrefix + "stubbed_key",
        name: "stubbed_name",
        attributes: {attr1: "value1"},
        sensors: []
      };
      stubbedBody.attributes[devicePrefix] = devicePrefix;
      client._session.stub("POST", "/v2/devices", 200, JSON.stringify(stubbedBody), {});

      var props = {
        name: "stubbed_name",
        attributes: {attr1: "value1"},
        sensors: []
      };
      props.attributes[devicePrefix] = devicePrefix;
      client.createDevice(new tempoiq.Device(devicePrefix + "stubbed_key", props),
      function(err, device) {
        if (err) throw err;
        assert.equal(devicePrefix + "stubbed_key", device.key);
        assert.equal("stubbed_name", device.name);
        assert.equal("value1", device.attributes["attr1"]);
        assert.equal(0, device.sensors.length);
        done();
      });
    });

    it("deletes a device by key", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        client._session.stub("DELETE", "/v2/devices/"+encodeURIComponent(device.key), 200);

        client.deleteDevice(device.key, function(err, deleted) {
          assert(deleted);
          done();
        });
      });
    });

    it("deletes a device", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        var stubbedBody = {
          deleted: 1
        };
        client._session.stub("DELETE", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
        client.deleteDevices({devices: {key: device.key}}, function(err, summary) {
          if (err) throw err;
          assert.equal(1, summary.deleted);
          done();
        });
      })
    });

    it("updates a device", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        var originalName = device.name;
        device.name = "Updated";
        assert.notEqual(originalName, device.name);

        client._session.stub("PUT", "/v2/devices/"+encodeURIComponent(device.key), 200, JSON.stringify(device), {});
        client.updateDevice(device, function(err, updatedDevice) {
          if (err) throw err;
          assert.equal(device.name, updatedDevice.name);
          done();
        });
      });
    });

    it("gets a device", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        client._session.stub("GET", "/v2/devices/"+encodeURIComponent(device.key), 200, JSON.stringify(device), {});
        client.getDevice(device.key, function(err, found) {
          if (err) throw err;
          assert.equal(device.key, found.key);
          done();
        });
      })
    });

    it("returns no device when not found", function(done) {
      var client = _getClient();
      client._session.stub("GET", "/v2/devices/not_found", 404, "", {});
      client.getDevice("not_found", function(err, found) {
        if (err) throw err;
        assert.equal(null, found);
        done();
      });
    });

    it("lists the devices with streaming", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        var stubbedBody = {
          data: [device]
        };

        client._session.stub("GET", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
        client.listDevices({devices: {key: device.key}}, {streamed: true}, function(cursor) {
          var dev = [];
          cursor.on('data', function(device) {
            dev.push(device);
          }).on('end', function() {
            assert.equal(1, dev.length);
            assert.equal(device.key, dev[0].key);
            done();
          }).on('error', function(e) {
            throw e;
          });
        });
      });
    });

    it("lists the devices without streaming", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        var stubbedBody = {
          data: [device]
        };

        client._session.stub("GET", "/v2/devices", 200, JSON.stringify(stubbedBody), {});
        client.listDevices({devices: {key: device.key}}, function(err, devices) {
          if (err) throw err;
          assert.equal(1, devices.length);
          assert.equal(device.key, devices[0].key);
          done();
        });
      });
    });

    it("lists the devices with cursoring", function(done) {
      var client = _getClient(true);
      _createDevice(client, "device1", function(device1) {
        _createDevice(client, "device2", function(device2) {
          var nextQuery = {
            search: {
              select: "devices",
              filters: {
                devices: {attribute_key: devicePrefix}
              },
            },
            find: {
              quantifier: "all"
            }
          };

          var stubbedBody = {
            data: [device1],
            next_page: {
              next_query: nextQuery
            }
          };
          client._session.stub("GET", "/v2/devices", 200, JSON.stringify(stubbedBody), {});

          var nextList = stubbedBody;
          delete nextList.next_page;
          nextList["data"][0] = device1;

          client._session.stub("GET", "/v2/devices", 200, JSON.stringify(nextList), {});

          client.listDevices({devices: {attribute_key: devicePrefix}}, {limit: 1}, function(err, devices) {
            if (err) throw err;
            assert.equal(2, devices.length);
            done();
          });
        });
      });
    });
  });

  describe("Device writing", function() {
    it("bulk writes", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {
        var ts = new Date(2012,1,1);
        var deviceKey = device.key;
        var sensorKey = device.sensors[0].key;

        client._session.stub("POST", "/v2/write", 200, null, {});

        var write = new tempoiq.BulkWrite;
        write.push(deviceKey, sensorKey, new tempoiq.DataPoint(ts, 1.23));
        client.writeBulk(write, function(err, status) {
          assert(status.isSuccess());
          done();
        });
      });
    });

    it("handles different upsert statuses", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device1) {
        _createDevice(client, "device2", function(device2) {

          var ts = new Date(2012,1,1);
          var device1Key = device1.key;
          var sensor1Key = device1.sensors[0].key;
          var device2Key = devicePrefix + "device2"; 
          var device3Key = devicePrefix + "upserted";

          var stubbedBody = {};
          stubbedBody[device1Key] = {
            success: true,
            device_state: "existing",
            message: null
          };
          stubbedBody[device2Key] = {
            success: true,
            device_state: "modified",
            message: null
          };
          stubbedBody[device3Key] = {
            success: true,
            device_state: "created",
            message: null
          };
          client._session.stub("POST", "/v2/write", 207, JSON.stringify(stubbedBody));

          var write = new tempoiq.BulkWrite;
          write.push(device1Key, sensor1Key, new tempoiq.DataPoint(ts, 1.23));
          write.push(device2Key, "foobar", new tempoiq.DataPoint(ts, 1.23));
          write.push(device3Key, "foobar", new tempoiq.DataPoint(ts, 1.23));
          client.writeBulk(write, function(err, status) {
            if (err) throw err;
            assert(status.existing()[device1Key].success === true);
            assert(status.modified()[device2Key].success === true);
            assert(status.created()[device3Key].success === true);
            done();
          });
        });
      });
    });

    it("writes to a device", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1);
        var deviceKey = device.key;
        var sensorKey = device.sensors[0].key;

        client._session.stub("POST", "/v2/write", 200, null, {});
        var values = {};
        values[sensorKey] = 1.23;
        client.writeDevice(deviceKey, ts, values, function(err, written) {
          if (err) throw err;
          done();
        });
      });
    });
  });

  describe("Device reading", function() {
    it("reads with a pipeline", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        // Welcome to callback city.
        client.writeDevice(deviceKey, new Date(2012, 1, 1, 1), d1, function(err, written) {
          if (err) throw err;
          client.writeDevice(deviceKey, new Date(2012, 1, 1, 2), d1, function(err, written) {
            if (err) throw err;

            var data = {}
            data[deviceKey] = {mean: 6.0};
            var stubbedRead = {
              data: [
                {
                  t: start.toISOString(),
                  data: data
                }
              ]
            };

            client._session.stub("GET", "/v2/read", 200, JSON.stringify(stubbedRead));
            var deviceSel = {}
            deviceSel["key"] = deviceKey;

            var pipeline = new tempoiq.Pipeline;
            pipeline.rollup("sum", "1day", start);
            pipeline.aggregate("mean");
            client.read({devices: deviceSel}, start, end, pipeline, {streamed: true}, function(res) {
              res.on("data", function(row) {
                assert.equal(start.toString(), row.ts.toString());
                assert.equal(6.0, row.value(deviceKey, "mean"));
              }).on("end", function() {
                done();
              }).on("error", function() {
                throw err;
              });
            });
          });
        });
      });
    });

    it("reads without a pipeline", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 4.0;
          sensors[sensorKey2] = 2.0;
          data[deviceKey] = sensors;
          var stubbedRead = {
            data: [
              {
                t: ts.toISOString(),
                data: data
              }
            ]
          };

          client._session.stub("GET", "/v2/read", 200, JSON.stringify(stubbedRead));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          client.read({devices: deviceSel}, start, end, null, {streamed: true}, function(res) {
            res.on("data", function(row) {
              assert.equal(ts.toString(), row.ts.toString());
              assert.equal(4.0, row.value(deviceKey, sensorKey1));
              assert.equal(2.0, row.value(deviceKey, sensorKey2));
            }).on("end", function() {
              done();
            });
          });
        });
      });
    });

    it("reads with cursoring", function(done) {
      var client = _getClient(true);
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var ts2 = new Date(2012, 1, 1, 2)
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;
          client.writeDevice(deviceKey, ts2, d1, function(err, written) {
            if (err) throw err;

            var data = {}
            var sensors = {};
            sensors[sensorKey1] = 4.0;
            sensors[sensorKey2] = 2.0;
            data[deviceKey] = sensors;

            var nextQuery = {
              search: {
                select: "devices",
                filters: {devices: "all"}
              },
              read: {
                start: ts.toISOString(),
                stop: ts.toISOString()
              },
              fold: { functions: [] }
            };

            var stubbedRead = {
              data: [
                {
                  t: ts.toISOString(),
                  data: data
                }
              ],
              next_page: {
                next_query: nextQuery
              }
            };

            client._session.stub("GET", "/v2/read", 200, JSON.stringify(stubbedRead));
            
            var nextRead = stubbedRead;
            delete nextRead.next_page;
            nextRead["data"][0]["t"] = ts2.toISOString();

            client._session.stub("GET", "/v2/read", 200, JSON.stringify(nextRead));

            var deviceSel = {}
            deviceSel["key"] = deviceKey;
            client.read({devices: deviceSel}, start, end, null, {limit: 1}, function(err, rows) {
              if (err) throw err;
              assert.equal(2, rows.length);
              assert.equal(4.0, rows[0].value(deviceKey, sensorKey1));
              assert.equal(2.0, rows[0].value(deviceKey, sensorKey2));

              assert.equal(4.0, rows[1].value(deviceKey, sensorKey1));
              assert.equal(2.0, rows[1].value(deviceKey, sensorKey2));

              done();
            });
          });
        });
      });
    });

    it("reads without streaming", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var ts2 = new Date(2012,1,1,2);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        var write = new tempoiq.BulkWrite;
        write.push(deviceKey, sensorKey1, new tempoiq.DataPoint(ts, 1.23));
        write.push(deviceKey, sensorKey1, new tempoiq.DataPoint(ts2, 1.23));
        client.writeBulk(write, function(err, status) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 1.23;
          data[deviceKey] = sensors;
          var stubbedRead = {
            data: [
              {
                t: ts.toISOString(),
                data: data
              },
              {
                t: ts2.toISOString(),
                data: data
              }
            ]
          };

          client._session.stub("GET", "/v2/read", 200, JSON.stringify(stubbedRead));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          client.read({devices: deviceSel}, start, end, null, function(err, rows) {
            if (err) throw err;
            assert.equal(2, rows.length);
            assert.equal(ts.toString(), rows[0].ts.toString());
            done();
          });
        });
      });
    });
  });

  describe("Single point", function() {
    it("gets latest value without streaming", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;
        var pipeline = new tempoiq.Pipeline;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 4.0;
          sensors[sensorKey2] = 2.0;
          data[deviceKey] = sensors;
          var stubbedRead = {
            data: [
              {
                t: ts.toISOString(),
                data: data
              }
            ]
          };

          client._session.stub("GET", "/v2/single", 200, JSON.stringify(stubbedRead));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          client.latest({devices: deviceSel}, pipeline, function(err, rows) {
            if (err) throw err;
            assert.equal(1, rows.length);
            assert.equal(ts.toString(), rows[0].ts.toString());
            done();
          });
        });
      });
    });

    it("gets single value before a timestamp", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;
        var read_ts = new Date(2012, 1, 1, 2);

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 4.0;
          sensors[sensorKey2] = 2.0;
          data[deviceKey] = sensors;
          var stubbedRead = {
            data: [
              {
                t: ts.toISOString(),
                data: data
              }
            ]
          };

          client._session.stub("GET", "/v2/single", 200, JSON.stringify(stubbedRead));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          client.single({devices: deviceSel}, 'before', read_ts,
                        null, {streamed: true}, function(cursor) {
            var values = [];
            cursor.on('data', function(value) {
              values.push(value);
            }).on('end', function() {
              assert.equal(1, values.length);
              done();
            }).on('error', function(e) {
              throw e;
            });
          });
        });
      });
    });

    it("gets latest value with a pipeline", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;
        var pipeline = new tempoiq.Pipeline;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 4.0;
          sensors[sensorKey2] = 2.0;
          data[deviceKey] = sensors;
          var stubbedRead = {
            data: [
              {
                t: ts.toISOString(),
                data: data
              }
            ]
          };

          client._session.stub("GET", "/v2/single", 200, JSON.stringify(stubbedRead));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          client.single({devices: deviceSel}, 'earliest', null, pipeline, {streamed: true}, function(cursor) {
            var values = [];
            cursor.on('data', function(value) {
              values.push(value);
            }).on('end', function() {
              assert.equal(1, values.length);
              done();
            }).on('error', function(e) {
              throw e;
            });
          });
        });
      });
    });
  });

  describe("Deleting datapoints", function() {
    it("deletes datapoints from a device/sensor", function(done) {
      var client = _getClient();
      _createDevice(client, "device1", function(device) {

        var ts = new Date(2012,1,1,1);
        var start = new Date(2012,1,1);
        var end = new Date(2012,1,2);

        var deviceKey = device.key;
        var sensorKey1 = device.sensors[0].key;
        var sensorKey2 = device.sensors[1].key;
        var pipeline = new tempoiq.Pipeline;

        var stubbedBody = {};
        stubbedBody[deviceKey] = {
          success: true,
          device_state: "existing",
          message: null
        };
        client._session.stub("POST", "/v2/write", 200, JSON.stringify(stubbedBody));

        var d1 = {}
        d1[sensorKey1] = 4.0;
        d1[sensorKey2] = 2.0;

        client.writeDevice(deviceKey, ts, d1, function(err, written) {
          if (err) throw err;

          var data = {}
          var sensors = {};
          sensors[sensorKey1] = 4.0;
          sensors[sensorKey2] = 2.0;
          data[deviceKey] = sensors;
          var stubbedDelete = {
            deleted: 1
          };

          client._session.stub("DELETE", "/v2/devices/" + deviceKey + "/sensors/" + sensorKey1 + "/datapoints", 200, JSON.stringify(stubbedDelete));
          var deviceSel = {}
          deviceSel["key"] = deviceKey;

          var write = new tempoiq.BulkWrite;
          write.push(deviceKey, sensorKey1, new tempoiq.DataPoint(ts, 1.23));
          client.writeBulk(write, function(err, status) {
            assert(status.isSuccess());

            client.deleteDatapoints(deviceKey, sensorKey1, start, end, function(err, summary) {
              if (err) throw err;
              assert.equal(summary.deleted, 1);
              done();
            });
          });
        });
      });
    });
  });
});
