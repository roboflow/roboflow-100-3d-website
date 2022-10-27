
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// add a light
var light = new THREE.PointLight(0xffffff, .7, 0);
light.position.set(0, 0, 100);

scene.add(light)


function create_image_geometry(data) {
    let { imageSize, coords } = data;
    const geometry = new THREE.BufferGeometry();

    // Add one vertex for each corner of the image, using the 
    // following order: lower left, lower right, upper right, upper left
    var vertices = new Float32Array([
        coords.x, coords.y, coords.z, // bottom left
        coords.x + imageSize.width, coords.y, coords.z, // bottom right
        coords.x + imageSize.width, coords.y + imageSize.height, coords.z, // upper right
        coords.x, coords.y + imageSize.height, coords.z, // upper left,
        
    ])

    // set the uvs for this box; these identify the following corners:
    // lower-left, lower-right, upper-right, upper-left
    var uvs = new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
    ])
    // indices = sequence of index positions in `vertices` to use as vertices
    // we make two triangles but only use 4 distinct vertices in the object
    // the second argument to THREE.BufferAttribute is the number of elements
    const verticesLenght = 4
    const indices = [
        verticesLenght-4,
        verticesLenght-3,
        verticesLenght-2,
        verticesLenght-4,
        verticesLenght-2,
        verticesLenght-1
    ]
    // in the first argument per vertex
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    return geometry
}

image_geometry = create_image_geometry({
    imageSize: { width: 10, height: 7.5 },
    coords: { x: -5, y: -3.75, z: 0 }
})

var loader = new THREE.TextureLoader();

// Specify the path to an image
var url = 'https://s3.amazonaws.com/duhaime/blog/tsne-webgl/assets/cat.jpg';

// Load an image file into a MeshBasicMaterial
var material = new THREE.MeshBasicMaterial({
    map: loader.load(url)
});

// combine the image geometry and material into a mesh
var mesh = new THREE.Mesh(image_geometry, material);

// set the position of the image mesh in the x,y,z dimensions
mesh.position.set(0, 0, 0)

// add the image to the scene
scene.add(mesh);


camera.position.set(0, 1, 10);

function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
}
// animate();