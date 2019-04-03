let result;
let scene;
let camera;
let controls;
let renderer;

//set on the first load 
let global_offset_x = null;
let global_offset_y = null;
let global_offset_z = null;

// let zlib = require('browserify-zlib');

let already_rendered = [];


function ll2WGS(lat, lng){
	wgs_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").forward([lng, lat]) //careful with lat lng order (!) they flipped it 
	return wgs_coords;
}

function WGS2ll(wgs_x, wgs_y){
	latlng_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").convert([wgs_x, wgs_y]) //careful with order, here its x and then y
	return latlng_coords
}

function showWrongCountyNote() {
	document.getElementById("invalid_location").classList.remove("hide_by_height");
}

function hideWrongCountyNote() {
	document.getElementById("invalid_location").classList.add("hide_by_height");
}

function initAutocomplete() {

	let input = document.getElementById('autocomplete_input');
	let autocomplete = new google.maps.places.Autocomplete(input);
	autocomplete.setFields(['address_components', 'geometry','name']);
	autocomplete.setTypes(['geocode'])

	let infowindow = new google.maps.InfoWindow();
	let infowindowContent = document.getElementById('infowindow-content');
	infowindow.setContent(infowindowContent);
	let place = autocomplete.getPlace();

	autocomplete.addListener('place_changed', function() {
		let place = autocomplete.getPlace();
		console.log(place);

		let is_in_nrw = place.address_components.filter(comp => {
			return comp.short_name === "NRW";
		}).length !== 0;

		if(!is_in_nrw) {
			showWrongCountyNote();
		}else {
			hideWrongCountyNote();

			wgs_coords = ll2WGS(place.geometry.location.lat(), place.geometry.location.lng());
			zoomToNewPlace(wgs_coords)
		}
	});
}

function euclidianDistance(wgs_coords_a, wgs_coords_b) {
	var a = wgs_coords_a[0] - wgs_coords_b[0];
	var b = wgs_coords_a[1] - wgs_coords_b[1];
	return Math.sqrt( a*a + b*b );
}

function moveCamera(x, y) {
	camera.position.set(x, camera.position.y, y);
	controls.target.set(x, controls.target.y, y);
	controls.update();
}

function cameraToNormalPos() {

}


/*

FOR SOME ABSURD REASON ITS ALL FUCKING FLIPPED?! 
HOW CAN THIS BE?!?!
*/

function zoomToNewPlace(wgs_coords) {	
	wgs_x = roundDown50(wgs_coords[0]);
	wgs_y = roundDown50(wgs_coords[1]);

	let distance = euclidianDistance(wgs_coords, [global_offset_x, global_offset_y])
	console.log("distance to new spot is:", distance)

	if(distance > 400) {
		//clean all before loaded ones from scene at least
		if(global_offset_x != null) {
			moveCamera(wgs_x-global_offset_x, wgs_y-global_offset_y)
		}else {
			moveCamera(25, 25)	
		}
	}else {
		moveCamera(25, 25)
	}
	getpoints(wgs_x, wgs_y)

	


	console.log(wgs_coords);
}


function initTransferControlsListener() {
	autocomplete_input = document.getElementById("autocomplete_input");
	autocomplete_input.addEventListener("mouseover", function() {
		controls.enabled = false;
	});

	document.querySelector("canvas").addEventListener("mouseover", function() {
		controls.enabled = true;
		autocomplete_input.blur();
	});

	autocomplete_input.addEventListener('keypress', function (e) {
		let key = e.which || e.keyCode;
		if (key === 13) { // 13 is enter
			controls.enabled = true;
			autocomplete_input.blur();
		}
	});
	/*
	autocomplete_input.addEventListener("mouseout", function() {
		console.log("hovering out");
		controls.enabled = true;
	});
	*/
}

async function start() {
	initTransferControlsListener();

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

	let canvas = document.querySelector("canvas");
	renderer = new THREE.WebGLRenderer({canvas: canvas});
	renderer.setSize(window.innerWidth, window.innerHeight);
	//renderer.setClearColor(0xffffff);
	renderer.setClearColor(0x000000);

	//document.getElementById("threejs_container").appendChild(renderer.domElement);

	// = new THREE.Orbit( camera );
	console.log(renderer.domElement)
	//controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls = new THREE.OrbitControls( camera );
	console.log(controls)
	//.update() must be called after any manual changes to the camera's transform

	// init_x = 304000;
	// init_y = 5645200;
	// to = 2;
	// for(let x = 0; x < to; x++) {
	// 	for(let y = 0; y < to; y++) {
	// 		xx = init_x + 50 * x;
	// 		yy = init_y + 50 * y;
	// 		xyz = await loadPoints(xx, yy);
	// 		colors = await loadColor(xx, yy);
	// 		addPointsToScene(scene, colors, xyz, xx, yy, 100)
	// 	}
	// }

	camera.position.set(25,25 , -32.44520525782314);
	controls.target.set(25,25, -32.445261301389486);
	controls.update();

	let axesHelper = new THREE.AxesHelper(5);
	scene.add(axesHelper);
	console.log(axesHelper)

	console.log("vertices done")

	camera.position.z = 5;

	let animate = function () {
		requestAnimationFrame(animate);

		// cube.rotation.x += 0.01;
		// cube.rotation.y += 0.01;

		renderer.render(scene, camera);
		//console.log(.target)

		x_focus_center = roundDown50(controls.target.x)
		y_focus_center = roundDown50(controls.target.z)

		delta = [-150, -100, -50, 0, 50, 100, 150]

		for(let i in delta) {
			for(let j in delta) {

				x_focus = x_focus_center + delta[i]
				y_focus = y_focus_center + delta[j]

				let found = already_rendered.find(chunk => {
					return (chunk.x) === (x_focus + global_offset_x) && (chunk.y) === (y_focus + global_offset_y)
				})
				if(found == undefined) {
					xx = x_focus + global_offset_x;
					yy = y_focus + global_offset_y;
					let obj = {};
					obj.x = xx;
					obj.y = yy;
					already_rendered.push(obj)
					console.log("added new:", x_focus, y_focus)
					getTile(xx, yy);
				}
			}
		}
	};

	animate();

	//init_x = 305000;
	//init_y = 5644000;
	//getpoints(init_x, init_y);
}

async function getpoints(init_x, init_y) {
	to = 4;
	for(let x = 0; x < to; x++) {
		for(let y = 0; y < to; y++) {
			xx = init_x + 50 * x;
			yy = init_y + 50 * y;

			let obj = {};
			obj.x = xx - global_offset_x;
			obj.y = yy - global_offset_y;
			already_rendered.push(obj)

			getTile(xx, yy);
			// xyz = await loadPoints(xx, yy);
			// colors = await loadColor(xx, yy);
			// addPointsToScene(scene, colors, xyz, xx, yy, 100)
		}
	}
}

//TODO:	Error handling

//Fetches and adds to the global scene a 50x50 Tile for given x and y coordinates via the loadPoints and loadColor methods
//Input 	x, y (lower x coordinate, lower y coordinate)
async function getTile(xx, yy) {
	let xyz = await loadPoints(xx, yy);
	let colors = await loadColor(xx, yy);
	addPointsToScene(scene, colors, xyz, xx, yy, 100)
}

//Load the color data from backblaze via HTTP-Request given x and y as 50m-granularity coordinates
//Input   x, y
//Output  Array of Points
async function loadPoints(x, y) {
	// let request_url = "https://s3-eu-west-1.amazonaws.com/lisonrwdata/LIDAR_DATA/304000_5645000/"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	//let request_url = "https://f002.backblazeb2.com/file/lisonrw/nrw/304000_5645000/color/"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	let request_url = "https://f002.backblazeb2.com/file/lisonrw/wnrw/LidarData/xyz_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/xyz_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	let xyz = await makeRequest("GET", request_url);
	xyz = CSVToArray(xyz, ",")
	return xyz;
}

//Load the color data from backblaze via HTTP-Request
//Input   x, y
//Output  Array of HEX Color Strings
async function loadColor(x, y) {
	//let request_url = "https://f002.backblazeb2.com/file/lisonrw/nrw/304000_5645000/xyz/col_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	let request_url = "https://f002.backblazeb2.com/file/lisonrw/wnrw/ColorData/col_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/col_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	let colors = await makeRequest("GET", request_url);
	colors = CSVToArray(colors, " ")
	return colors;
}


//Add a set of points to the scene
//Input scene, colors, points, offset's in all directions
function addPointsToScene(scene, colors, points, offset_x, offset_y, offset_z) {

	//if undefined, set global offset initially.
	if(global_offset_x === null) {
		global_offset_x = offset_x;
		global_offset_y = offset_y;
		global_offset_z = offset_z;
	}

	//create a buffer geometry
	let geometry = new THREE.BufferGeometry();

	//create arrays of the points and colors
	let n_positions = [];
	let n_colors = [];
	let color = new THREE.Color();

	//TODO:	Do this with the Javascript Numpy equivalent 
	for (let i in points) {
		pt = points[i];
		x = Number(pt[0]) - global_offset_x;
		y = Number(pt[2]) - global_offset_z;
		z = Number(pt[1]) - global_offset_y;

		//TODO:	CHECK - WHY IS THIS NECCESSARY?
		if(!isNaN(x) && !isNaN(y) && !isNaN(z)) {
		
			//push the coords to the array
			n_positions.push(x, y, z);

			//create one single color (will be changed in the loop)
			cl = hexToRgb(colors[i][0]);
			
			//decimal rgb conversion
			x = cl[0] / 255;
			y = cl[1] / 255;
			z = cl[2] / 255;
			color.setRGB(x, y, z);

			//push to colors array
			n_colors.push(color.r, color.g, color.b);
		}
	}

	geometry.addAttribute('position', new THREE.Float32BufferAttribute(n_positions, 3));

	//Simpifly this with a 1-Element-Array of Colors
	geometry.addAttribute('color', new THREE.Float32BufferAttribute(n_colors, 3));

	let material = new THREE.PointsMaterial({ size: 0.85, vertexColors: THREE.VertexColors });
	points = new THREE.Points(geometry, material);
	scene.add(points);

	// let bound_center_x = offset_x - global_offset_x + 25;
	// let bound_center_y = offset_y - global_offset_y + 25;
	// let bound_center_z = offset_z - global_offset_z + 25;

	// console.log(bound_center_x, bound_center_y, bound_center_z)
	// let newgeo = new THREE.BoxGeometry(50, 50, 50);
	// let mat = new THREE.MeshBasicMaterial( {color: 0xff4500, wireframe: true} );
	// cube = new THREE.Mesh( newgeo, mat );
	// cube.position.set(bound_center_x, bound_center_z, bound_center_y);
	// scene.add( cube );
}

//Convert a "5a7aff" HEX to a (255,255,255) RGB Value
//Input   HEX String
//Return  RGB Array
function hexToRgb(hex) {
	// hex = hex.replace("#", "")
	let bigint = parseInt(hex, 16);
	let r = (bigint >> 16) & 255;
	let g = (bigint >> 8) & 255;
	let b = bigint & 255;
	return [r, g, b];
}

//Make an URL Request
//Input   Request Type (GET, POST, ...)
//Return  Promise with resolve value of pako-inflated (ungzipped) string of values
function makeRequest(method, url) {
	return new Promise(function (resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.responseType = "arraybuffer"; //for ungzip with pako
		xhr.onload = function () {
			console.log(xhr)
			if (this.status >= 200 && this.status < 300) {
				let arrayBuffer = xhr.response; // Note: not oReq.responseText
				let byteArray = new Uint8Array(arrayBuffer);
				let result = pako.inflate(byteArray, { to: 'string' });
				resolve(result);
			} else {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			}
		};
		xhr.onerror = function () {
			reject({
				status: this.status,
				statusText: xhr.statusText
			});
		};
		xhr.send();
	});
}

//Convert a String to an Array
//Input   inputString, delimiter
//Output  Array
//From: STACKOVERFLOW ---- ADD SOURCE
function CSVToArray(strData, strDelimiter) {
	// Check to see if the delimiter is defined. If not,
	// then default to comma.
	strDelimiter = (strDelimiter || ",");

	// Create a regular expression to parse the CSV values.
	let objPattern = new RegExp(
		(
			// Delimiters.
			"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

			// Quoted fields.
			"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

			// Standard fields.
			"([^\"\\" + strDelimiter + "\\r\\n]*))"
		),
		"gi"
	);


	// Create an array to hold our data. Give the array
	// a default empty first row.
	let arrData = [[]];

	// Create an array to hold our individual pattern
	// matching groups.
	let arrMatches = null;


	// Keep looping over the regular expression matches
	// until we can no longer find a match.
	while (arrMatches = objPattern.exec(strData)) {

		// Get the delimiter that was found.
		let strMatchedDelimiter = arrMatches[1];

		// Check to see if the given delimiter has a length
		// (is not the start of string) and if it matches
		// field delimiter. If id does not, then we know
		// that this delimiter is a row delimiter.
		if (
			strMatchedDelimiter.length &&
			strMatchedDelimiter !== strDelimiter
		) {

			// Since we have reached a new row of data,
			// add an empty row to our data array.
			arrData.push([]);

		}

		let strMatchedValue;

		// Now that we have our delimiter out of the way,
		// let's check to see which kind of value we
		// captured (quoted or unquoted).
		if (arrMatches[2]) {

			// We found a quoted value. When we capture
			// this value, unescape any double quotes.
			strMatchedValue = arrMatches[2].replace(
				new RegExp("\"\"", "g"),
				"\""
			);

		} else {
			// We found a non-quoted value.
			strMatchedValue = arrMatches[3];
		}
		// Now that we have our value string, let's add
		// it to the data array.
		arrData[arrData.length - 1].push(strMatchedValue);
	}

	// Return the parsed data.
	return (arrData);
}

function roundDown50(x) {
	return Math.floor(x/50)*50;
}

function roundDown1000(x) {
    return Math.floor(x/1000)*1000;
}