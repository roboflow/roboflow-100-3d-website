// Identify the subimage size in px
const IMAGE_SIZES = { width: 32, height: 32 };
// Identify the total number of cols & rows in the image atlas
const ATLAS = { width: 1280, height: 1280, cols: 10, rows: 10 };
// scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const textureLoader = new THREE.TextureLoader();

camera.position.set(0, 1, 400);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var materials = {};

function getRandomInt() {
    var val = Math.random() * 500;
    return Math.random() > 0.5
        ? -val
        : val;
}

function getImageGeometryForAtlas(data) {
    let { imageSize, coords, atlas } = data
    const geometry = new THREE.BufferGeometry();

    let vertices = []
    let uvs = []
    let indices = []

    for (let i = 0; i < atlas.cols * atlas.rows; i++) {
        const { x, y, z } = coords[i]
        vertices.push(
            x, y, z, // bottom left
            x + imageSize.width, y, z, // bottom right
            x + imageSize.width, y + imageSize.height, z, // upper right
            x, y + imageSize.height, z, // upper left,

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
    // in the first argument per vertex
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    return geometry
}


function getImageMaterialFromUrl(url) {
    // Load an image file into a MeshBasicMaterial
    const material = new THREE.MeshBasicMaterial({
        map: textureLoader.load(url)
    });

    return material
}

// var url = 'https://s3.amazonaws.com/duhaime/blog/tsne-webgl/assets/cat.jpg';

let coords = []

for (let i = 0; i < 100; i++) {
    coords.push(
        {
            x: getRandomInt(),
            y: getRandomInt(),
            z: -400
        }
    )
}

let imageGeometry = getImageGeometryForAtlas({
    imageSize: { width: 128, height: 128 },
    coords,
    atlas: ATLAS
})

var url = '/100-img-atlas.jpg'

let imageMaterial = getImageMaterialFromUrl(url)

// combine the image geometry and material into a mesh
var mesh = new THREE.Mesh(imageGeometry, imageMaterial);

// set the position of the image mesh in the x,y,z dimensions
mesh.position.set(0, 0, 0)

// add the image to the scene
scene.add(mesh);


function animate() {
    requestAnimationFrame(animate);
    // mesh.rotation.x += 0.01;
    // mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();