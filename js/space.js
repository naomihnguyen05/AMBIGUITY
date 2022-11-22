// Import three.js core
import * as THREE from 'three';
// Import pointer lock controls
import { PointerLockControls } from "../src/PointerLockControls.js";
// Import GLTF Loader
import { GLTFLoader } from '../src/GLTFLoader.js';
// Import Marching Cubes js files
import { MarchingCubes } from "../src/MarchingCubes.js";
import { GUI } from '../src/lil-gui.module.min.js';
// Establish variables
let container;

let camera, scene, renderer, controls, material;

let light, pointLight, ambientLight;

let soundBack;

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

function preload() {
  // AUDIO
soundBack = new Howl({ src: ['./assets/spaceambient.mp3'], loop: true, volume: 2});
soundBack.play();
}

// Initialize the scene
function init() {

  container = document.getElementById( 'container' );

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
  scene.background = new THREE.Color(0x8E0003);
  // scene.fog = new THREE.Fog(0xffffff, 0, 750);

  // // SCENE LIGHTING
  // const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  // light.position.set(0.5, 1, 0.75);
  // scene.add(light);

  // DIRECTIONAL LIGHT
  const directionalLight = new THREE.DirectionalLight(0xE70005, 0.9);
  directionalLight.position.set( 0.5, 0.5, 1 );
  scene.add(directionalLight);

  // POINT LIGHT
  pointLight = new THREE.PointLight( 0xE70005 );
  // pointLight.intensity = 10;
  pointLight.position.set( 0, 0, 100 );
  scene.add( pointLight );

  // AMBIENT LIGHT
  const ambientLight = new THREE.AmbientLight(0x000000, 0.99);
  scene.add(ambientLight);

  // CONTROLS
  controls = new PointerLockControls(camera, document.body);

  // MATERIALS
  materials = generateMaterials();
  current_material = 'matte';

  // MARCHING CUBES

  resolution = 28;

  effect = new MarchingCubes( resolution, materials[ current_material ], true, true, 100000 );
  effect.position.set( 0, 0, 0 );
  effect.scale.set( 2100, 2100, 2100 );

  effect.enableUvs = false;
  effect.enableColors = false;

  scene.add( effect );

  // GUI
  setupGui();

  function generateMaterials() {
    const materials = {
      'matte': new THREE.MeshPhongMaterial( { specular: 0xE70005, shininess: 1 } ),
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

function setupGui() {

  const createHandler = function ( id ) {

    return function () {

      current_material = id;

      effect.material = materials[ id ];
      effect.enableUvs = ( current_material === 'textured' ) ? true : false;
      effect.enableColors = ( current_material === 'colors' || current_material === 'multiColors' ) ? true : false;

    };

  };

  effectController = {

    material: 'matte',

    speed: 5.0,
    numBlobs: 20,
    resolution: 50,
    isolation: 500,

    floor: true,
    wallx: false,
    wallz: false,

    dummy: function () {}

    };
  }



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

  // Insert GLTF or GLB Models
  var mesh, mesh2, mesh3, mesh4, mesh5, mesh6, mesh7;
  const loader = new GLTFLoader();

  loader.load( './assets/blob.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh = gltf.scene;
     mesh.position.set(100,-100, 100);
     mesh.rotation.set(0, 0, 0);
     mesh.scale.set(20, 20, 20); // <-- change this to (1, 1, 1) for photogrammetery model
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
       }
     });
     // set position and scale
     mesh2 = gltf.scene;
     mesh2.position.set(7, 100, 1);
     mesh2.rotation.set(0, 0, 0);
     mesh2.scale.set(10, 10, 10); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh2);

  }, undefined, function ( error ) {

    console.error( error );

  } );

  const loader3 = new GLTFLoader();

  loader.load( './assets/blob3.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh3 = gltf.scene;
     mesh3.position.set(-300, 5, 200);
     mesh3.rotation.set(0, 0, 0);
     mesh3.scale.set(8, 8, 8); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh3);

  }, undefined, function ( error ) {

    console.error( error );

  } );

  const loader4 = new GLTFLoader();

  loader.load( './assets/blob4.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh4 = gltf.scene;
     mesh4.position.set(-200, 100, 500);
     mesh4.rotation.set(0, 0, 0);
     mesh4.scale.set(10, 10, 10); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh4);

  }, undefined, function ( error ) {

    console.error( error );

  } );


  const loader5 = new GLTFLoader();

  loader.load( './assets/blob.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh5 = gltf.scene;
     mesh5.position.set(-400, 10, 500);
     mesh5.rotation.set(30, 100, 0);
     mesh5.scale.set(20, 20, 20); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh5);

  }, undefined, function ( error ) {

    console.error( error );

  } );

  const loader6 = new GLTFLoader();

  loader.load( './assets/blob2.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh6 = gltf.scene;
     mesh6.position.set(-400, -300, 500);
     mesh6.rotation.set(100, 100, 0);
     mesh6.scale.set(50, 50, 50); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh6);

  }, undefined, function ( error ) {

    console.error( error );

  } );

  const loader7 = new GLTFLoader();

  loader.load( './assets/blob4.glb',
   function ( gltf ) {

     gltf.scene.traverse(function(child) {
       if (child.isMesh) {
         objects.push(child);
       }
     });
     // set position and scale
     mesh7 = gltf.scene;
     mesh7.position.set(10, 20, 500);
     mesh7.rotation.set(50, 100, 0);
     mesh7.scale.set(20, 20, 20); // <-- change this to (1, 1, 1) for photogrammetery model
     // Add model to scene
     scene.add(mesh7);

  }, undefined, function ( error ) {

    console.error( error );

  } );



  // // First Image (red and purple glitch map)
  // // Load image as texture
  // const texture = new THREE.TextureLoader().load( '../assets/reality.jpg' );
  // // Immediately use the texture for material creation
  // const material = new THREE.MeshBasicMaterial( { map: texture, side: THREE.DoubleSide } );
  // // Create plane geometry
  // const geometry = new THREE.PlaneGeometry( 500, 500);
  // // Apply image texture to plane geometry
  // const plane = new THREE.Mesh( geometry, material );
  // // Position plane geometry
  // plane.position.set(0 , 15 , -300);
  // // Place plane geometry
  // scene.add( plane );

  var planes = [];
  	var planeImages = ["../assets/text-01.png"];
  	var planeGeometry = new THREE.PlaneGeometry(842, 596);
  	for(var i = 0; i < planeImages.length; i++) {
  		var planeMaterial = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(planeImages[i]), transparent: true, side: THREE.DoubleSide }); // NOTE: specify "transparent: true"
  		planes[i] = new THREE.Mesh(planeGeometry, planeMaterial);
  		planes[i].position.x = 1 * i * (i % 2 == 0 ? -1 : 1);
  		planes[i].position.y = 2 * i * (i % 2 == 0 ? 1 : -1) * 0.25;
  		planes[i].position.z = -2;
      planes[i].position.set(0 , 15 , -300);
  		scene.add(planes[i]);
  	}

  // Define Rendered and html document placement
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  // container.appendChild( renderer.domElement )

  // Listen for window resizing
  window.addEventListener("resize", onWindowResize);
}

// Window resizing function
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
function updateCubes( object, time, numblobs, floor ) {

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

// if ( floor ) object.addPlaneY( 2, 12 );
// if ( wallz ) object.addPlaneZ( 2, 12 );
// if ( wallx ) object.addPlaneX( 2, 12 );

object.update();

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

  // render

    renderer.render(scene, camera);

}
