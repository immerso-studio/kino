// --- CONFIGURAZIONI IMMERSAL (Inserite le tue credenziali) ---
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
    
    // Telecamera con FOV standard per smartphone
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('ar-canvas'),
        alpha: true, // Sfondo trasparente per vedere il video sotto
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Creiamo un Gruppo Ancoraggio. Sposteremo questo gruppo quando Immersal risponde.
    renderGroup = new THREE.Group();
    scene.add(renderGroup);

    // --- CREAZIONE CUBO ROSSO AL CENTRO ---
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5); // Cubo di 50cm
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rosso puro
    const cube = new THREE.Mesh(geometry, material);
    
    // Posizioniamo il cubo all'origine del nostro gruppo
    cube.position.set(0, 0, 0); 
    renderGroup.add(cube);

    // Nascondiamo il gruppo finché la stanza non viene localizzata
    renderGroup.visible = false;

    // Gestione ridimensionamento finestra
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Applichiamo i dati del giroscopio del telefono alla telecamera 3D per renderla fluida
    if (deviceOrientation) {
        const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha);
        const beta = THREE.MathUtils.degToRad(deviceOrientation.beta);
        const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma);

        // Orientamento base per smartphone (corregge l'asse di rotazione)
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
                facingMode: 'environment', // Fotocamera posteriore
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            // Avvia il ciclo di scansione VPS
            startLocalizationLoop();
        };
    } catch (err) {
        console.error("Impossibile accedere alla fotocamera:", err);
        statusIndicator.innerText = "Errore fotocamera. Controlla i permessi HTTPS.";
    }
}

// --- 3. ATTIVAZIONE SENSORI ORIENTAMENTO (iOS richiede autorizzazione esplicita) ---
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
    deviceOrientation.alpha = event.alpha || 0; // Rotazione Z (bussola)
    deviceOrientation.beta = event.beta || 0;   // Inclinazione X (avanti/dietro)
    deviceOrientation.gamma = event.gamma || 0; // Inclinazione Y (sinistra/destra)
}

// --- 4. COMUNICAZIONE CON LE REST API DI IMMERSAL ---
async function localizeFrame() {
    if (isLocalized) return;

    statusIndicator.innerText = "Analisi stanza (VPS)...";

    // "Rubiamo" il frame corrente dal video e lo stampiamo sul canvas nascosto
    ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
    
    // Estraiamo la stringa Base64 pura (rimuovendo il prefisso dei dati)
    const base64Image = captureCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    // Payload per Immersal
    const payload = {
        token: IMMERSAL_TOKEN,
        b64: base64Image,
        mapIds: [{ id: parseInt(MAP_ID) }],
        // Parametri intrinseci della fotocamera (valori standard approssimati per mobile)
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
            console.log("Localizzazione riuscita!", data);
            isLocalized = true;
            statusIndicator.innerText = "Stanza Riconosciuta!";
            statusIndicator.style.backgroundColor = "#00ff00";
            statusIndicator.style.color = "#000";

            // Posizioniamo il gruppo 3D basandoci sulle coordinate reali restituite da Immersal
            // Nota: Se il cubo appare invertito, potrebbe essere necessario invertire un asse (es. -data.pz)
            renderGroup.position.set(data.px, data.py, data.pz);
            
            // Se Immersal restituisce la rotazione della mappa (matrice o quaternione r00..r22)
            // puoi applicarla al gruppo qui per orientare il mondo.
            
            renderGroup.visible = true; // Mostriamo finalmente il cubo rosso
        } else {
            statusIndicator.innerText = "Stanza non riconosciuta. Guarda i dettagli dell'ambiente.";
        }
    } catch (error) {
        console.error("Errore VPS:", error);
        statusIndicator.innerText = "Errore di connessione al server Immersal.";
    }
}

function startLocalizationLoop() {
    // Prova a localizzare l'ambiente ogni 2.5 secondi finché non fa centro
    const loop = setInterval(() => {
        if (isLocalized) {
            clearInterval(loop);
        } else {
            localizeFrame();
        }
    }, 2500);
}

// --- AVVIO FORMALE TRAMITE BOTTONE ---
startBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none'; // Nascondi la schermata iniziale
    initThree();
    initSensors();
    startCamera();
});