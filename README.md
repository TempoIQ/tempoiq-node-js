# TempoIQ HTTP NodeJS Client

## Installation

```
npm install tempoiq-node-js
```

## Quickstart

```nodejs
var tempoiq = require('tempoiq');
var client = new tempoiq.Client("key", "secret", "myco.backend.tempoiq.com");
client.createDevice(new tempoiq.Device("devicekey1"), function(err, device) {
  if (err) throw err;
  console.log("Device created: "+device.key);
});
```

## Test Suite

To run the test suite against local stubs:

```
mocha
```

If you'd like to run the test suite against an actual live backend,
edit `test/integration-credentials.json`, and run:

```
INTEGRATION=true mocha
```
