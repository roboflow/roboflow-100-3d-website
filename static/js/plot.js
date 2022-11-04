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
const canvas = document.querySelector("#canvas")
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
const textureLoader = new THREE.TextureLoader();
// need to be global since I am referring them around
let cameraNewPosition = new THREE.Vector3(0, 0, 5000)
camera.position.set(0, 0, 5000)
var controls = new THREE.TrackballControls(camera, renderer.domElement);

var namesTomeshes = {};
// inverse map, useful for fast look up
var meshesToNames = {};

function toogleLoader() {

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

    const xGlobalOffset = imageSize.width / config.atlas.width
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
        const yOffset = 1 - Math.floor(i / config.atlas.cols) * yStepSize;
        // set the uvs for this box; these identify the following corners:
        // lower-left, lower-right, upper-right, upper-left
        uvs.push(
            // first point in top-left
            xOffset + xGlobalOffset, yOffset - yGlobalOffset,
            xOffset, yOffset - yGlobalOffset,
            xOffset, yOffset,
            xOffset + xGlobalOffset, yOffset,
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
        fetch(`static/montages/${dataset}/reduced-tsne-k=${dims}-points.json`)
            .then((response) => response.json())
            .then((json) => config.addZNoise ? addZNoise(json) : json)
            .then((json) => {
                mesh = addMeshForAtlas(json, `static/montages/${dataset}/2048-img-atlas_compressed.jpg`)
                namesTomeshes[dataset] = mesh
                meshesToNames[mesh.id] = dataset
            });
    }
}

function findCenter(object) {
    var middle = new THREE.Vector3();
    var geometry = object.geometry;

    geometry.computeBoundingBox();

    middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
    middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
    middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2

    return middle
}

function flyTo(object) {
    var center = findCenter(object)

    const objectInWorldPosition = object.localToWorld(center)
    const objectInCameraPosition = camera.worldToLocal(objectInWorldPosition)
    console.log(objectInWorldPosition, camera.localToWorld(camera.position.clone()))
    camera.position.set(objectInCameraPosition.x, objectInCameraPosition.y, objectInCameraPosition)
    camera.lookAt(object)
    // console.log(objectPosition, camera.position)
    controls.update()
}

function setupThreeJS(datasets) {
    scene.background = new THREE.Color("#202020");
    camera.position.set(cameraNewPosition.x, cameraNewPosition.y, cameraNewPosition.z);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    loadDatasets(config, datasets)

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

function setUpUIControllers(datasets) {
    // open and close sidebar
    const sideBar = document.querySelector("#sidebar")
    const sideBarSuppressed = document.querySelector("#sidebar-suppressed")

    const toggleElement = (element) => {
        if (element.classList.contains("hidden")) element.classList.remove("hidden")
        else element.classList.add("hidden")
    }

    document.querySelector("#sidebar-button-expand").addEventListener("click", () => {
        sideBar.classList.remove("hide")
        sideBar.classList.remove("show")
        sideBar.classList.add("show")
        toggleElement(sideBarSuppressed)
    })

    document.querySelector("#sidebar-button-close").addEventListener("click", () => {
        sideBar.classList.remove("show")
        sideBar.classList.remove("hide")
        sideBar.classList.add("hide")
        toggleElement(sideBarSuppressed)
    })
    // "RESPONSIVE"
    const toggleSideNavBasedOnViewPort = () => {
        const width = window.innerWidth
        if (width <= 1280) {
            if (!sideBar.classList.contains("hide")) {
                // [TODO] this code can be placed in one single function
                sideBar.classList.remove("show")
                sideBar.classList.remove("hide")
                sideBar.classList.add("hide")
            }
            if (sideBarSuppressed.classList.contains("hidden")) sideBarSuppressed.classList.remove("hidden")
        } else {
            if (sideBar.classList.contains("hide")) {
                sideBar.classList.remove("hide")
                sideBar.classList.remove("show")
                sideBar.classList.add("show")
            }
            if (!sideBarSuppressed.classList.contains("hidden")) sideBarSuppressed.classList.add("hidden")
        }
    }
    // toggleSideNavBasedOnViewPort()
    // window.addEventListener('resize', () => toggleSideNavBasedOnViewPort())
    // switch to 2d
    document.querySelector("#dims-2d").addEventListener("click",
        (e) => {
            document.querySelector("#dims-3d").checked = false
            config.dims = 2
            config.spacing = [200, 200, 1]
            config.addZNoise = true
            loadDatasets(config, datasets)
            camera.position.set(0, 0, 10000);
            controls.update();
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
            controls.update();
        }
    )
    // select dataset
    const selector = document.querySelector("#dataset-selector")
    const currentImage = document.querySelector("#current-image")

    for (let dataset of datasets) {
        const option = document.createElement('option');
        option.value = dataset;
        option.innerHTML = dataset;
        selector.appendChild(option);
    }

    // handle logic when selected changes
    selectedDataset = selector.value
    // little helped function
    const setOpacity = (opacity, expectFor) => {
        for (let key in namesTomeshes) {
            if (key == expectFor) continue
            let mesh = namesTomeshes[key]
            mesh.material.opacity = opacity
        }
    }
    selector.addEventListener("change",
        (e) => {
            let newSelectedDataset = e.target.value
            if (newSelectedDataset != selectedDataset) {
                // set opacity to 1 to everyone
                setOpacity(1, null)
                // if not selected "all", set 0.02 to everyone expect what we selected!
                if (newSelectedDataset != "all") setOpacity(0.02, newSelectedDataset)
                selectedDataset = newSelectedDataset
                const mesh = namesTomeshes[newSelectedDataset]
                // camera.position.set(5, 1, 10000);
                console.info(`Switched to ${newSelectedDataset}`)
                currentImage.src = `static/montages/${selectedDataset}/images/0.jpeg`
            }
        })
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2(0, 0);
    let lastMousePosition = {}
    // highlight on click
    const getInteresectedObject = (e) => {
        // from pixel coords to world https://threejs.org/docs/#api/en/core/Raycaster
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        // find where we intersects
        const intersects = raycaster.intersectObjects(Object.values(namesTomeshes))
        return intersects
    }
    canvas.addEventListener("mousedown", (e) => {
        lastMousePosition.x = e.clientX
        lastMousePosition.y = e.clientY
    })
    canvas.addEventListener("mouseup", (e) => {
        // only highlight if we click on them, not if we move around
        const hasMoved = Math.abs((lastMousePosition.x - e.clientX) + (lastMousePosition.y - e.clientY)) > 0
        if (hasMoved) return
        const intersects = getInteresectedObject(e)
        if (intersects.length > 0) {
            const object = intersects[0].object
            // hide the others by dispacthing event to selector
            let meshName = meshesToNames[object.id]
            selector.value = meshName
            selector.dispatchEvent(new Event('change', { "target": { "value": meshName } }))
            // flyTo(object)
            // camera.position.set()
        }
        else {
            selector.value = "all"
            selector.dispatchEvent(new Event('change', { "target": { "value": "all" } }))
            currentImage.src = ""
        }
    })
    // show image on the sidebar on hover 
    const handleMouseMove = (e) => {
        console.log('asddsa')
        const intersects = getInteresectedObject(e)
        if (intersects.length > 0) {
            // hide the others by dispacthing event to selector
            let meshName = meshesToNames[intersects[0].object.id]
            // dive by two since each image is 2 triangles
            const imageIdx = Math.floor(intersects[0].faceIndex / 2)
            currentImage.src = `static/montages/${meshName}/images/${imageIdx}.jpeg`
            selector.value = meshName
        }
    }
    let debounceTimeoutId;
    canvas.addEventListener("mousemove", (e) => {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = setTimeout(() => handleMouseMove(e), 5)
    })
    // reset camera
    const resetCameraBtn = document.querySelector("#reset-camera")
    resetCameraBtn.addEventListener("click", () => {
        // cameraNewPosition = new THREE.Vector3(0, 0, 5000)
        controls.reset();

    })

}

function setUp() {
    fetch(`static/datasets.json`)
        // fetch(`datasets_dummy.json`)
        .then((response) => response.json())
        .then((datasets) => {
            setupThreeJS(datasets)
            setUpUIControllers(datasets)
        })

}

setUp()