/* Welcome to the index.js of our backend */

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var countriesJSON = require('./js/countries.json');
var overlayBuilder = require('./controllers/overlay.js')
var http = require('http');

var app = express();

// OpenWeatherMap APP ID
var appid = '8f7256f305b8b22a4643ef43aee2ad6b';
//mapquest KEY
var key = 'TOY3OKYNFu7Q3arLKLlbsdMB2X0wbjri';
//plotly auth
var plotlyId = 'K0Pqs6lRkCxHjyWXtT2s';
var username = 'Flugmango';
var plotly = require('plotly')(username, plotlyId);


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
	function checkForValue(json, value) {
		for (key in json) {
			if (typeof (json[key]) === "object") {
				return checkForValue(json[key], value);
			} else if (json[key] === value) {
				return true;
			}
		}
		return false;
	}

	var code = 'http://open.mapquestapi.com/nominatim/v1/reverse.php?key=' + key + '&format=json&lat=' + lat + '&lon=' + lon;
	request(code, function (error, response, body) {
		if (!error && response.statusCode == 200 && JSON.stringify(body).indexOf('place_id') > -1) {
			//country code
			var countryCode = JSON.parse(body).address.country_code;
			/*console.log(countryCode);*/
			//full country name
			var countryName = find_in_object(countriesJSON, { code: countryCode.toUpperCase() });
			countryName = countryName[0].name;
			console.log(countryName);

			var pictureName = countryCode.toUpperCase() + '.png';
			//var pictureName = countryCode + '.gif'
			//var flagString = 'http://www.geonames.org/flags/x/' + pictureName.toLowerCase();
			var flagString = 'http://geognos.com/api/en/countries/flag/' + pictureName;
			/*console.log(flagString)*/
			request(flagString, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					fs.readFile(pictureName, function (err, pic) {
						if (err)
							throw err; // Fail if the file can't be read.
						else {
							var weatherString = 'http://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + appid;
							request(weatherString, function (error, response, body) {
								if (!error && response.statusCode == 200) {
									var data = JSON.parse(body);
									var weatherStation = data.name;
									var weatherIcon = data.weather[0].icon;
									var iconName = weatherIcon + '.png';
									var weatherIconString = 'http://openweathermap.org/img/w/' + weatherIcon + '.png';
									request(weatherIconString, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											fs.readFile(iconName, function (err, icon) {
												if (err)
													throw err; // Fail if the file can't be read.
												else {
													//data queries depending on type specified in URI
													switch (type) {
														case "temperature":
															// Contact OpenWeatherMap API
															var temp = data.main.temp;
															var tempString = (parseFloat(temp) - 273.15).toFixed(2) + " °C";
															var humi = data.main.humidity;
															var humiString = (parseFloat(humi)) + " %";
															var pressure = data.main.pressure;
															var pressureString = (parseFloat(pressure)) + " hPa";

															function drawTemp() {
																var Canvas = require('canvas')
																	, Image = Canvas.Image
																	, canvas = new Canvas(960, 540)
																	, ctx = canvas.getContext('2d');
																ctx.globalAlpha = 1;
																ctx.fillStyle = '#f2f2f2';
																ctx.fillRect(0, 0, canvas.width, canvas.height);
																ctx.fillStyle = 'black';
																var img = new Image();
																img.src = new Buffer(pic, 'base64');
																ctx.drawImage(img, 120, 60, img.width, img.height);
																if (ctx.measureText(countryName).width > 75) {
																	ctx.font = 6000 / (ctx.measureText(countryName).width) + 'px Helvetica';
																	ctx.fillText(countryName, 340, 135);
																} else {
																	ctx.font = '80px Helvetica';
																	ctx.fillText(countryName, 340, 135);
																}
																ctx.font = '50px Helvetica';
																ctx.fillText('Current temperature: ' + tempString, 90, 220);
																ctx.fillText('Current humidity: ' + humiString, 90, 290);
																ctx.fillText('Current pressure: ' + pressureString, 90, 360);
																ctx.font = '35px Helvetica';
																ctx.fillText('Weatherstation in ' + weatherStation, 90, 450);

																return canvas;
															}
															;
															res.setHeader('Content-Type', 'image/png');
															drawTemp().pngStream().pipe(res);
															//res.json(tempString); // Show json in the browser.
															/*res.end(pic); // Show the picture in the browser.*/
															//canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, 'text1.png')));

															break;
														case "rain":
															var rain = 0;
															if (data.hasOwnProperty('rain')) {
																rain = data.rain["3h"];
															}
															;
															var rainString = (parseFloat(rain)) + " mm";
															var wind = data.wind.speed;
															var windString = (parseFloat(wind)) + " mps";

															function drawRain() {
																var Canvas = require('canvas')
																	, Image = Canvas.Image
																	, canvas = new Canvas(960, 540)
																	, ctx = canvas.getContext('2d');
																ctx.globalAlpha = 1;
																ctx.fillStyle = '#f2f2f2';
																ctx.fillRect(0, 0, canvas.width, canvas.height);
																ctx.fillStyle = 'black';
																var img = new Image();
																img.src = new Buffer(pic, 'base64');
																ctx.drawImage(img, 120, 60, img.width, img.height);
																if (ctx.measureText(countryName).width > 75) {
																	ctx.font = 6000 / (ctx.measureText(countryName).width) + 'px Helvetica';
																	ctx.fillText(countryName, 340, 135);
																} else {
																	ctx.font = '80px Helvetica';
																	ctx.fillText(countryName, 340, 135);
																}
																ctx.font = '50px Helvetica';
																ctx.fillText('Rain in past 3 hours: ' + rainString, 90, 240);
																ctx.fillText('Current windspeed: ' + windString, 90, 330);
																var imgIcon = new Image();
																imgIcon.src = new Buffer(icon, 'base64');
																ctx.drawImage(imgIcon, 800, 170, imgIcon.width * 2.2, imgIcon.height * 2.2);
																ctx.font = '35px Helvetica';
																ctx.fillText('Weatherstation in ' + weatherStation, 90, 450);

																return canvas;
															}
															;
															res.setHeader('Content-Type', 'image/png');
															drawRain().pngStream().pipe(res);
															break;
														case "population":
															var dates = [];
															for (i = -3; i < 4; i++) {
																dates.push(moment().add(i, 'years').format('YYYY-MM-DD'));
															}
															var queries = [];
															for (i = 0; i < 7; i++) {
																queries.push('http://api.population.io:80/1.0/population/' + countryName + '/' + dates[i] + '/');
															}
															var pops = [];
															// call population number synchronous
															function synchAPICalls(queries) {
																var url = queries.shift();
																http.get(url, function (res) {
																	res.on('data', function (d) {
																		console.log('data')
																		var data = JSON.parse(d);
																		pops.push(data.total_population.population);
																	});
																	res.on('end', function () {
																		console.log('end')
																		if (queries.length) {
																			synchAPICalls(queries);
																		} else { // when all queries have been called')
																			var data = { x: [], y: [], type: 'scatter' };
																			for (i in dates) {
																				data.x.push(moment(dates[i], "YYYY-MM-DD HH:MM:SS"));
																				data.y.push(pops[i]);
																			}
																			var figure = { 'data': [data] };
																			var imgOpts = {
																				format: 'png',
																				width: 768,
																				height: 432
																			};
																			plotly.getImage(figure, imgOpts, function (err, imageStream) {
																				if (err)
																					return console.log(err);
																				var fileStream = fs.createWriteStream('graph.png');
																				imageStream.pipe(fileStream).on('finish', function () {
																					var graph = fs.readFile('graph.png', function (err, graph) {
																						if (!err) {
																							console.log("population graph added");
																							/*res.writeHead(200, { 'Content-Type': 'image/png' });
																							res.write(graph);
																							res.end();*/
																						}
																					});
																				});
																			});
																		}
																	})

																})
															}
															synchAPICalls(queries);

															break;
														case "general":
															var generalString = "https://restcountries.eu/rest/v1/name/" + countryName;
															request(generalString, function (error, response, body) {
																if (!error && response.statusCode == 200) {
																	var data = JSON.parse(body);
																	var cap = data[0].capital;
																	var region = data[0].region;
																	var currencies = [];
																	var currencyString = "";
																	for (i in data[0].currencies) {
																		currencies.push(data[0].currencies[i])
																		currencyString = currencyString.concat([data[0].currencies[i] + " "]);
																	}
																	var languages = [];
																	var languageString = "";
																	for (i in data[0].languages) {
																		currencies.push(data[0].languages[i]);
																		languageString = languageString.concat([data[0].languages[i] + " "]);
																	}
																	function draw() {
																		var Canvas = require('canvas')
																			, Image = Canvas.Image
																			, canvas = new Canvas(960, 540)
																			, ctx = canvas.getContext('2d');
																		ctx.globalAlpha = 1;
																		ctx.fillStyle = '#f2f2f2';
																		ctx.fillRect(0, 0, canvas.width, canvas.height);
																		ctx.fillStyle = 'black';
																		var img = new Image();
																		img.src = new Buffer(pic, 'base64');
																		ctx.drawImage(img, 120, 60, img.width, img.height);
																		if (ctx.measureText(countryName).width > 75) {
																			ctx.font = 6000 / (ctx.measureText(countryName).width) + 'px Helvetica';
																			ctx.fillText(countryName, 340, 135);
																		} else {
																			ctx.font = '80px Helvetica';
																			ctx.fillText(countryName, 340, 135);
																		}
																		ctx.font = '50px Helvetica';
																		ctx.fillText('Capital city: ' + cap, 90, 220);
																		ctx.fillText('Languages: ' + languageString, 90, 290);
																		ctx.fillText('Currencies: ' + currencyString, 90, 360);
																		ctx.font = '35px Helvetica';
																		ctx.fillText('Region: ' + region, 90, 450);

																		return canvas;
																	}
																	;
																	res.setHeader('Content-Type', 'image/png');
																	draw().pngStream().pipe(res);

																}
																else {
																	console.log(error);
																	res.sendStatus(500);
																}
															});
															break;

													};

												}
											});

										} else {
											console.log(error);
											res.sendStatus(500);
										}
									}).pipe(fs.createWriteStream(iconName));
									console.log(iconName + " has been created in the project folder!")

								} else {
									console.log(error);
									res.sendStatus(500);
								}
							});

						}
					});
				} else {
					console.log(error);
					res.sendStatus(500);
				}
			}).pipe(fs.createWriteStream(pictureName));
			console.log(pictureName + " has been created in the project folder!");
		}

		else {
			fs.readFile('images/error.png', function (err, data) {
				if (err) throw err;
				res.end(data);
			})
		};
	}
	);

	// help function for filtering json
	function find_in_object(my_object, my_criteria) {

		return my_object.filter(function (obj) {
			return Object.keys(my_criteria).every(function (c) {
				return obj[c] == my_criteria[c];
			});
		});

	};
});

app.get('/overlay/:type', function (req, res) {
	var type = req.params.type;

	// only search image when type is supported
	if (overlayBuilder.allowedTypes.includes(type))
		overlayBuilder.saveOverlay(type, (outputPath) => {
			var img = fs.readFileSync(outputPath);
			res.writeHead(200, { 'Content-Type': 'image/png' });
			res.end(img, 'binary');
		})

	else
		res.status(500).send('Type not allowed');
}
);
