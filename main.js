//threejs global variables
let result;
let scene;
let camera;
let controls;
let renderer;
let canvas;

//set on the first load of a tile
let global_offset_z = 0;
let first_search_done = null;

// let zlib = require('browserify-zlib');

let already_loaded = [];
let all_tiles = [];

let GEOMETRY_LOADING_HINT;
let MATERIAL_LOADING_HINT;

let CONCURRENT_HTTP_REQUEST_COUNT = 0;

let LOAD_AROUND_NR = 2;

//Prevents scrolling the page 
function preventBehavior(e) {
	e.preventDefault(); 
}

function onWindowResize( event ) {

	//re-set aspect ratio
	camera.aspect = window.innerWidth / window.innerHeight;

	//necessary to keep dots nicely seperated
	camera.updateProjectionMatrix();

	//re-set renderer size
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.render( scene, camera );
}

function ll2WGS(lat, lng){
	wgs_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").forward([lng, lat]) //careful with lat lng order (!) they flipped it 
	return wgs_coords;
}

function WGS2ll(x, y){
	latlng_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").convert([x, y]) //careful with order, here its x and then y
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
	console.log(autocomplete)

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
			zoomToNewPlace(wgs_coords[0], wgs_coords[1])
			first_search_done = true;
		}
	});
}

function euclidianDistance(wgs_coords_a, wgs_coords_b) {
	var a = wgs_coords_a[0] - wgs_coords_b[0];
	var b = wgs_coords_a[1] - wgs_coords_b[1];
	return Math.sqrt( a*a + b*b );
}

function moveCamera(x, y) {
	camera.position.set(x, y, 50); //camera.position.z
	controls.target.set(x, y, 0); //controls.target.z
	controls.update();
}

function cameraToNormalPos() {

}

function zoomToNewPlace(x, y) {

	x = roundDown50(x);
	y = roundDown50(y);

	//get distance from new loc to current viewing point
	let distance = euclidianDistance([x, y], [controls.target.x, controls.target.y])
	console.log("eucl. distance to new is:", distance)
	if(distance > 400) {
		//clean all before loaded ones from scene at least
	}

	moveCamera(x, y)
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

	document.addEventListener("touchmove", preventBehavior, {passive: false});

	//resize listener for threejs
	window.addEventListener( 'resize', onWindowResize, false );

	GEOMETRY_LOADING_HINT = new THREE.PlaneGeometry(50, 50, 50);
	MATERIAL_LOADING_HINT = new THREE.MeshBasicMaterial( {color: 0x9ACD32, transparent: true, opacity: 0.3, side: THREE.DoubleSide} );

	initTransferControlsListener();

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.up.set( 0, 0, 1 );

	canvas = document.querySelector("canvas");
	renderer = new THREE.WebGLRenderer({canvas: canvas});
	renderer.setSize(window.innerWidth, window.innerHeight);
	//renderer.setClearColor(0xffffff);
	renderer.setClearColor(0x000000);

	//document.getElementById("threejs_container").appendChild(renderer.domElement);

	// = new THREE.Orbit( camera );
	console.log(renderer.domElement)
	//controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls = new THREE.OrbitControls( camera );

	controls.screenSpacePanning = true;

	console.log(controls)
	
	//.update() must be called after any manual changes to the camera's transform

	// init_x = 304000;
	// init_y = 5645200;
	// to = 2;
	// for(let x = 0; x < to; x++) {
	// 	for(let y = 0; y < to; y++) {
	// 		x50 = init_x + 50 * x;
	// 		y50 = init_y + 50 * y;
	// 		xyz = await loadPoints(x50, y50);
	// 		colors = await loadColor(x50, y50);
	// 		addPointsToScene(scene, colors, xyz, x50, y50, 100)
	// 	}
	// }

	camera.position.set(25,25 , -32.44520525782314);
	controls.target.set(25,25, -32.445261301389486);
	controls.update();

	let axesHelper = new THREE.AxesHelper(5);
	scene.add(axesHelper);
	console.log(axesHelper)

	camera.position.z = 5;

	redraw();

	// init_x = roundDown50(301917.9717594234);
	// init_y = roundDown50(5643190.490984015);
	// let newTile = new TileObject(init_x, init_y);

	// newTile.downloadAndShow();
}

function redraw() {

	requestAnimationFrame(redraw);

	if(first_search_done != null) {

		renderer.render(scene, camera);

		x_focus_center = roundDown50(controls.target.x);
		y_focus_center = roundDown50(controls.target.y);

		//this is slighty inefficient but the easiest way (no request leads to requests which leads to resets, which then leads to more requests... etc)
		if(CONCURRENT_HTTP_REQUEST_COUNT === 0 && LOAD_AROUND_NR < 5) {
			//increase area around
			LOAD_AROUND_NR =  LOAD_AROUND_NR + 1;
		}else {
			//We're busy loading stuff, no need to start more requests
			LOAD_AROUND_NR = 2;
		}
		loadTilesAtIfMissing(x_focus_center, y_focus_center, LOAD_AROUND_NR);
	}
};

function loadTilesAtIfMissing(x_focus_center, y_focus_center, load_around_nr) {

	if(load_around_nr === undefined || load_around_nr === null) {
		load_around_nr = 3;
	}

	delta = [0]
	for(let i = load_around_nr; i > 0; i--) {
		delta.push(-50*i)
	}
	for(let i = 1; i <= load_around_nr; i++) {
		delta.push(50*i)
	}

	for(let i in delta) {
		for(let j in delta) {

			x_focus = x_focus_center + delta[i]
			y_focus = y_focus_center + delta[j]

			let found = all_tiles.find(chunk => {
				return (chunk.x50) === (x_focus) && (chunk.y50) === (y_focus)
			})

			if(found === undefined) {
				//No yet defined -> download then show it
				let newTile = new TileObject(x_focus, y_focus);
				newTile.downloadAndShow();
				newTile.download_started = true;
			} else if(!found.isShowing() && found.isDownloadStarted() && found.isDownloadFinished()) {
				//Is fully downloaded and not showing -> show it
				found.show();
			}
		}
	}
}


function countShowing() {
	return all_tiles.reduce(
		function(total, tileObject){
			return tileObject.isShowing() ? total+1 : total
		}, 
		0
	);
}

function autohide(viewpoint_x, viewpoint_y) {
	x_focus_center = roundDown50(controls.target.x)
	y_focus_center = roundDown50(controls.target.y)

	delta = [-150, -100, -50, 0, 50, 100, 150];

	for(let i in delta) {
		for(let j in delta) {

			x_focus = x_focus_center + delta[i]
			y_focus = y_focus_center + delta[j]

			let found = all_tiles.find(chunk => {
				return (chunk.x50) === (x_focus) && (chunk.y50) === (y_focus)
			})

			if(found == undefined) {
				let newTile = new TileObject(x50, y50);
				newTile.download_started = true;
				newTile.downloadAndShow();
			}else if(!found.isShowing()) {
				console.log("isn't showing right now")
				found.show();
			}
		}
	}
}

class TileObject {
	constructor(x50, y50) {
		this.x50 = x50;
		this.y50 = y50;

		this.showing = false;
		this.download_started = false;
		this.download_finished = false;
		this.showing_loading_hint = false;
		
		all_tiles.push(this);
		return this;
	}

	downloadStarted() {
		this.download_started = true;
		CONCURRENT_HTTP_REQUEST_COUNT++;
	}

	downloadEnded() {
		this.download_finished = true;
		CONCURRENT_HTTP_REQUEST_COUNT--;
	}

	isShowing() {
		return this.showing;
	}

	isDownloadStarted() {
		return this.download_started;
	}

	isDownloadFinished() {
		return this.download_finished;
	}

	removeRawData() {
		delete this.xyz;
		delete this.colors;
	}

	async downloadData() {		
		this.downloadStarted();

		// while(CONCURRENT_HTTP_REQUEST_COUNT > 16) {
		// 	console.log("Concurrency limit reached, waiting");
		// 	sleep(30);
		// }

		let data = await getTileData(this.x50, this.y50);
		this.xyz = data[0];
		this.colors = data[1];
		this.downloadEnded();
		return this;
	}

	showLoadingHint() {
		if(this.showing_loading_hint == false) {
			let bound_center_x = this.x50 + 25;
			let bound_center_y = this.y50 + 25;
			let bound_center_z = global_offset_z;

			this.showing_loading_hint = true;
			this.loading_hint_plane = new THREE.Mesh( GEOMETRY_LOADING_HINT, MATERIAL_LOADING_HINT );
			this.loading_hint_plane.position.set(bound_center_x, bound_center_y, bound_center_z);
			scene.add(this.loading_hint_plane);
		}
	}

	removeLoadingHint() {
		if(this.showing_loading_hint) {
			this.showing_loading_hint = false;
			scene.remove(this.loading_hint_plane);
		}
	}

	show() {
		if(!this.isShowing()) {
			this.showing = true;
			if(this.threejs_points === undefined || this.threejs_points === null) {
				this.threejs_points = createTilePoints(this);
				this.removeRawData();
			}
			scene.add(this.threejs_points);
		}
	}

	hide() {
		if(this.isShowing()) {
			this.showing = false;
			scene.remove(this.threejs_points); 
		}
	}

	async downloadAndShow() {
		//Only if not yet started to download or finished shall we download the data again
		if(!this.isDownloadStarted() && !this.isDownloadFinished()) {
			this.showLoadingHint()
			await this.downloadData();
			this.show();
			this.removeLoadingHint();
		}
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function getpoints(init_x, init_y) {
	to = 4;
	for(let x = 0; x < to; x++) {
		for(let y = 0; y < to; y++) {
			x50 = init_x + 50 * x;
			y50 = init_y + 50 * y;

			let obj = {};
			obj.x = x50 - global_offset_x;
			obj.y = y50 - global_offset_y;

			already_loaded.push(obj)
			getTile(x50, y50, obj);
			// xyz = await loadPoints(x50, y50);
			// colors = await loadColor(x50, y50);
			// addPointsToScene(scene, colors, xyz, x50, y50, 100)
		}
	}
}

//TODO:	Error handling

//Fetches and adds to the global scene a 50x50 Tile for given x and y coordinates via the loadPoints and loadColor methods
//Input 	x, y (lower x coordinate, lower y coordinate)
async function getTileData(x50, y50) {
	let xyz = await loadPoints(x50, y50);
	let colors = await loadColor(x50, y50);
	return [xyz, colors];
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
function createTilePoints(tileObject) {

	//TODO: Fix this workaround with parsing - last row is always "dead" for some reason
	tileObject.xyz.pop()

	//create a buffer geometry
	let geometry = new THREE.BufferGeometry();

	//create arrays of the points and colors
	let n_positions = [];
	let n_colors = [];
	let color = new THREE.Color();

	if(global_offset_z === 0) {
		let avg_z = 0;
		for (let i in tileObject.xyz) {
			avg_z = avg_z + Number(tileObject.xyz[i][2]);
		}
		global_offset_z = avg_z / tileObject.xyz.length;
	}

	//TODO:	Do this with the Javascript Numpy equivalent 
	for (let i in tileObject.xyz) {

		const pt = tileObject.xyz[i];

		//deduct the global offsets set on the initial load 
		x = Number(pt[0]);
		y = Number(pt[1]);
		z = Number(pt[2]);

		//push the coords to the array
		n_positions.push(x, y, z);

		//create one single color (will be changed in the loop)
		cl = hexToRgb(tileObject.colors[i][0]);
		
		//decimal rgb conversion
		x = cl[0] / 255;
		y = cl[1] / 255;
		z = cl[2] / 255;
		color.setRGB(x, y, z);

		//push to colors array
		n_colors.push(color.r, color.g, color.b);
	}

	geometry.addAttribute('position', new THREE.Float32BufferAttribute(n_positions, 3));

	//Simpifly this with a 1-Element-Array of Colors
	geometry.addAttribute('color', new THREE.Float32BufferAttribute(n_colors, 3));

	let material = new THREE.PointsMaterial({ size: 0.85, vertexColors: THREE.VertexColors });
	points = new THREE.Points(geometry, material);
	return points;
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
			//console.log(xhr)
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