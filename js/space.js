// Art 109 Three.js Demo Site
// client7.js
// A three.js scene which uses planes and texture loading to generate a scene with images which can be traversed with basic WASD and mouse controls, this scene is full screen with an overlay.

// Import required source code
// Import three.js core
import * as THREE from "../build/three.module.js";
// Import pointer lock controls
import { PointerLockControls } from "../src/PointerLockControls.js";
// Import GLTF Loader
import { GLTFLoader } from '../src/GLTFLoader.js';
// Import Marching Cubes js files
import { MarchingCubes } from "../src/MarchingCubes.js";
import { ToonShader1, ToonShader2, ToonShaderHatching, ToonShaderDotted } from "../src/ToonShader.js";
// Establish variables
let camera, scene, renderer, controls, material;

let light, pointLight, ambientLight;

let materials, current_material;

let effect, resolution;

let effectController;

let time = 0;

const clock = new THREE.Clock();

const objects = [];
let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

// Initialization and animation function calls
init();
animate();

// Initialize the scene
function init() {

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 10;

  // BASIC SCENE PARAMETERS
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  // // SCENE LIGHTING
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  // LIGHTS

  light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 0.5, 0.5, 1 );
  scene.add( light );

  pointLight = new THREE.PointLight( 0xff3300 );
  pointLight.position.set( 0, 0, 100 );
  scene.add( pointLight );

  ambientLight = new THREE.AmbientLight( 0x080808 );
  scene.add( ambientLight );


  // // DIRECTIONAL LIGHT
  // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  // scene.add(directionalLight);
  //
  // // AMBIENT LIGHT
  // const ambientLight = new THREE.AmbientLight(0x1A00FF, 0.99);
  // scene.add(ambientLight);

  // MATERIALS
  materials = generateMaterials();
  current_material = 'shiny';

  // MARCHING CUBES

  resolution = 28;

  effect = new MarchingCubes( resolution, materials[ current_material ], true, true, 100000 );
  effect.position.set( 0, 0, 0 );
  effect.scale.set( 700, 700, 700 );

  effect.enableUvs = false;
  effect.enableColors = false;

  scene.add( effect );

  effectController = {

  material: 'shiny',

  speed: 1.0,
  numBlobs: 10,
  resolution: 28,
  isolation: 80,

  floor: true,
  wallx: false,
  wallz: false,

  dummy: function () {}

};


  // CONTROLS
  controls = new PointerLockControls(camera, document.body);

  // Identify the html divs for the overlays
  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  // Listen for clicks and respond by removing overlays and starting mouse look controls
  // Listen
  instructions.addEventListener("click", function() {
    controls.lock();
  });
  // Remove overlays and begin controls on click
  controls.addEventListener("lock", function() {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });
  // Restore overlays and stop controls on esc
  controls.addEventListener("unlock", function() {
    blocker.style.display = "block";
    instructions.style.display = "";
  });
  // Add controls to scene
  scene.add(controls.getObject());

  // Define key controls for WASD controls
  const onKeyDown = function(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Add raycasting for mouse controls
  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );

  // Generate the ground
  let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);

  // Vertex displacement pattern for ground
  let position = floorGeometry.attributes.position;

  for (let i = 0, l = position.count; i < l; i++) {
    vertex.fromBufferAttribute(position, i);

    vertex.x += Math.random() * 20 - 10;
    vertex.y += Math.random() * 2;
    vertex.z += Math.random() * 20 - 10;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

  position = floorGeometry.attributes.position;
  const colorsFloor = [];

  for (let i = 0, l = position.count; i < l; i++) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsFloor.push(color.r, color.g, color.b);
  }

  floorGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colorsFloor, 3)
  );

  const floorMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);

  // Insert completed floor into the scene
  scene.add(floor);

  // Insert GLTF or GLB Models
  var mesh, mesh2;
  const loader = new GLTFLoader();

  loader.load( './assets/blob.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
         //child.material = newMaterial;
       }
     });
     // set position and scale
     mesh = gltf.scene;
     mesh.position.set(5, 20, 18);
     mesh.rotation.set(0, 0, 0);
     mesh.scale.set(2, 2, 2); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh);

  }, undefined, function ( error ) {

  	console.error( error );

  } );

  const loader2 = new GLTFLoader();

  loader.load( './assets/blob2.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
         //child.material = newMaterial;
       }
     });
     // set position and scale
     mesh2 = gltf.scene;
     mesh2.position.set(7, 50, 1);
     mesh2.rotation.set(0, 0, 0);
     mesh2.scale.set(5, 5, 5); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh2);

  }, undefined, function ( error ) {

    console.error( error );

  } );


  // // First Image (red and purple glitch map)
  // // Load image as texture
  // const texture = new THREE.TextureLoader().load( '../../assets/glitch_map.jpg' );
  // // Immediately use the texture for material creation
  // const material = new THREE.MeshBasicMaterial( { map: texture, side: THREE.DoubleSide } );
  // // Create plane geometry
  // const geometry = new THREE.PlaneGeometry( 32, 16 );
  // // Apply image texture to plane geometry
  // const plane = new THREE.Mesh( geometry, material );
  // // Position plane geometry
  // plane.position.set(0 , 15 , -15);
  // // Place plane geometry
  // scene.add( plane );
  //
  // // Second Image (Text with image and white background)
  // // Load image as texture
  // const texture2 = new THREE.TextureLoader().load( '../../assets/bouy.jpg' );
  // // immediately use the texture for material creation
  // const material2 = new THREE.MeshBasicMaterial( { map: texture2, side: THREE.DoubleSide } );
  // // Create plane geometry
  // const geometry2 = new THREE.PlaneGeometry( 200, 100 );
  // // Apply image texture to plane geometry
  // const plane2 = new THREE.Mesh( geometry2, material2 );
  // // Position plane geometry
  // plane2.position.set(0 , 100 , -200);
  // // Place plane geometry
  // scene.add( plane2 );

  // this controls content of marching cubes voxel field

		function updateCubes( object, time, numblobs, floor, wallx, wallz ) {

			object.reset();

			// fill the field with some metaballs

			const rainbow = [
				new THREE.Color( 0xff0000 ),
				new THREE.Color( 0xff7f00 ),
				new THREE.Color( 0xffff00 ),
				new THREE.Color( 0x00ff00 ),
				new THREE.Color( 0x0000ff ),
				new THREE.Color( 0x4b0082 ),
				new THREE.Color( 0x9400d3 )
			];
			const subtract = 12;
			const strength = 1.2 / ( ( Math.sqrt( numblobs ) - 1 ) / 4 + 1 );

			for ( let i = 0; i < numblobs; i ++ ) {

				const ballx = Math.sin( i + 1.26 * time * ( 1.03 + 0.5 * Math.cos( 0.21 * i ) ) ) * 0.27 + 0.5;
				const bally = Math.abs( Math.cos( i + 1.12 * time * Math.cos( 1.22 + 0.1424 * i ) ) ) * 0.77; // dip into the floor
				const ballz = Math.cos( i + 1.32 * time * 0.1 * Math.sin( ( 0.92 + 0.53 * i ) ) ) * 0.27 + 0.5;

				if ( current_material === 'multiColors' ) {

					object.addBall( ballx, bally, ballz, strength, subtract, rainbow[ i % 7 ] );

				} else {

					object.addBall( ballx, bally, ballz, strength, subtract );

				}

			}

			if ( floor ) object.addPlaneY( 2, 12 );
			if ( wallz ) object.addPlaneZ( 2, 12 );
			if ( wallx ) object.addPlaneX( 2, 12 );

			object.update();

		}

    function render() {

    const delta = clock.getDelta();

    time += delta * effectController.speed * 0.5;

    // marching cubes

    if ( effectController.resolution !== resolution ) {

      resolution = effectController.resolution;
      effect.init( Math.floor( resolution ) );

    }

    if ( effectController.isolation !== effect.isolation ) {

      effect.isolation = effectController.isolation;

    }

    updateCubes( effect, time, effectController.numBlobs, effectController.floor, effectController.wallx, effectController.wallz );
  }

  // Define Rendered and html document placement
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Listen for window resizing
  window.addEventListener("resize", onWindowResize);
}

// Window resizing function
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


function generateMaterials() {

  // environment map

  const path = '../src/stars';
  const format = '.jpg';
  const urls = [
    path + 'px' + format, path + 'nx' + format,
    path + 'py' + format, path + 'ny' + format,
    path + 'pz' + format, path + 'nz' + format
  ];

  const cubeTextureLoader = new THREE.CubeTextureLoader();

  const reflectionCube = cubeTextureLoader.load( urls );
  const refractionCube = cubeTextureLoader.load( urls );
  refractionCube.mapping = THREE.CubeRefractionMapping;

  // toons

  const toonMaterial1 = createShaderMaterial( ToonShader1, light, ambientLight );
  const toonMaterial2 = createShaderMaterial( ToonShader2, light, ambientLight );
  const hatchingMaterial = createShaderMaterial( ToonShaderHatching, light, ambientLight );
  const dottedMaterial = createShaderMaterial( ToonShaderDotted, light, ambientLight );


  const materials = {
    'shiny': new THREE.MeshStandardMaterial( { color: 0x550000, envMap: reflectionCube, roughness: 0.1, metalness: 1.0 } ),
  };

  return materials;

}

function createShaderMaterial( shader, light, ambientLight ) {

  const u = THREE.UniformsUtils.clone( shader.uniforms );

  const vs = shader.vertexShader;
  const fs = shader.fragmentShader;

  const material = new THREE.ShaderMaterial( { uniforms: u, vertexShader: vs, fragmentShader: fs } );

  material.uniforms[ 'uDirLightPos' ].value = light.position;
  material.uniforms[ 'uDirLightColor' ].value = light.color;

  material.uniforms[ 'uAmbientLightColor' ].value = ambientLight.color;

  return material;

}


// Animation function
function animate() {
  requestAnimationFrame(animate);

  render();

  const time = performance.now();

  // Check for controls being activated (locked) and animate scene according to controls
  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects, false);

    const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }
  }

  prevTime = time;

  renderer.render(scene, camera);
}
