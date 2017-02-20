var request = require('request');
var fs = require('fs');
var child_process = require('child_process');

var outputsFolder = `${__dirname}/../outputs`

// these are the supported formats
exports.allowedTypes = ['temp', 'pressure', 'wind', 'precipitation']

// saves image, starts image processing and sends it as a callback
exports.saveOverlay = function(type, callback) {
    // getting image from url

    request.get(getImageUrl(type)).on('response', function(response) {
        console.log([(new Date).toISOString()], `response code: ${response.statusCode}`)
    }).on('error', function(err) {
        console.log(err)
    }).pipe(fs.createWriteStream(`${outputsFolder}/${type}.png`)).on('finish', function(err) {
        // start reprojecting
        reprojectImage(`${outputsFolder}/${type}.png`, `${outputsFolder}/${type}_reproj.png`, () => {
            if (callback && typeof(callback) === "function") {
                // send image output path as callback
                callback(`${outputsFolder}/${type}_reproj.png`);
            }
        })
    })
}
// return the correct image url depending on type
function getImageUrl(type) {
  console.log([(new Date).toISOString()], `getting tile of type ${type}`)
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

// reprojects the image with GDAL
function reprojectImage(inputPath, outputPath, callback) {
  console.log([(new Date).toISOString()], `start reprojecting image...`)
    console.log([(new Date).toISOString()], `creating temporary folder`)
    // create temp directory
    fs.mkdir(`${outputsFolder}/temp`, (err) => {
      if (err)
      console.log(err)
    })

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
        `${outputsFolder}/temp/temp.tif`
    ], {shell: true})
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
            `${outputsFolder}/temp/temp.tif`,
            `${outputsFolder}/temp/output.tif`
        ], {shell: true})
        reprojection.stderr.on('error', (msg) => {
            console.log(String(buf));
        })
        reprojection.on('exit', (code, signal) => {
            // after successful reprojection, translate back to png
            var backToPNG = child_process.spawn('gdal_translate', [
                '-of', 'PNG', `${outputsFolder}/temp/output.tif`, outputPath
            ], {shell: true})
            backToPNG.stderr.on('error', (msg) => {
                console.log(String(buf));
            })
            backToPNG.on('exit', (code, signal) => {
              console.log([(new Date).toISOString()], `... finished reprojecting`)
              console.log([(new Date).toISOString()], `deleting temporary folder`)
                // delete temp directory here
                deleteFolderRecursive(`${outputsFolder}/temp`)
                if (callback && typeof(callback) === "function") {
                    // execute callback function
                    callback();
                }
            })

        })
    })
}

// delete folder function, taken from http://stackoverflow.com/a/32197381/5660646
var deleteFolderRecursive = function(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, index) {
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
