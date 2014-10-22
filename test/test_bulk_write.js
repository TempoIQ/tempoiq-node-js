'use strict';

var assert = require("assert");
var tempoiq = require("../lib/tempoiq");

describe("BulkWrite", function() {
  it("adds the points to the write and retrieves them from json", function() {
    var write = new tempoiq.BulkWrite();
    var deviceKey = "device1";
    var sensorKey = "sensor1";
    var ts = new Date(2012, 1, 2);
    write.push(deviceKey, sensorKey, new tempoiq.DataPoint(ts, 1.23));

    var expected = {
      device1: {
        sensor1: [
          {t: ts.toISOString(), v: 1.23}
        ]
      }
    };

    assert.equal(JSON.stringify(expected), JSON.stringify(write.toJSON()));
  });
});
