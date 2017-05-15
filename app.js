var request = require('superagent');
var Converter = require("csvtojson").Converter;
var API_URL = 'http://151.253.68.152:8888/api';
var AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRheGlvd25lckBzZWN1cmVwYXRoLmNvbSIsImFkZHJlc3MiOm51bGwsImNvbXBhbnkiOiJEdWJhaSBUYXhpIiwiY29udGFjdF9ubyI6bnVsbCwiZ2VuZGVyIjoibWFsZSIsImxhc3RfbW9kaWZpZWQiOiIyMDE2LTEyLTIwVDExOjExOjM5LjY3OFoiLCJuYW1lIjoiVGF4aSBPd25lciIsIm9yZ2lkIjpbImJkMTdkMjUzLWM2YTQtMTFlNi04YjhmLWFmYTI1NGMzOGYxYiJdLCJzdGF0dXMiOlsiYWN0aXZlIl0sInVzZXJfdHlwZSI6bnVsbCwidXNlcmlkIjoiMTQ3OTBkYzQtYzZhNS0xMWU2LWI2MTgtNzBhMjBhYmE2ZDA3IiwiaWF0IjoxNDgyMjMyMzczLCJleHAiOjE0ODQ4MjQzNzN9.yHeAH6ztKzM8xrKCxvnlgx_nO8YyhyEFYCwn1Li7dY4';
var orgid = 'bd17d253-c6a4-11e6-8b8f-afa254c38f1b';
var userids = ['14790dc4-c6a5-11e6-b618-70a20aba6d07'];
// var URL = 'http://192.168.2.92:8888/api/organization/65f00880-6a01-11e6-b74f-159857a8b464/tracker'; // Insert organization ID here

var _createVehicle = function (vehicle) {
  console.log('Creating vehicle', vehicle.licensePlate.plateNumber);
  return request
    .post(API_URL + '/organization/' + orgid + '/foa')
    .set('Content-Type', 'application/json')
    .auth(AUTH_TOKEN, 'junk')
    .send(vehicle);
};

var _createTracker = function (tracker) {
  console.log('Creating tracker', tracker.imei);
  return request
    .post(API_URL + '/organization/' + orgid + '/tracker')
    .set('Content-Type', 'application/json')
    .auth(AUTH_TOKEN, 'junk')
    .send(tracker);
};

var _associateVehicleTracker = function (vehicleid, trackerid) {
  console.log('Associating tracker-vehicle', vehicleid + ' - ' + trackerid);
  return request
    .post(API_URL + '/organization/' + orgid + '/trackers/' + trackerid + '/foa/' + vehicleid + '?foa_type=taxi')
    .set('Content-Type', 'application/json')
    .auth(AUTH_TOKEN, 'junk');
};

var converter = new Converter({});

converter.fromFile("./data/dubai.csv", function(err, result) {
  console.log('Reading file start');
  var successCount = 0;
  var i = 0;

  var _nextVehicle = function() {
    console.log('\n');
    addVehicle(result[++i]);
    // process.exit();
  };

  var addVehicle = function(row) {
    console.log('Start adding');
    if (!row) {
      console.log('Total count', result.length);
      console.log('Success count', successCount);
      return;
    }

    var vehicle = {
      foa_type: 'taxi',
      licensePlate: {
        country: 'AE',
        plateCategory: 'public',
        plateCode: '',
        plateNumber: '' + row.plate_number,
        state: 'AE-DU',
        registrationExpiry: row.registration_expiry,
      },
      vehicleColor: row.color,
      vehicleMake: row.vehicle_make,
      vehicleModel: '' + row.vehicle_model,
      chasisNumber: row.chasis_number,
      organization: {
        orgName: row.organization,
      },
    };

    var tracker = {
      trackerModel: 'dubai_taxi',
      imei: '' + row.imei,
      userid: userids,
      protocol: 'tcp',
      field_of_app: vehicle,
    };

    // Create a vehicle
    _createVehicle(vehicle)
      .then(function(response) {
        console.log('Vehicle Status Code', response.statusCode);

        if (response.statusCode === 201) {
          var regex = /.*foa\/(.*)\?.*/;
          var result = regex.exec(response.header.location);
          var vehicleid = result[1];
          console.log('Vehicle Status Response', vehicleid);

          // Create tracker
          _createTracker(tracker)
            .then(function(response) {
              console.log('Tracker Status Code', response.statusCode);

              if (response.statusCode === 201) {
                var regex = /.*trackers\/(.*)/;
                var result = regex.exec(response.header.location);
                var trackerid = result[1];
                console.log('Tracker Status Response', trackerid);

                // Associate Tracker - Vehicle
                _associateVehicleTracker(vehicleid, trackerid)
                  .then(function(response) {
                    console.log('Associate Status Code', response.statusCode);
                    successCount++;
                    _nextVehicle();
                  }, function(error) {
                    console.log('Associate Error', error);
                    console.log('Associate Status Code', error.statusCode);
                    _nextVehicle();
                  });
              } else {
                _nextVehicle();
              }
            }, function(error) {
              console.log('Tracker Create Error', error);
              console.log('Tracker Status Code', error.statusCode);
              _nextVehicle();
            });
        } else {
          _nextVehicle();
        }
    }, function(error) {
      console.log('Vehicle Create Error', error);
      console.log('Vehicle Status Code Error', error.statusCode);
      _nextVehicle();
    });
  };

  _nextVehicle();
});
