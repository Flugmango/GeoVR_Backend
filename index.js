/* Welcome to the index.js of our backend */

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

// OpenWeatherMap APP ID
var appid = '8f7256f305b8b22a4643ef43aee2ad6b';

app.listen(3000, function () {
    console.log('GeoVR Backend listening on Port 3000');
})


/* Routes */

app.get('/getData/:lat/:lon', function (req, res) {
    // Parse our values as integer
    var lat = parseFloat(req.params.lat);
    var lon = parseFloat(req.params.lon);

    // Return bad request if coordinates are no numbers
    if (isNaN(lat) || isNaN(lon)) {
        console.log('Incorrect params');
        res.sendStatus(400);
    }

    // Contact OpenWeatherMap API
    var weatherString = 'http://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + appid;
    request(weatherString, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            res.json(body);
        } else {
            console.log(error);
            res.sendStatus(500);
        }
    })

})