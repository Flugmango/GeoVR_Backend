## Backend for [GlobeVR](https://github.com/Flugmango/GlobeVR)

#### Dependencies
- requires [nodejs](https://nodejs.org) (tested with v6.10)
- requires [canvas](https://github.com/Automattic/node-canvas), check out the installation [here](https://github.com/Automattic/node-canvas#installation)
- requires [gdal](http://www.gdal.org/), please install it on your OS properly

#### Installation
```
git clone https://github.com/Flugmango/GeoVR_Backend.git
cd GeoVR_Backend
npm install
node index.js
```
Your GeoVR Backend should now run on http://localhost:3000

#### Routes
##### /getData/:lat/:lon/:type
Returns a PNG image with information of desired point. 
Params:
- `lat`: latitude of point
- `lon`: longitude of point
- type:
  - `temperature`: information about temperature and humidity
  - `rain`: information of rainfall in last 3 hours
  - `population`: information about population graph
  - `general`: general information about contry
  
##### /overlay/:type
Returns a PNG image with different type of information in WGS84
Params:
- type:
    - `temp`: global temperature
    - `precipitation`: global precipitation
    - `wind`: global windspeed
    - `pressure`: global barometric pressure
