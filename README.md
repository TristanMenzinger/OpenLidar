# NRWOpenLidarViewer
An interactive web visualisation of NRW Lidar data (that was provided by the Open NRW initiative). Part of my Bachelors Thesis, I thought this'd be fun for everyone to see. All data is provided under the [dl-de/by-2.0](https://www.govdata.de/dl-de/by-2-0) license by [Land NRW (2019)](https://open.nrw) and can be found on the [Opengeodata.NRW](https://www.opengeodata.nrw.de/produkte/geobasis/dom/dom1l/index.html) Platform


## What's there to see?
Visit https://lidar.menzinger.io and type in your address to have a look at the LiDAR Data. Or take a make a 3D visit to Cologne, Dortmund, Düsseldorf or Essen.  

## Website
Visualized using threejs. The data is hosted on Backblaze B2 in California - all closer options would probably bankrupt me pretty soon ;)

## Backend
The backend is pretty lean, in in /Backend you can see the little script I wrote to convert single .xyz LiDAR files to more web-worthy 50x50m Chunks of .gziped files containing the xyz-points and the colors. The color is applied by mapping the x and y coordinates to the image pixels. 
