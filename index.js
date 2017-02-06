/* Welcome to the index.js of our backend */

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var child_process = require('child_process');
var countriesJSON = require('./js/countries.json');

var app = express();

// OpenWeatherMap APP ID
var appid = '8f7256f305b8b22a4643ef43aee2ad6b';
//mapquest KEY
var key = 'TOY3OKYNFu7Q3arLKLlbsdMB2X0wbjri';
//plotly auth
var plotlyId = 'K0Pqs6lRkCxHjyWXtT2s';
var username = 'Flugmango';
var plotly = require('plotly')(username, plotlyId);

// these are the supported formats
var allowedTypes = ['temp', 'pressure', 'wind', 'precipitation']

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
												ctx.globalAlpha = 1;
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
									var dates = [];
									for (i = -3; i < 4; i++) {
										dates.push(moment().add(i, 'years').format('YYYY-MM-DD'));
									}
									var queries = [];
									for (i = 0; i < 7; i++) {
										queries.push('http://api.population.io:80/1.0/population/' + countryName + '/' + dates[i] + '/');
									}
									var pops = [];
									completedRequests = 0;
									for (i in dates) {
										request(queries[i], function (error, response, body) {
											if (!error && response.statusCode == 200) {
												var data = JSON.parse(body);
												pops.push(data.total_population.population);
												completedRequests++;
												if (completedRequests == queries.length) {
													//plotly graph creation
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
														if (err) return console.log(err);
														var fileStream = fs.createWriteStream('graph.png');
														imageStream.pipe(fileStream).on('finish', function () {
															var graph = fs.readFile('graph.png', function (err, graph) {
																if (!err) {
																	res.writeHead(200, { 'Content-Type': 'image/png' });
																	res.write(graph);
																	res.end();
																}
															});
														});
													});
												}

											} else {
												console.log(error);
												res.sendStatus(500);
											}
										});
									}

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
												var img = new Image();
												img.src = new Buffer(pic, 'base64');
												ctx.drawImage(img, 120, 60, img.width, img.height);
												ctx.font = '90px Impact';
												ctx.fillText(countryName, 390, 135);
												ctx.font = '54px Impact';
												ctx.fillText('Capital city: ' + cap, 90, 240);
												ctx.fillText('Languages: ' + languageString, 90, 330);
												ctx.fillText('Currencies: ' + currencyString, 90, 420);
												ctx.font = '39px Impact';
												ctx.fillText('Region: ' + region, 90, 510);

												return canvas;
											};
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
			}).pipe(fs.createWriteStream(pictureName));
			console.log(pictureName + " has been created in the project folder!");
		}

		else {
			res.sendStatus(500);

			//try of displaying a nice error message when coordinates not in country
/*			var Canvas = require('canvas');
			var canvas = new Canvas(200, 150);
			var context = canvas.getContext("2d");
			context.beginPath();
			context.arc(100, 75, 50, 0, 2 * Math.PI);
			context.stroke();

			function sendAsPNG(response, canvas) {
				var stream = canvas.createPNGStream();
				response.type("png");
				stream.pipe(response);

			};*/
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
	if (allowedTypes.includes(type))
		saveImage(type, (outputPath) => {
			var img = fs.readFileSync(outputPath);
			res.writeHead(200, { 'Content-Type': 'image/png' });
			res.end(img, 'binary');
		})

	else
		res.status(500).send('Type not allowed');
}
);

// return the correct image url depending on type
function getImageUrl(type) {
	//return `http://a.tile.openweathermap.org/map/${type}/0/0/0.png`
	switch (type) {
		case 'wind':
			return 'http://a.maps.owm.io:8099/5735d67f5836286b0076267b/0/0/0?hash=e529bed414220dfa2559b17e3f5ca831'
			break;
		case 'precipitation':
			return 'http://d.maps.owm.io:8099/57456d1237fb4e01009cbb17/0/0/0?hash=042a4b4c8ec6bc8392aabf46fa91003c'
			break;
		case 'pressure':
			return 'http://a.maps.owm.io:8099/5837ee50f77ebe01008ef68d/0/0/0?hash=21d287b716923b9702c510cc84f0487a'
			break;
		case 'temp':
			return 'http://d.maps.owm.io:8099/5735d67f5836286b007625cd/0/0/0?hash=e25f0f2ec89ce18affb3678f26fe7bd1'
			break;
	}
}

// saves image, starts image processing and sends it as a callback
function saveImage(type, callback) {
	// getting image from url

	request
		.get(getImageUrl(type))
		.on('response', function (response) {
			console.log(response.statusCode) // 200
		})
		.on('error', function (err) {
			console.log(err)
		})
		.pipe(fs.createWriteStream(`${__dirname}/${type}.png`))
		.on('finish', function (err) {
			// start reprojecting
			reprojectImage(`${__dirname}/${type}.png`, `${__dirname}/${type}_reproj.png`, () => {
				if (callback && typeof (callback) === "function") {
					// send image output path as callback
					callback(`${__dirname}/${type}_reproj.png`);
				}
			})
		})
}

// reprojects the image with GDAL
function reprojectImage(inputPath, outputPath, callback) {
	// create temp directory
	fs.mkdir(`${__dirname}/temp`)

	// sorry, now comes the quick and dirty way...

	// start translation from png to tiff
	var pngToTiffTranslate = child_process.spawn('gdal_translate', [
		'-of',
		'Gtiff',
		'-co',
		'"tfw=yes"',
		'-a_ullr',
		'-20037508.3427892',
		'20036051.9193368',
		'20037508.3427892',
		'-20036051.9193368',
		'-a_srs',
		'"EPSG:3857"',
		inputPath,
		`${__dirname}/temp/temp.tif`
	], { shell: true })
	pngToTiffTranslate.stderr.on('error', (buf) => {
		console.log(String(buf));
	})
	pngToTiffTranslate.on('exit', (code, signal) => {
		// after successful translation, start transformation to 4326
		var reprojection = child_process.spawn('gdalwarp', [
			'-s_srs',
			'EPSG:3857',
			'-t_srs',
			'EPSG:4326',
			'-ts',
			'256',
			'128',
			`${__dirname}/temp/temp.tif`,
			`${__dirname}/temp/output.tif`
		], { shell: true })
		reprojection.stderr.on('error', (msg) => {
			console.log(String(buf));
		})
		reprojection.on('exit', (code, signal) => {
			// after successful reprojection, translate back to png
			var backToPNG = child_process.spawn('gdal_translate', [
				'-of', 'PNG', `${__dirname}/temp/output.tif`, outputPath
			], { shell: true })
			backToPNG.stderr.on('error', (msg) => {
				console.log(String(buf));
			})
			backToPNG.on('exit', (code, signal) => {
				// delete temp directory here
				deleteFolderRecursive(`${__dirname}/temp`)
				if (callback && typeof (callback) === "function") {
					// execute callback function
					callback();
				}
			})

		})
	})
}

// delete folder function, taken from http://stackoverflow.com/a/32197381/5660646
var deleteFolderRecursive = function (path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file, index) {
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};
