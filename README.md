# NRWOpenLidarViewer
An interactive web visualisation of open source NRW LiDAR data. Part of my bachelors thesis, I thought this'd be fun for everyone to see. All data is provided under the [dl-de/by-2.0](https://www.govdata.de/dl-de/by-2-0) license by [Land NRW (2019)](https://open.nrw) and can be found on the [Opengeodata.NRW](https://www.opengeodata.nrw.de/produkte/) Platform.

## What's there to see?
Visit https://nrw.menzinger.io and type in your address to have a look at the colored LiDAR data. Or take a 3D visit to Cologne, Dortmund, Düsseldorf or Essen.  

## Website
Visualized using threejs. The data is hosted on Backblaze B2 in Amsterdam - all other options would probably bankrupt me pretty soon ;)

## Backend
The backend is pretty lean, in in /Backend you can see the little script I wrote to convert single .xyz LiDAR files to more web-worthy 50x50m Chunks of .gziped files containing the xyz-points and the colors. The color is applied by mapping the x and y coordinates to the orthophoto image pixels. 
