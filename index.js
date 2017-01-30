/* Welcome to the index.js of our backend */

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var countriesJSON = require('./js/countries.json');

var app = express();

// OpenWeatherMap APP ID
var appid = '8f7256f305b8b22a4643ef43aee2ad6b';
//mapquest KEY
var key = 'TOY3OKYNFu7Q3arLKLlbsdMB2X0wbjri';

app.listen(3000, function () {
	console.log('GeoVR Backend listening on Port 3000');
})


/* Routes */

app.get('/getData/:lat/:lon/:type', function (req, res) {
	// Parse our values as integer
	var lat = parseFloat(req.params.lat);
	var lon = parseFloat(req.params.lon);
	var type = req.params.type;

	// Return bad request if coordinates are no numbers
	if (isNaN(lat) || isNaN(lon)) {
		console.log('Incorrect params');
		res.sendStatus(400);
	}
	var code = 'http://open.mapquestapi.com/nominatim/v1/reverse.php?key=' + key + '&format=json&lat=' + lat + '&lon=' + lon;
	request(code, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			//country code
			var countryCode = JSON.parse(body).address.country_code;
			console.log(countryCode);
			//full country name
			var countryName = find_in_object(countriesJSON, {code: countryCode.toUpperCase()});
			countryName = countryName[0].name;
			console.log(countryName);

			var pictureName = countryCode.toUpperCase() + '.png';
			//var pictureName = countryCode + '.gif'
			//var flagString = 'http://www.geonames.org/flags/x/' + pictureName.toLowerCase();
			var flagString = 'http://geognos.com/api/en/countries/flag/' + pictureName;
			console.log(flagString)
			request(flagString, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					fs.readFile(pictureName.toLowerCase(), function (err, pic) {
                        if (err) throw err; // Fail if the file can't be read.
						else {
							//data queries depending on type specified in URI
							switch (type) {
								case "temperature":
									// Contact OpenWeatherMap API
									var weatherString = 'http://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + appid;
									request(weatherString, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											var data = JSON.parse(body);
											var temp = data.main.temp;
											var tempString = (parseFloat(temp) - 273.15).toFixed(2) + " °C";
											var humi = data.main.humidity;
											var humiString = (parseFloat(humi)) + " %";
											var weatherStation = data.name;

											function draw() {
												//var path = require('path');
												//var http = require('http');
												var Canvas = require('canvas')
														, Image = Canvas.Image
														, canvas = new Canvas(960, 540)
														, ctx = canvas.getContext('2d');

												var img = new Image();
												img.src = new Buffer(pic, 'base64');
												ctx.drawImage(img, 120, 60, img.width, img.height);
												ctx.font = '90px Impact';
												ctx.fillText(countryName, 390, 135);
												ctx.font = '54px Impact';
												ctx.fillText('Current temperature: ' + tempString, 90, 240);
												ctx.fillText('Current humidity: ' + humiString, 90, 330);
												ctx.font = '39px Impact';
												ctx.fillText('Weatherstation in ' + weatherStation, 90, 450);

												return canvas;
											};
											res.setHeader('Content-Type', 'image/png');
											draw().pngStream().pipe(res);
											//res.json(tempString); // Show json in the browser.
											/*res.end(pic); // Show the picture in the browser.*/
											//canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text1.png')));
										} else {
											console.log(error);
											res.sendStatus(500);
										}
									});
									break;
								case "population":
									var currentDate = moment().format('YYYY-MM-DD');
									var popString = 'http://api.population.io:80/1.0/population/' + countryName + '/' + currentDate + '/';
									request(popString, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											var data = JSON.parse(body);
											//total current country population
											res.json(data.total_population.population);
										} else {
											console.log(error);
											res.sendStatus(500);
										}
									});
									break;
                            };
							/*                                  res.writeHead(200, { 'Content-Type': 'image/gif' });*/
							/*console.log(temperature);*/
							/*res.end(data);*/ // Send the file data to the browser.
						}
					});
				} else {
					console.log(error);
					res.sendStatus(500);
				}
			}).pipe(fs.createWriteStream(pictureName));
			console.log(pictureName + " has been created in the project folder!");
		}
	});

	// help function for filtering json
	function find_in_object(my_object, my_criteria) {

		return my_object.filter(function (obj) {
			return Object.keys(my_criteria).every(function (c) {
				return obj[c] == my_criteria[c];
			});
		});

	};
});