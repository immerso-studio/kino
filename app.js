// --- CONFIGURAZIONI IMMERSAL ---
const IMMERSAL_TOKEN = "4123b556a9f96f088b1469f2d9fb0fd2e85c67a8b0031637654c09d4b07cd130";
const MAP_ID = 146427;

const videoElement = document.getElementById('camera-feed');
const captureCanvas = document.getElementById('hidden-capture-canvas');
const ctx = captureCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const uiOverlay = document.getElementById('ui-overlay');
const statusIndicator = document.getElementById('status-indicator');

let scene, camera, renderer, renderGroup;
let isLocalized = false;
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

// Variabili per il movimento fluido (Lerp)
let targetPosition = new THREE.Vector3(); // La posizione reale calcolata da Immersal
let currentPosition = new THREE.Vector3(); // La posizione attuale del gruppo 3D

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('ar-canvas'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderGroup = new THREE.Group();
    scene.add(renderGroup);

    function createTestCube(colorHex, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const material = new THREE.MeshBasicMaterial({ color: colorHex });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        cube.add(line);
        
        renderGroup.add(cube);
    }

    createTestCube(0xff0000, 0, 0, 0);    // Rosso: Centro
    createTestCube(0x0000ff, 0, 0, -2);   // Blu: Avanti
    createTestCube(0x00ffff, 0, 0, 2);    // Ciano: Dietro
    createTestCube(0x00ff00, 2, 0, 0);    // Verde: Destra
    createTestCube(0xffff00, -2, 0, 0);   // Giallo: Sinistra
    createTestCube(0xff00ff, 0, 1, 0);    // Magenta: In alto

    renderGroup.visible = false;
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // 1. ROTAZIONE (3DoF) - Gestita velocemente dal giroscopio
    if (deviceOrientation) {
        const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha);
        const beta = THREE.MathUtils.degToRad(deviceOrientation.beta);
        const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma);
        camera.rotation.set(beta, gamma, alpha, 'YXZ');
    }

    // 2. TRASLAZIONE (6DoF simulato) - Muove fluidamente la mappa verso la posizione corretta
    if (isLocalized) {
        // Il Lerp calcola un punto intermedio, creando un movimento morbido (0.1 è la velocità di "scivolamento")
        currentPosition.lerp(targetPosition, 0.1); 
        renderGroup.position.copy(currentPosition);
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function startCamera() {
    statusIndicator.innerText = "Avvio fotocamera...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            startLocalizationLoop();
        };
    } catch (err) {
        statusIndicator.innerText = "Errore fotocamera.";
    }
}

function initSensors() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(permissionState => {
            if (permissionState === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        }).catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function handleOrientation(event) {
    deviceOrientation.alpha = event.alpha || 0;
    deviceOrientation.beta = event.beta || 0;
    deviceOrientation.gamma = event.gamma || 0;
}

// Chiamata API ottimizzata per essere eseguita ripetutamente
async function localizeFrame() {
    if(!videoElement.videoWidth) return; // Aspetta che il video sia pronto

    ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
    // Abbassiamo leggermente la qualità jpeg (0.6) per fare invii più veloci
    const base64Image = captureCanvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    const payload = {
        token: IMMERSAL_TOKEN,
        b64: base64Image,
        mapIds: [{ id: parseInt(MAP_ID) }],
        fx: captureCanvas.width * 1.2,
        fy: captureCanvas.width * 1.2,
        ox: captureCanvas.width / 2,
        oy: captureCanvas.height / 2
    };

    try {
        const response = await fetch('https://api.immersal.com/localizeb64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success && data.px !== undefined) {
            // Se è la primissima volta, rendiamo visibile il gruppo
            if (!isLocalized) {
                isLocalized = true;
                renderGroup.visible = true;
                statusIndicator.style.backgroundColor = "#00ff00";
                statusIndicator.style.color = "#000";
                
                // Setta la posizione immediatamente per il primo frame
                currentPosition.set(-data.px, -data.py, data.pz);
            }
            
            statusIndicator.innerText = "Tracciamento in corso...";

            // Aggiorna la posizione target. L'animazione in 'animate()' farà il resto
            targetPosition.set(-data.px, -data.py, data.pz);
        } else {
            if(isLocalized) {
               statusIndicator.innerText = "Tracciamento perso... Guarda la mappa."; 
            }
        }
    } catch (error) {
        console.error("Errore API Immersal:", error);
    }
}

function startLocalizationLoop() {
    // Abbiamo rimosso il 'clearInterval'. Ora scatta una foto ogni 1 secondo (1000ms) all'infinito!
    setInterval(() => {
        localizeFrame();
    }, 1000); 
}

startBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    initThree();
    initSensors();
    startCamera();
});