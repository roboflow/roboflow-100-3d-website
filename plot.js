// Identify the subimage size in px
const IMAGE_SIZES = { width: 128, height: 128 };
// Identify the total number of cols & rows in the image atlas
const ATLAS = { width: 1280, height: 1280, cols: 10, rows: 10 };
// scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const textureLoader = new THREE.TextureLoader();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// add a light
// var light = new THREE.PointLight(0xffffff, .7, 0);
// light.position.set(0, 0, 100);
// scene.add(light)

function getRandomInt() {
    var val = Math.random() * 500;
    return Math.random() > 0.5
        ? -val
        : val;
}


function createImageGeometryForAtlas(data) {
    let { imageSize, atlas } = data
    const geometry = new THREE.BufferGeometry();
    const verticesLenght = 4

    let vertices = []
    let uvs = []
    let indices = []

    for (let i = 0; i < atlas.cols * atlas.rows; i++) {
        coords = {
            x: getRandomInt(),
            y: getRandomInt(),
            z: -400
        };
        vertices.push(
            coords.x, coords.y, coords.z, // bottom left
            coords.x + imageSize.width, coords.y, coords.z, // bottom right
            coords.x + imageSize.width, coords.y + imageSize.height, coords.z, // upper right
            coords.x, coords.y + imageSize.height, coords.z, // upper left,

        )
        // indices = sequence of index positions in `vertices` to use as vertices
        // we make two triangles but only use 4 distinct vertices in the object
        // we need to have the correct offset
        const indicesOffset = (i * 4)
        indices.push(
            indicesOffset,
            indicesOffset + 1,
            indicesOffset + 2,
            indicesOffset,
            indicesOffset + 2,
            indicesOffset + 3
        )
        // Identify this subimage's offset in the x dimension
        // An xOffset of 0 means the subimage starts flush with
        // the left-hand edge of the atlas
        const xOffset = (i % 10) * (imageSize.width / atlas.width);
        // Identify the subimage's offset in the y dimension
        // A yOffset of 0 means the subimage starts flush with
        // the top edge of the atlas
        const yOffset = Math.floor(i / 10) * (imageSize.height / atlas.height);
        // set the uvs for this box; these identify the following corners:
        // lower-left, lower-right, upper-right, upper-left
        uvs.push(
            xOffset, yOffset,
            xOffset + .1, yOffset,
            xOffset + .1, yOffset + .1,
            xOffset, yOffset + .1,
        )
    }

    console.log(vertices)
    // in the first argument per vertex
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    return geometry
}


function createImageGeometry(data) {
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
    const indices = [0, 1, 2, 0, 2, 3]
    // in the first argument per vertex
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    return geometry
}



function crateImageMaterialFromUrl(url) {
    // Load an image file into a MeshBasicMaterial
    const material = new THREE.MeshBasicMaterial({
        map: textureLoader.load(url)
    });

    return material
}

// var url = 'https://s3.amazonaws.com/duhaime/blog/tsne-webgl/assets/cat.jpg';


let imageGeometry = createImageGeometryForAtlas({
    imageSize: { width: 128, height: 128 },
    coords: { x: -5, y: -3.75, z: 0 },
    atlas: ATLAS
})
var url = '/100-img-atlas.jpg'

let imageMaterial = crateImageMaterialFromUrl(url)

// combine the image geometry and material into a mesh
var mesh = new THREE.Mesh(imageGeometry, imageMaterial);

// set the position of the image mesh in the x,y,z dimensions
mesh.position.set(0, 0, 0)

// add the image to the scene
scene.add(mesh);


camera.position.set(0, 1, 400);

function animate() {
    requestAnimationFrame(animate);
    // mesh.rotation.x += 0.01;
    // mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();