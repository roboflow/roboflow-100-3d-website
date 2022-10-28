var config = {
    dims: 2,
    spacing: [200, 200, 1],
    imageSize: { width: 64, height: 64 },
    atlas: { width: 2048, height: 2048, cols: 32, rows: 32 },
    addZNoise: true
}

// scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000000);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector("#canvas")});
const textureLoader = new THREE.TextureLoader();

camera.position.set(0, 1, 10000);
renderer.setSize(window.innerWidth, window.innerHeight);

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
        let { x, y, z } = coords[i]
        x *= config.spacing[0]
        y *= config.spacing[1]
        z *= config.spacing[2]
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
        const xOffset = (i % config.atlas.cols) * (imageSize.width / atlas.width);
        // Identify the subimage's offset in the y dimension
        // A yOffset of 0 means the subimage starts flush with
        // the top edge of the atlas
        const yOffset = Math.floor(i / config.atlas.rows) * (imageSize.height / atlas.height);
        // set the uvs for this box; these identify the following corners:
        // lower-left, lower-right, upper-right, upper-left
        const xGlobalOffset = config.atlas.cols / 1000;
        const yGlobalOffset = config.atlas.rows / 1000;
        uvs.push(
            xOffset, yOffset,
            xOffset + xGlobalOffset, yOffset,
            xOffset + xGlobalOffset, yOffset + yGlobalOffset,
            xOffset, yOffset + yGlobalOffset,
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

function addMeshForAtlas(coords, url){
    let imageGeometry = getImageGeometryForAtlas({
        imageSize: config.imageSize,
        coords,
        atlas: config.atlas
    })


    let imageMaterial = getImageMaterialFromUrl(url)

    // combine the image geometry and material into a mesh
    var mesh = new THREE.Mesh(imageGeometry, imageMaterial);

    // set the position of the image mesh in the x,y,z dimensions
    mesh.position.set(coords[0].x, coords[0].y, coords[0].z)

    // add the image to the scene
    scene.add(mesh);
}

function addZNoise(data){
    console.log("addZNoise")
    for (let el of data){
        el.z *= getRandomInt() / 10
    }

    return data
}

function loadData({dims}){
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    for(let i = 1; i < 39; i++){
        fetch(`./montages/${i}/reduced-tsne-k=${dims}-points.json`)
            .then((response) => response.json())
            .then((json) => config.addZNoise ? addZNoise(json) : json)
            .then((json) => addMeshForAtlas(json, `/montages/${i}/2048-img-atlas.jpg`));
    }
}

function setUpUIControllers(){
    document.querySelector("#dims-2d").addEventListener("click", 
        (e) => {
            document.querySelector("#dims-3d").checked = false
            config.dims = 2
            config.spacing = [200, 200, 1]
            config.addZNoise = true
            loadData(config)
        }
    )

    document.querySelector("#dims-3d").addEventListener("click", 
        (e) => {
            document.querySelector("#dims-2d").checked = false
            config.dims = 3
            config.spacing = [200, 200, 200]
            config.addZNoise = false
            loadData(config)
        }
    )
}

function setupThreeJS(){
    loadData(config)

    var controls = new THREE.TrackballControls(camera, renderer.domElement);

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
        controls.handleResize();
      });
      
    

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        controls.update();

    }
    animate()
}


setupThreeJS()
setUpUIControllers()