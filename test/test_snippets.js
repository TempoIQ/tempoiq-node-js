var assert = require('assert');
var tempoiq = require('../lib/tempoiq');
var creds = require('./snippet-credentials.json');


/*
 * A function block that never gets executed. For snippets that we don't
 * want to test
 */
var snippetsUntested = function() {
    // snippet-begin create-client
    var tempoiq = require('tempoiq');
    var client = tempoiq.Client(key, secret, host);
    // snippet-end
}

var getClient = function() {
    var client = tempoiq.Client(creds.key, creds.secret, creds.hostname);
    return client;
}

var initialize = function(done_cb) {
  this.timeout(10000);
  var exec = require('child_process').exec;
  exec('python ../example-setup/initialize.py -n ' + creds.hostname +
               ' -k ' + creds.key + ' -s ' + creds.secret, 
      done_cb);
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
    client.createDevice(new tempoiq.Device("thermostat.7", 
      {
        name: "Beta thermostat",
        attributes: {
          type: "thermostat",
          customer: "Internal Dev"
        },
        sensors: [
          new tempoiq.Sensor("temperature", {
            name: "Temperature",
            attributes: {unit: "celsius"}
          }),
          new tempoiq.Sensor("humidity", {
            name: "Relative humidity"
          })
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

