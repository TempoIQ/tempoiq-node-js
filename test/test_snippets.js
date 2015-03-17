var assert = require('assert');
var tempoiq = require('../lib/tempoiq');
var creds = {};

if (process.env.SNIPPET) {
  creds = require('./snippet-credentials.json');
}

var getClient = function() {
    var client = tempoiq.Client(creds.key, creds.secret, creds.hostname);
    return client;
}

var initialize = function(done_cb) {
  this.timeout(30000);
  console.log("Starting data initialization");
  var exec = require('child_process').exec;
  exec('python ./test/example-data/initialize.py -n ' + creds.hostname +
               ' -k ' + creds.key + ' -s ' + creds.secret,
      function(err, stdout, stderr) {
        if (err) {
          console.log("error! stdout:" + stdout.toString());
          console.log("stderr: " + stderr.toString());
        }
        done_cb(err);
      } 
  );
}

describe("Example code snippet tests", function() {
  if (!process.env.SNIPPET) {
    // skip em
    return;
  }

  before(initialize);

  it("create-device", function(done) {
    var client = getClient();

    // snippet-begin create-device
    client.createDevice(new tempoiq.Device("thermostat.0", 
      {
        name: "Test Thermostat",
        attributes: {
          model: "v1"
        },
        sensors: [
          new tempoiq.Sensor("temperature"),
          new tempoiq.Sensor("humidity")
        ]
      }),
      function(err, device) {
        if (err) throw err;
        // Successfully created device
        done();     // snippet-ignore
      }
    );
    // snippet-end
  });

  it("write-data", function(done) {
    var client = getClient();

    // snippet-begin write-data
    var device = "thermostat.0";
    var t1 = new Date("2015-01-01T00:00:00Z");
    var t2 = new Date("2015-01-01T00:00:05Z");

    var data = new tempoiq.BulkWrite();

    data.push(device, "temperature", 
              new tempoiq.DataPoint(t1, 68));
    data.push(device, "temperature",
              new tempoiq.DataPoint(t2, 67.5));
    data.push(device, "humidity",
              new tempoiq.DataPoint(t1, 71.5));
    data.push(device, "humidity",
              new tempoiq.DataPoint(t2, 70));

    client.writeBulk(data, function(err) {
        if (err) throw err;
        done();     // snippet-ignore
    });
    // snippet-end
  });

  it('read-data-one-device', function(done) {
    var client = getClient();
    // snippet-begin read-data-one-device
    var selection = {
      devices: {
        key: "thermostat.0"
      }
    };
    var start = new Date("2015-01-01T00:00:00Z");
    var end = new Date("2015-01-01T01:00:00Z");

    client.read(selection, start, end, null, function(err, data) {
      if (err) throw err;
      data.forEach(function(row) {
        var timestamp = row.ts;
        var values = [];        // List of sensor values at a timestamp
        for (var device in row.values) {
            for (var sensor in row.values[device]) {
                values.push(row.values[device][sensor]);
            }
        }
        assert(values.length > 0);  // snippet-ignore
      });
      assert(data.length > 0);    // snippet-ignore
      done(err);                  // snippet-ignore
    });
    // snippet-end
  });

  it("single-point", function(done) {
    var client = getClient();

    // snippet-begin single-point
    var ts = new Date("2015-01-10T00:00:00Z");
    var selection = {
      devices: { key: "thermostat.1" },
      sensors: { key: "temperature" }
    };

    client.single(selection, "before", ts, null, function(err, data) {
      if (err) {
        // handle error
      } else {
        if (data.length == 0) {
          // No point found
          err = "No point found!"       // snippet-ignore  Be sure to test the code path with a found point
        } else {
          var row = data[0];
          var point_timestamp = row.ts;
          var point_value = row.value('thermostat.1', 'temperature');
          assert.equal(point_timestamp.getFullYear(), 2015);     // snippet-ignore
          // do something
        }
      }
      done(err);                           // snippet-ignore
    });
    // snippet-end
  });
});

