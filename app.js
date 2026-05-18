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

// --- 1. SETUP THREE.JS E WEBXR ---
function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('ar-canvas'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // ABILITIAMO WEBXR (ARCore / ARKit)
    renderer.xr.enabled = true;

    renderGroup = new THREE.Group();
    scene.add(renderGroup);

    // Creazione dei cubi di test
    function createTestCube(colorHex, x, y, z) {
        const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const material = new THREE.MeshBasicMaterial({ color: colorHex });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        cube.add(line);
        renderGroup.add(cube);
    }

    createTestCube(0xff0000, 0, 0, 0);    // Rosso: Centro Origine
    createTestCube(0x0000ff, 0, 0, -2);   // Blu: Avanti
    createTestCube(0x00ffff, 0, 0, 2);    // Ciano: Dietro
    createTestCube(0x00ff00, 2, 0, 0);    // Verde: Destra
    createTestCube(0xffff00, -2, 0, 0);   // Giallo: Sinistra
    createTestCube(0xff00ff, 0, 1, 0);    // Magenta: Alto

    renderGroup.visible = false;
    window.addEventListener('resize', onWindowResize);
    
    // WebXR richiede setAnimationLoop invece di requestAnimationFrame
    renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 2. FASE "SCOUT": RICERCA DELLA STANZA ---
async function startCameraAndLocalize() {
    statusIndicator.innerText = "Inizializzazione sensori...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            captureCanvas.width = videoElement.videoWidth;
            captureCanvas.height = videoElement.videoHeight;
            // Eseguiamo una singola ricerca forzata finché non trova la stanza
            findRoomLoop();
        };
    } catch (err) {
        statusIndicator.innerText = "Errore fotocamera.";
    }
}

function findRoomLoop() {
    statusIndicator.innerText = "Guarda la stanza. Sto calcolando lo spazio...";
    
    ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
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

    fetch('https://api.immersal.com/localizeb64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.px !== undefined) {
            // STANZA TROVATA!
            statusIndicator.style.backgroundColor = "#00ff00";
            statusIndicator.style.color = "#000";
            statusIndicator.innerText = "Stanza riconosciuta! Resta fermo e avvia AR.";

            // 1. Applichiamo l'offset alla mappa.
            // (La telecamera di WebXR partirà da 0,0,0 nel momento in cui l'utente premerà il bottone.
            //  Quindi spostiamo la mappa rispetto a dove si trova il telefono ORA).
            renderGroup.position.set(-data.px, -data.py, data.pz);
            renderGroup.visible = true;

            // 2. Fermiamo il video in background per liberare memoria
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.style.display = 'none';

            // 3. Generiamo il bottone nativo WebXR (ARCore/ARKit)
            const arBtn = THREE.ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
            document.body.appendChild(arBtn);
            
            // Il bottone di default di Three.js viene posizionato in basso al centro
            arBtn.addEventListener('click', () => {
                statusIndicator.style.display = 'none'; // Nascondiamo le info quando entra in AR
            });

        } else {
            // Riprova dopo 1 secondo se non riconosce la stanza
            setTimeout(findRoomLoop, 1000);
        }
    })
    .catch(err => console.error(err));
}

// --- AVVIO APP ---
startBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    initThree();
    startCameraAndLocalize();
});