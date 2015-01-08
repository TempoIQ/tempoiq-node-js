// snippet-begin create-client

    var tempoiq = require('tempoiq');
    var client = tempoiq.Client(<TEMPO_KEY>,
                                <TEMPO_SECRET>,
                                <TEMPO_HOST>);
// snippet-end
//
// snippet-begin create-device

    client.createDevice(new tempoiq.Device("device", {
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
      }),
      function(err, device) {
        if (err) throw err;
        callback(device);
      }
    );
// snippet-end
// snippet-begin single-point

    var ts = new Date("2014-09-15T02:00:00Z");
    var selection = {
      devices: { key: "device1" },
      sensors: { key: "temperature" }
    };

    client.single(selection, "before", ts, null, function(err, data) {
      if (err) {
        console.log("ERROR: "+ JSON.stringify(err));
      } else {
        if (data.length == 0) {
          console.log("No point found!");
        } else {
          var row = data[0];
          var point_time = row.t;
          var point_value = row.data['device1']['temperature']
          console.log("Found point: t="+point_time+" v="+point_value);
        }
      }
    });
// snippet-end
