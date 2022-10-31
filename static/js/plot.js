// shared config, used as a state that is passed around and edited on the fly
// not the best way to manage state, but it works
var config = {
    dims: 2,
    spacing: [200, 200, 1],
    imageSize: { width: 64, height: 64 },
    atlas: { width: 2048, height: 1024, cols: 32, rows: 16 },
    addZNoise: true
}

// scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.querySelector("#canvas") });
const textureLoader = new THREE.TextureLoader();

var meshes = {};

function toogleLoader(){

}

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
    // console.log(coords.length, config.atlas.cols)
    const rows = Math.ceil(coords.length / config.atlas.cols)
    const atlasHeight = imageSize.height * rows

    const xStepSize = (imageSize.width / atlas.width)
    const yStepSize = (imageSize.height / atlasHeight)

    const xGlobalOffset = imageSize.width /  config.atlas.width 
    const yGlobalOffset = imageSize.height / atlasHeight

    for (let i = 0; i < coords.length; i++) {
        let { x, y, z } = coords[i]
        x *= config.spacing[0]
        y *= config.spacing[1]
        z = (z + 50) * config.spacing[2]
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
        // This is the hardest part of all the code base
        // find the number of columns and moltiply by how many unit of images we have
        //  e.g, we are on the second column, we need to have xs in "atlas" coordinates
        const xOffset = (i % config.atlas.cols) * xStepSize
        // same for y
        const yOffset =  Math.floor(i / config.atlas.cols) * yStepSize;
        // set the uvs for this box; these identify the following corners:
        // lower-left, lower-right, upper-right, upper-left
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
        map: textureLoader.load(url),
        transparent: true,

    });

    return material
}

function addMeshForAtlas(coords, url) {
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

    return mesh
}

function addZNoise(data) {
    for (let el of data) {
        el.z *= getRandomInt() / 10
    }

    return data
}

function loadDatasets({ dims }, datasets) {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    for (let dataset of datasets) {
        console.info(`Loading ${dataset}`)
        fetch(`/static/montages/${dataset}/reduced-tsne-k=${dims}-points.json`)
            .then((response) => response.json())
            .then((json) => config.addZNoise ? addZNoise(json) : json)
            .then((json) => {
                mesh = addMeshForAtlas(json, `/static/montages/${dataset}/2048-img-atlas.jpg`)
                meshes[dataset] = mesh
            });
    }
}

function setUpUIControllers(datasets) {
    // switch to 2d
    document.querySelector("#dims-2d").addEventListener("click",
        (e) => {
            document.querySelector("#dims-3d").checked = false
            config.dims = 2
            config.spacing = [200, 200, 1]
            config.addZNoise = true
            loadDatasets(config, datasets)
            camera.position.set(0, 0, 10000);
        }
    )
    //  switch to 3d
    document.querySelector("#dims-3d").addEventListener("click",
        (e) => {
            document.querySelector("#dims-2d").checked = false
            config.dims = 3
            config.spacing = [200, 200, 200]
            config.addZNoise = false
            loadDatasets(config, datasets)
            camera.position.set(0, 0, 10000);
        }
    )
    // select dataset
    const selector = document.querySelector("#dataset-selector")

    for (let dataset of datasets){
        const option = document.createElement('option');
        option.value = dataset;
        option.innerHTML = dataset;
        selector.appendChild(option);
    }

    // handle logic when selected changes
    selectedDataset = selector.value
    selector.addEventListener("change", 
    (e) => {
        let newSelectedDataset = e.target.value
        if (newSelectedDataset != selectedDataset) {
            // little helped function
            const setOpacity = (opacity, expectFor) => {
                for(let key in meshes){
                    if (key == expectFor) continue
                    let mesh = meshes[key]
                    mesh.material.opacity = opacity
                }
            }
            // set opacity to 1 to everyone
            setOpacity(1, null)
            // if not selected "all", set 0.02 to everyone expect what we selected!
            if(newSelectedDataset != "all") setOpacity(0.02, newSelectedDataset)
            selectedDataset = newSelectedDataset
            const mesh = meshes[newSelectedDataset]
            // camera.position.set(5, 1, 10000);
            console.info(`Switched to ${newSelectedDataset}`)
        }
    })
}

function setupThreeJS(datasets) {
    scene.background = new THREE.Color("#202020");
    camera.position.set(0, 0, 5000);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    loadDatasets(config, datasets)

    var controls = new THREE.TrackballControls(camera, renderer.domElement);

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        controls.handleResize();
    });



    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        controls.update();

    }
    animate()
}

function setUp() {
    fetch(`/static/datasets.json`)
        .then((response) => response.json())
        .then((datasets) => {
            setupThreeJS(datasets)
            setUpUIControllers(datasets)
        })

}

setUp()