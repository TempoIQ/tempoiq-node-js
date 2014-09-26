'use strict';

var assert = require("assert");
var tempoiq = require("../lib/tempoiq");

var StubbedSession = require("../lib/session/stubbed_session");

var _getClient = function() {
  if (process.env.INTEGRATION) {
    var creds = require('./integration-credentials.json')
    return tempoiq.Client(creds.key, creds.secret, creds.host, {port: creds.port, secure: creds.secure});
  } else {
    return tempoiq.Client("stubbed_key", "stubbed_secret", "stubbed_host", {secure: false, session: new StubbedSession})
  }
}

describe("Client", function() {
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
  })

  describe("Device provisioning", function() {
    it("creates a device", function(done) {
      var client = _getClient();
      var stubbed_body = {
	key: "stubbed_key",
	name: "stubbed_name",
	attributes: {attr1: "value1"},
	sensors: []
      };
      client._session.stub("POST", "/v2/devices", 200, JSON.stringify(stubbed_body), {});
      client.createDevice(new tempoiq.Device("stubbed_key", {
	name: "stubbed_name",
	attributes: {attr1: "value1"},
	sensors: []
      }), function(err, device) {
	if (err) throw err;
	assert.equal("stubbed_key", device.key);
	assert.equal("stubbed_name", device.name);
	assert.equal("value1", device.attributes["attr1"]);
	assert.equal(0, device.sensors.length);
	done();
      });
    });
  });
});
