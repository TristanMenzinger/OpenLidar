mkdir -p js
mkdir -p css

echo "Minifying Javascript"
uglifyjs source/js/OrbitControls.js > js/OrbitControls.js
uglifyjs source/js/pako.js > js/pako.js
uglifyjs source/js/proj4.js > js/proj4.js
uglifyjs source/js/three.js > js/three.js
uglifyjs source/js/WebGL.js > js/WebGL.js

echo "Creating language files"
./source/languages/language_fill.sh source/html/index.html de/index.html source/languages/de.lang
./source/languages/language_fill.sh source/html/index.html en/index.html source/languages/en.lang

./source/languages/language_fill.sh source/html/email.html de/email.html source/languages/de.lang
./source/languages/language_fill.sh source/html/email.html en/email.html source/languages/en.lang

echo "Minifying css"
uglifycss source/css/maps_override.css > css/maps_override.css
uglifycss source/css/main.css > css/main.css

echo "Done"

