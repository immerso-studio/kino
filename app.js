// --- CONFIGURAZIONI IMMERSAL ---
const IMMERSAL_TOKEN = "4123b556a9f96f088b1469f2d9fb0fd2e85c67a8b0031637654c09d4b07cd130";
const MAP_ID = 146427;

// Elementi DOM
const videoElement = document.getElementById('camera-feed');
const captureCanvas = document.getElementById('hidden-capture-canvas');
const ctx = captureCanvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const uiOverlay = document.getElementById('ui-overlay');
const statusIndicator = document.getElementById('status-indicator');

// Variabili globali Three.js
let scene, camera, renderer, renderGroup;
let isLocalized = false;
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

// --- 1. INIZIALIZZAZIONE SCENA THREE.JS ---
function initThree() {
    scene = new THREE.Scene();
    
    // Telecamera fissa al centro, ruoterà solo con il giroscopio
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('ar-canvas'),
        alpha: true, // Trasparente per vedere il video sotto
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Questo gruppo rappresenta l'intero ambiente scansionato (la Mappa)
    renderGroup = new THREE.Group();
    scene.add(renderGroup);

    // Funzione helper per creare i cubi di test
    function createTestCube(colorHex, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4); // Cubi da 40cm
        const material = new THREE.MeshBasicMaterial({ color: colorHex });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        
        // Aggiungiamo un contorno per vederli meglio sul video
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        cube.add(line);
        
        renderGroup.add(cube);
    }

    // --- POSIZIONAMENTO DEI 6 CUBI DI TEST ---
    // Il punto (0,0,0) corrisponde al punto in cui ti trovavi quando hai iniziato la scansione Immersal
    createTestCube(0xff0000, 0, 0, 0);    // ROSSO: Centro Esatto (Origine Mappa)
    createTestCube(0x0000ff, 0, 0, -2);   // BLU: 2 metri "Avanti"
    createTestCube(0x00ffff, 0, 0, 2);    // CIANO: 2 metri "Dietro"
    createTestCube(0x00ff00, 2, 0, 0);    // VERDE: 2 metri a "Destra"
    createTestCube(0xffff00, -2, 0, 0);   // GIALLO: 2 metri a "Sinistra"
    createTestCube(0xff00ff, 0, 1, 0);    // MAGENTA: 1 metro in "Alto" (rispetto al centro)

    // Nascondiamo tutto finché non riceviamo le coordinate dal VPS
    renderGroup.visible = false;

    // Gestione ridimensionamento finestra
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Rotazione della telecamera basata sui sensori dello smartphone
    if (deviceOrientation) {
        const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha);
        const beta = THREE.MathUtils.degToRad(deviceOrientation.beta);
        const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma);

        camera.rotation.set(beta, gamma, alpha, 'YXZ');
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 2. GESTIONE FOTOCAMERA NATIVA ---
async function startCamera() {
    statusIndicator.innerText = "Avvio fotocamera...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            // Quando il video parte, avvia la scansione verso Immersal
            startLocalizationLoop();
        };
    } catch (err) {
        console.error("Impossibile accedere alla fotocamera:", err);
        statusIndicator.innerText = "Errore fotocamera. Ricarica e accetta i permessi.";
    }
}

// --- 3. ATTIVAZIONE SENSORI ORIENTAMENTO ---
function initSensors() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

function handleOrientation(event) {
    deviceOrientation.alpha = event.alpha || 0;
    deviceOrientation.beta = event.beta || 0;
    deviceOrientation.gamma = event.gamma || 0;
}

// --- 4. COMUNICAZIONE REST API CON IMMERSAL ---
async function localizeFrame() {
    if (isLocalized) return;

    statusIndicator.innerText = "Scansione ambiente...";

    // Disegna il frame corrente sul canvas invisibile ed estrai il Base64
    ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
    const base64Image = captureCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

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
            console.log("Localizzazione riuscita! Coordinate Ricevute:", data);
            isLocalized = true;
            statusIndicator.innerText = "Mappa ancorata!";
            statusIndicator.style.backgroundColor = "#00ff00";
            statusIndicator.style.color = "#000";

            // MATEMATICA DI POSIZIONAMENTO
            // Immersal ci dice dove si trova il telefono rispetto all'origine della mappa.
            // Dato che in Three.js la nostra camera è ferma, muoviamo l'intero renderGroup (la Mappa)
            // in direzione opposta rispetto alla telecamera per allineare i due mondi.
            
            renderGroup.position.set(-data.px, -data.py, data.pz);
            
            // Rendiamo visibili i cubi
            renderGroup.visible = true; 
        } else {
            // Se fallisce, continua silenziosamente nel loop
            statusIndicator.innerText = "Guarda l'ambiente scansionato...";
        }
    } catch (error) {
        console.error("Errore VPS:", error);
    }
}

// Loop che interroga il server ogni 2 secondi
function startLocalizationLoop() {
    const loop = setInterval(() => {
        if (isLocalized) {
            clearInterval(loop);
        } else {
            localizeFrame();
        }
    }, 2000);
}

// --- AVVIO FORMALE ---
startBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    initThree();
    initSensors();
    startCamera();
});