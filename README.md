# NRWOpenLidarViewer
An interactive web visualisation of NRW Lidar data (that was provided by the Open NRW initiative). Part of my Bachelors Thesis, I thought this'd be fun for everyone to see (especially people living in NRW).

## What's there to see?
Visit https://lidar.menzinger.io and type in your address to have a look at the LiDAR Data. Or take a 3D Visit to Cologne, Dortmund, Düsseldorf or Essen.  

## Backend
The backend is pretty lean, in in /Backend you can see the little script I wrote to convert single .xyz LiDAR files to more web-worthy 50x50m Chunks of .gz'iped files. Data hosted on Backblaze B2 in California - all closer options would probably bankrupt me pretty soon ;)
