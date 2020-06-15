//threejs global variables
let result;
let scene;
let camera;
let controls;
let renderer;
let canvas;

//set on the first load of a tile
let global_offset_z = 0;
let first_search_done = false;

// let zlib = require('browserify-zlib');

// Deprecated v0.3
// let already_loaded = [];

let all_tiles = [];
let all_hint_tiles = [];

let GEOMETRY_LOADING_HINT;
let MATERIAL_LOADING_HINT;

let CONCURRENT_HTTP_REQUEST_COUNT = 0;

let LOAD_AROUND_NR = 2;

let clicked_entry_field = false;

let set_language_pref = (language) => {
	localStorage.setItem('language_preference', language);
	location.href='../'+language+'/'
}

let free_ram = () => {
	const sorted_all_tiles = all_tiles.sort((a, b) => b.creation_date - a.creation_date)
	sorted_all_tiles.slice(30, sorted_all_tiles.length).map(tile => tile.remove());
	all_tiles = sorted_all_tiles.slice(0, 30);
}

let back_to_main = () => {
	addOverlay();
	removeTransferControlsListener();
	focus_to_searchbar();
	first_search_done = false;
	global_offset_z = 0;
}

//Prevents scrolling the page 
let preventBehavior = (e) => {
	e.preventDefault(); 
}

let onWindowResize = (event) => {

	//re-set aspect ratio
	camera.aspect = window.innerWidth / window.innerHeight;

	//necessary to keep dots nicely seperated
	camera.updateProjectionMatrix();

	//re-set renderer size
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.render( scene, camera );
}

let ll2WGS = (lat, lng )=> {
	wgs_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").forward([lng, lat]) //careful with lat lng order (!) they flipped it 
	return wgs_coords;
}

let WGS2ll = (x, y) => {
	latlng_coords = proj4("+proj=utm +zone=32N, +ellps=WGS84 +datum=WGS84 +units=m +no_defs").convert([x, y]) //careful with order, here its x and then y
	return latlng_coords;
}

function showWrongCountyNote() {
	document.getElementById("searchbar_flag").setAttribute("show", "true");
}

function hideWrongCountyNote() {
	document.getElementById("searchbar_flag").setAttribute("show", "false");
}

function initAutocomplete() {

	let input = document.getElementById('searchbar_entry_field');
	let autocomplete = new google.maps.places.Autocomplete(input);
	autocomplete.setFields(['address_components', 'geometry','name']);
	//autocomplete.setTypes(['geocode', 'regions'])
	// console.log(autocomplete)

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
			goToLatLng(place.geometry.location.lat(), place.geometry.location.lng());
		}
	});
}



let euclidianDistance = (wgs_coords_a, wgs_coords_b) => {
	var a = wgs_coords_a[0] - wgs_coords_b[0];
	var b = wgs_coords_a[1] - wgs_coords_b[1];
	return Math.sqrt( a*a + b*b );
}

let moveCamera = (x, y) => {
	camera.position.set(x, y, 50); //camera.position.z
	controls.target.set(x, y, 0); //controls.target.z
	controls.update();
}

function cameraToNormalPos() {

}

let zoomToNewPlaceLatLng = (lat, lng) => {
	wgs_coords = ll2WGS(lat, lng);
	zoomToNewPlace(wgs_coords[0], wgs_coords[1]);
	console.log(wgs_coords)
}

let goToLatLng = (lat, lng) => {
	//Convert to WGS
	wgs_coords = ll2WGS(lat, lng);
	console.log(lat, lng);
	goToWgs(wgs_coords[0], wgs_coords[1]);
}

let goToWgs = (x, y) => {

	//Wait a little so the animation can work
	setTimeout(function(){ 
		zoomToNewPlace(wgs_coords[0], wgs_coords[1])
		first_search_done = true;
	}, 500);

	if(first_search_done === false) {
		removeOverlay();
		initTransferControlsListener();
	}

	focus_to_touch_controls();
}

let zoomToNewPlace = (x, y) => {

	xR = roundDown50(x);
	yR = roundDown50(y);

	//get distance from new loc to current viewing point
	let distance = euclidianDistance([xR, yR], [controls.target.xR, controls.target.yR])
	console.log("eucl. distance to new is:", distance)
	if(distance > 400) {
		//clean all before loaded ones from scene at least
		all_tiles.map(tile => {
			tile.remove();
		});
		all_tiles = [];

		//clean all hint tiles
		all_hint_tiles.map(hint_tile => {
			hint_tile.remove();
		})
		all_hint_tiles = [];

		//reset global offset to nothing
		set_global_offset_z(0);
	}

	moveCamera(x, y)
}


function document_click(event) {
	let targetElement = event.target || event.srcElement;
	let is_clicked_entry_field = targetElement === document.getElementById("searchbar_entry_field");
	if (clicked_entry_field && !is_clicked_entry_field) {
		focus_to_touch_controls();
	}
	clicked_entry_field = is_clicked_entry_field;
}

function searchbar_enter(event) {
	let key = event.which || event.keyCode;
	if (key === 13) { // 13 is enter
		focus_to_touch_controls();
	}
}

function searchbar_mouseover(event) {

	controls.enabled = false;
}

function canvas_click(event) {
	controls.enabled = true;
	searchbar_entry_field.blur();
}

function canvas_mouseover(event) {
	controls.enabled = true;
	searchbar_entry_field.blur();
}

function initTransferControlsListener() {

	document.addEventListener("touchmove", preventBehavior, { passive: false });

	// Important
	// Switches focus to the 3D Canvas when neccessary 
	document.addEventListener("click", document_click);

	document.getElementById("searchbar_entry_field").addEventListener("keypress", searchbar_enter);
	document.getElementById("searchbar_entry_field").addEventListener("mouseover", searchbar_mouseover);

	document.querySelector("canvas").addEventListener("click", canvas_click)
	document.querySelector("canvas").addEventListener("mouseover", canvas_mouseover);
}

function removeTransferControlsListener() {
	document.removeEventListener("touchmove", preventBehavior);
	document.removeEventListener("click", document_click);

	document.getElementById("searchbar_entry_field").removeEventListener("keypress", searchbar_enter);
	document.getElementById("searchbar_entry_field").removeEventListener("mouseover", searchbar_mouseover);

	document.querySelector("canvas").removeEventListener("click", canvas_click)
	document.querySelector("canvas").removeEventListener("mouseover", canvas_mouseover);
}

let focus_to_touch_controls = () => {
	searchbar_entry_field = document.getElementById("searchbar_entry_field");
	controls.enabled = true;
	searchbar_entry_field.blur();
}

let focus_to_searchbar = () => {
	searchbar_entry_field = document.getElementById("searchbar_entry_field");
	controls.enabled = false;
	searchbar_entry_field.focus();
}

let start = async () => {

	let help_button = document.getElementById("help");
	help_button.addEventListener("click", function() {
		console.log("toggling");
		document.getElementById("help_box").classList.toggle("visible");
	});

	//document.addEventListener("touchmove", preventBehavior, {passive: false});

	//resize listener for threejs
	window.addEventListener( 'resize', onWindowResize, false );

	GEOMETRY_LOADING_HINT = new THREE.PlaneGeometry(50, 50, 50);
	MATERIAL_LOADING_HINT = new THREE.MeshBasicMaterial( {color: 0x9ACD32, transparent: true, opacity: 0.3, side: THREE.DoubleSide} );

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
	camera.up.set( 0, 0, 1 );

	canvas = document.querySelector("canvas");
	renderer = new THREE.WebGLRenderer({canvas: canvas});
	renderer.setSize(window.innerWidth, window.innerHeight);
	// renderer.setClearColor(0xffffff);
	// renderer.setClearColor(0x000000);
	renderer.setClearColor(0x696969);

	//document.getElementById("threejs_container").appendChild(renderer.domElement);

	// = new THREE.Orbit( camera );
	// console.log(renderer.domElement)
	// controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls = new THREE.OrbitControls( camera );

	controls.screenSpacePanning = true;

	// console.log(controls)
	
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
	// console.log(axesHelper)

	camera.position.z = 5;

	redraw();
	init_worker();

	// init_x = roundDown50(301917.9717594234);
	// init_y = roundDown50(5643190.490984015);
	// let newTile = new TileObject(init_x, init_y);

	// newTile.downloadAndShow();

	// renderer.domElement.addEventListener("dblclick", onclick, true);
	renderer.domElement.addEventListener("click", onclick, true);
	raycaster = new THREE.Raycaster();

	// searchbar_entry_field = document.getElementById("searchbar_entry_field");
	// searchbar_entry_field.addEventListener("click", () => {
	// 	console.log("hello");
	// })

	focus_to_searchbar();
	log_visit();
}

function log_visit() {
	const Http = new XMLHttpRequest();
	const url='https://openlidar.menzinger.io/visit';
	Http.open("POST", url);
	Http.send();

	// Http.onreadystatechange = (e) => {
	// }
}


function onclick(event) {

	document.getElementById("help_box").classList.remove("visible");

	var mouse = new THREE.Vector2();
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera( mouse.clone(), camera ); 

	let all_hints = all_hint_tiles.map(x => x.invisible_hint);
	// console.log(all_hints)
	var intersects = raycaster.intersectObjects(all_hints); 

	// console.log("intersects length", intersects.length)
	if (intersects.length > 0) {
		var selectedObject = intersects[0];
		selectedObject.object.visible = false;
		selectedObject.object.parent_object.clicked();
	}
}

function init_worker() {
	setInterval(() => { 
		if(first_search_done === true) {
			// console.log("worker checked")
			x_focus_center = roundDown50(controls.target.x);
			y_focus_center = roundDown50(controls.target.y);

			//this is slighty inefficient but the easiest way (no request leads to requests which leads to resets, which then leads to more requests... etc)
			if(CONCURRENT_HTTP_REQUEST_COUNT === 0 && LOAD_AROUND_NR < 5) {
				//increase area around
				LOAD_AROUND_NR = LOAD_AROUND_NR + 1;
			}else {
				//We're busy loading stuff, no need to start more requests
				LOAD_AROUND_NR = 2;
			}
			loadTilesAtIfMissing(x_focus_center, y_focus_center, LOAD_AROUND_NR);
		}
	}, 500);
}

function redraw() {

	renderer.render(scene, camera);
	requestAnimationFrame(redraw);

	// if(first_search_done != null) {

	// 	renderer.render(scene, camera);

	// 	x_focus_center = roundDown50(controls.target.x);
	// 	y_focus_center = roundDown50(controls.target.y);

	// 	//this is slighty inefficient but the easiest way (no request leads to requests which leads to resets, which then leads to more requests... etc)
	// 	if(CONCURRENT_HTTP_REQUEST_COUNT === 0 && LOAD_AROUND_NR < 5) {
	// 		//increase area around
	// 		LOAD_AROUND_NR =  LOAD_AROUND_NR + 1;
	// 	}else {
	// 		//We're busy loading stuff, no need to start more requests
	// 		LOAD_AROUND_NR = 2;
	// 	}
	// 	loadTilesAtIfMissing(x_focus_center, y_focus_center, LOAD_AROUND_NR);
	// }
	
	// requestAnimationFrame(redraw);
};

let set_global_offset_z = (offset_z) => {
	global_offset_z = offset_z;
	all_hint_tiles.map(hint_tile => {
		hint_tile.reset_global_offset_z();
		return hint_tile;
	})
	camera.position.z = global_offset_z + 200;
} 

let loadTilesAtIfMissing = (x_focus_center, y_focus_center, load_around_nr) => {

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

let draw_hint_tiles_from_x_y = (x, y) => {
	// get center
	x250 = roundDown250(x);
	y250 = roundDown250(y);

	//offsets = [-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,-0,1,2,3,4,5,6,7,8,9,10];
	offsets = [-1,0,1]

	for(x_offset of offsets) {

		x_current = x250 + 250 * x_offset;

		for(y_offset of offsets) {

			y_current = y250 + 250 * y_offset;

			let found = all_hint_tiles.find(hint_tile => {
				return (hint_tile.x250) === (x_current) && (hint_tile.y250) === (y_current)
			});

			if(found === undefined) {
				
				let hintObject = new HintObject(x_current, y_current);
				all_hint_tiles.push(hintObject)

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

let autohide = (viewpoint_x, viewpoint_y) => {
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

class HintObject {
	constructor(x250, y250) {
		this.x250 = x250;
		this.y250 = y250;

		//Standard plane
		this.plane = new THREE.PlaneGeometry(250, 250, 250);
		this.invisible_material = new THREE.MeshBasicMaterial( {color: 0xc7c7c7, transparent: true, opacity: 0.1, side: THREE.DoubleSide});
		
		//Wireframe
		this.geometry = new THREE.EdgesGeometry(this.plane);
		this.wireframe_material = new THREE.LineBasicMaterial( { color: 0xc7c7c7 });

		//Create 
		this.invisible_hint = new THREE.Mesh(this.plane, this.invisible_material);
		this.hint = new THREE.LineSegments(this.geometry, this.wireframe_material);

		//Set position
		this.invisible_hint.position.set(x250+125, y250+125, global_offset_z - 10);
		this.invisible_hint.parent_object = this;
		this.hint.position.set(x250+125, y250+125, global_offset_z - 10);

		//Add to scene
		scene.add(this.invisible_hint);
		scene.add(this.hint);
	}

	reset_global_offset_z() {
		this.invisible_hint.position.setZ(global_offset_z - 10);
		this.hint.position.setZ(global_offset_z - 10);
	}

	remove() {
		scene.remove(this.invisible_hint)
		scene.remove(this.hint)
	}

	clicked() {
		for(let i = 0; i < 5; i++) {
			for(let j = 0; j < 5; j++) {
				loadTilesAtIfMissing(this.x250 + i * 50, this.y250 + j * 50, 0);
			}
		}
		this.remove();
	}
}

class TileObject {
	constructor(x50, y50) {

		this.creation_date = new Date()

		this.x50 = x50;
		this.y50 = y50;

		this.showing = false;
		this.download_started = false;
		this.download_finished = false;
		this.showing_loading_hint = false;

		this.empty = false;

		draw_hint_tiles_from_x_y(x50, y50);
		
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
		if(!this.isShowing() && !this.empty) {
			this.showing = true;
			if(this.threejs_points == null) {
			// if(this.threejs_points === undefined || this.threejs_points === null) {
				this.threejs_points = createTilePoints(this);
				this.removeRawData();
			}
			scene.add(this.threejs_points);
		}
	}

	remove() {
		if(this.isShowing()) {
			this.showing = false;
			scene.remove(this.threejs_points); 
		}
	}

	async downloadAndShow() {
		//Only if not yet started to download or finished shall we download the data again
		if(!this.isDownloadStarted() && !this.isDownloadFinished()) {
			this.showLoadingHint()
			try {
				await this.downloadData();

				if(this.xyz != null && this.colors != null) {
					this.show();
				}else {
					this.empty = true;
				}

			}catch(err) {
				console.log("Error downloading data")
				console.log(err)
			}
			this.removeLoadingHint();
		}
	}
}

let sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Deprecated v0.3
// let getpoints = async (init_x, init_y) => {
// 	to = 4;
// 	for(let x = 0; x < to; x++) {
// 		for(let y = 0; y < to; y++) {
// 			x50 = init_x + 50 * x;
// 			y50 = init_y + 50 * y;

// 			let obj = {};
// 			obj.x = x50 - global_offset_x;
// 			obj.y = y50 - global_offset_y;

// 			already_loaded.push(obj)
// 			getTile(x50, y50, obj);
// 			// xyz = await loadPoints(x50, y50);
// 			// colors = await loadColor(x50, y50);
// 			// addPointsToScene(scene, colors, xyz, x50, y50, 100)
// 		}
// 	}
// }

//TODO:	Error handling

//Fetches and adds to the global scene a 50x50 Tile for given x and y coordinates via the loadPoints and loadColor methods
//Input 	x, y (lower x coordinate, lower y coordinate)
let getTileData = async (x50, y50) => {
	let xyz = await loadPoints(x50, y50);
	let colors = await loadColor(x50, y50);
	return [xyz, colors];
}

//Load the color data from backblaze via HTTP-Request given x and y as 50m-granularity coordinates
//Input   x, y
//Output  Array of Points
let loadPoints = async (x, y) => {
	let request_url = "https://openlidar.menzinger.io/data/lidar/G0/xyz_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/xyz_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	// let request_url = "https://openlidar.menzinger.workers.dev/lidar/G0/xyz_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/xyz_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	try {
		let xyz = await makeRequest("GET", request_url);
		xyz = CSVToArray(xyz, ",")
		return xyz;
	}catch {
		console.log("Fetch returned 404, probably water.")
		return null;		
	}
}

//Load the color data from backblaze via HTTP-Request
//Input   x, y
//Output  Array of HEX Color Strings
let loadColor = async (x, y) => {
	let request_url = "https://openlidar.menzinger.io/data/color/G0/col_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/col_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	// let request_url = "https://openlidar.menzinger.workers.dev/color/G0/col_32N_"+parseInt(roundDown1000(x)).toString()+"_"+parseInt(roundDown1000(y)).toString()+"/col_"+parseInt(x).toString()+"_"+parseInt(y).toString()+".gz"
	try {
		let colors = await makeRequest("GET", request_url);
		colors = CSVToArray(colors, " ")
		return colors;
	}catch {
		console.log("Fetch returned 404, probably water.")
		return null;		
	}
}

//Add a set of points to the scene
//Input scene, colors, points, offset's in all directions
let createTilePoints = (tileObject) => {

	//TODO: Fix this workaround with parsing - last row is always "dead" for some reason
	tileObject.xyz.pop()

	//create a buffer geometry
	let geometry = new THREE.BufferGeometry();

	//create arrays of the points and colors
	let n_positions = [];
	let n_colors = [];
	let color = new THREE.Color();

	if(global_offset_z === 0) {
		global_offset_z = 1; //Just so its immediately set.
		let avg_z = 0;
		for (let i in tileObject.xyz) {
			avg_z = avg_z + Number(tileObject.xyz[i][2]);
		}
		set_global_offset_z(avg_z / tileObject.xyz.length);
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

	let material = new THREE.PointsMaterial({ size: 0.90, vertexColors: THREE.VertexColors });
	// let material = new THREE.PointsMaterial({ size: 0.85, vertexColors: THREE.VertexColors });
	points = new THREE.Points(geometry, material);
	return points;
}

/* GUI MODIFICATIONS */
function removeOverlay() {
	document.body.setAttribute("overlay","0");
}

function addOverlay() {
	document.body.setAttribute("overlay","1");
}

//Convert a "5a7aff" HEX to a (255,255,255) RGB Value
//Input   HEX String
//Return  RGB Array
let hexToRgb = (hex) => {
	// hex = hex.replace("#", "")
	let bigint = parseInt(hex, 16);
	let r = (bigint >> 16) & 255;
	let g = (bigint >> 8) & 255;
	let b = bigint & 255;
	return [r, g, b];
}

// FOR REQUESTS WITHOUT THE PROPER HEADERS!
//Make an URL Request
//Input   Request Type (GET, POST, ...)
//Return  Promise with resolve value of pako-inflated (ungzipped) string of values
let makeRequest = (method, url) => {
	return new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.responseType = "arraybuffer"; //for ungzip with pako
		xhr.onload = function() {
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
		xhr.onerror = function() {
			reject({
				status: this.status,
				statusText: xhr.statusText
			});
		};
		xhr.send();
	});
}

// let makeRequest = (method, url) => {
// 	return new Promise((resolve, reject) => {
// 		let xhr = new XMLHttpRequest();
// 		xhr.open(method, url);
// 		xhr.onload = function() {
// 			if (this.status >= 200 && this.status < 300) {
// 				resolve(xhr.response);
// 			} else {
// 				reject({
// 					status: this.status,
// 					statusText: xhr.statusText
// 				});
// 			}
// 		};
// 		xhr.onerror = function() {
// 			reject({
// 				status: this.status,
// 				statusText: xhr.statusText
// 			});
// 		};
// 		xhr.send();
// 	});
// }

//Convert a String to an Array
//Input   inputString, delimiter
//Output  Array
//From: STACKOVERFLOW ---- ADD SOURCE
let CSVToArray = (strData, strDelimiter) => {
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

let roundDown50 = (x) => {
	return Math.floor(x/50)*50;
}

let roundDown500 = (x) => {
	return Math.floor(x/500)*500;
}

let roundDown250 = (x) => {
	return Math.floor(x/250)*250;
}

let roundDown1000 = (x) => {
    return Math.floor(x/1000)*1000;
}
