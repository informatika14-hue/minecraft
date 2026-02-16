console.log('🎮 Minecraft 3D - Loading...');

// Scéna
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 300, 1000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB);
document.body.appendChild(renderer.domElement);

// Osvětlení
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(100, 100, 100);
scene.add(directionalLight);

console.log('✓ Scéna připravena');

// Hráč
const player = {
    position: new THREE.Vector3(0, 50, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: true,
    canJump: true
};

const keys = { w: false, a: false, s: false, d: false };
let isPaused = false;
const blocks = {};

// Barvy
const colors = {
    stone: 0x808080,
    dirt: 0x8B7355,
    grass: 0x228B22,
    sand: 0xF4A460,
    wood: 0xA0522D,
    black: 0x000000
};

let selectedBlock = 'dirt';

// LocalStorage funkce
function saveGame() {
    const gameData = {
        blocks: blocks,
        player: {
            position: { x: player.position.x, y: player.position.y, z: player.position.z },
            yaw: player.yaw,
            pitch: player.pitch
        },
        selectedBlock: selectedBlock
    };
    localStorage.setItem('minecraftGame', JSON.stringify(gameData));
}

function loadGame() {
    const saved = localStorage.getItem('minecraftGame');
    if (saved) {
        try {
            const gameData = JSON.parse(saved);
            
            // Načtení bloků
            if (gameData.blocks) {
                Object.keys(blocks).forEach(key => {
                    scene.remove(blocks[key].mesh);
                });
                blocks = {};
                
                for (let key in gameData.blocks) {
                    const b = gameData.blocks[key];
                    createBlock(b.x, b.y, b.z, b.type);
                }
            }
            
            // Načtení pozice hráče
            if (gameData.player) {
                player.position.set(gameData.player.position.x, gameData.player.position.y, gameData.player.position.z);
                player.yaw = gameData.player.yaw;
                player.pitch = gameData.player.pitch;
            }
            
            // Načtení vybraného bloku
            if (gameData.selectedBlock) {
                selectedBlock = gameData.selectedBlock;
                updateBlockDisplay();
            }
            
            console.log('✓ Hra načtena z localStorage');
        } catch (e) {
            console.error('Chyba při načítání hry:', e);
        }
    }
}

function updateBlockDisplay() {
    const blockUI = document.getElementById('selectedBlockDisplay');
    if (blockUI) {
        blockUI.textContent = `Vybraný blok: ${selectedBlock}`;
        blockUI.style.backgroundColor = colors[selectedBlock];
    }
}

// Vytvoření bloku
function createBlock(x, y, z, type, indestructible = false) {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    if (blocks[key]) return;
    
    const geo = new THREE.BoxGeometry(10, 10, 10);
    const mat = new THREE.MeshPhongMaterial({ color: colors[type] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    blocks[key] = { mesh, type, x, y, z, indestructible };
}

// Generování terénu
console.log('📍 Generuji terén...');
for (let x = -200; x <= 200; x += 10) {
    for (let z = -200; z <= 200; z += 10) {
        const h = Math.sin(x * 0.02) * 20 + 30;
        for (let y = 0; y < h; y += 10) {
            let t = 'stone';
            if (y > h - 10) t = 'grass';
            else if (y > h - 20) t = 'dirt';
            createBlock(x, y, z, t);
        }
    }
}
console.log(`✓ Terénu hotov! Bloků: ${Object.keys(blocks).length}`);

// Pokus načíst uloženou hru
loadGame();

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    player.yaw -= (e.movementX || 0) * 0.01;
    player.pitch -= (e.movementY || 0) * 0.01;
    player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
});

// Klik
document.addEventListener('click', (e) => {
    raycaster.setFromCamera(mouse, camera);
    const meshes = Object.values(blocks).map(b => b.mesh);
    const hits = raycaster.intersectObjects(meshes);
    
    if (hits.length > 0) {
        const hit = hits[0].object;
        
        for (let key in blocks) {
            if (blocks[key].mesh === hit) {
                if (e.button === 0) {
                    // Levé = smazat (pokud není neničitelný)
                    if (!blocks[key].indestructible) {
                        scene.remove(hit);
                        delete blocks[key];
                        saveGame();
                    }
                } else if (e.button === 2) {
                    // Pravé = stavit
                    const pos = hits[0].point.clone().add(hits[0].face.normal.multiplyScalar(5));
                    const newBlockX = Math.round(pos.x/10)*10;
                    const newBlockY = Math.round(pos.y/10)*10;
                    const newBlockZ = Math.round(pos.z/10)*10;
                    
                    // Zkontroluj, zda by se blok překrýval s hráčem
                    const playerDist = Math.sqrt(
                        Math.pow(player.position.x - newBlockX, 2) +
                        Math.pow(player.position.y - newBlockY, 2) +
                        Math.pow(player.position.z - newBlockZ, 2)
                    );
                    
                    if (playerDist > 15) {
                        createBlock(newBlockX, newBlockY, newBlockZ, selectedBlock);
                        saveGame();
                    }
                }
                break;
            }
        }
    }
});

document.addEventListener('contextmenu', e => e.preventDefault());

// Klávesy
document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    
    const bMap = {'1':'stone', '2':'dirt', '3':'grass', '4':'sand', '5':'wood'};
    if (bMap[key]) {
        selectedBlock = bMap[key];
        updateBlockDisplay();
        saveGame();
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (player.onGround) {
            player.velocity.y = 4.5;
            player.onGround = false;
        }
    }
});

document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
});

// Pointer lock
document.addEventListener('click', () => {
    if (!isPaused) {
        document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
        document.body.requestPointerLock?.();
    }
});

// ESC - Pauza
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        e.preventDefault();
        isPaused = !isPaused;
        
        const pauseScreen = document.getElementById('pauseScreen');
        if (isPaused) {
            pauseScreen.classList.add('active');
            document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
            document.exitPointerLock?.();
        } else {
            pauseScreen.classList.remove('active');
            document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            document.body.requestPointerLock?.();
        }
    }
});

// Update
let saveCounter = 0;
function update() {
    // Pokud je pauza, nic neděláme
    if (isPaused) return;
    
    // Pohyb
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.yaw, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, player.yaw, 0));
    
    if (keys.w) player.position.addScaledVector(forward, 0.3);
    if (keys.s) player.position.addScaledVector(forward, -0.3);
    if (keys.a) player.position.addScaledVector(right, -0.3);
    if (keys.d) player.position.addScaledVector(right, 0.3);
    
    // Gravitace
    player.velocity.y -= 0.25;
    player.position.y += player.velocity.y;
    
    // Kolize
    player.onGround = false;
    
    for (let key in blocks) {
        const b = blocks[key];
        const dx = player.position.x - b.x;
        const dy = player.position.y - b.y;
        const dz = player.position.z - b.z;
        
        // AABB (axis-aligned bounding box) kolize
        // Kontroluj pouze Y osu pro detekci podlahy
        if (Math.abs(dx) < 10 && Math.abs(dy) < 12 && Math.abs(dz) < 10) {
            // Stojí na bloku (je nad ním)
            if (dy >= 8 && player.velocity.y <= 0) {
                player.position.y = b.y + 15;
                player.velocity.y = 0;
                player.onGround = true;
            }
            // Narazil do stropu
            else if (dy <= -8 && player.velocity.y > 0) {
                player.position.y = b.y - 15;
                player.velocity.y = 0;
            }
        }
    }
    
    // Horizontální kolize - zabránění průchodu skrz bloky
    for (let key in blocks) {
        const b = blocks[key];
        const dx = player.position.x - b.x;
        const dy = player.position.y - b.y;
        const dz = player.position.z - b.z;
        
        // Pokud je hráč uvnitř bloku horizontálně
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Math.abs(dz) < 10) {
            // Zjisti, která osa je nejblíže hraně
            const distX = 10 - Math.abs(dx);
            const distZ = 10 - Math.abs(dz);
            
            if (distX < distZ) {
                // Blok je blíž v X ose - vytlač doleva/doprava
                player.position.x = b.x + (dx > 0 ? 10 : -10);
            } else {
                // Blok je blíž v Z ose - vytlač dopředu/dozadu
                player.position.z = b.z + (dz > 0 ? 10 : -10);
            }
        }
    }
    
    // Respawn
    if (player.position.y < -100) player.position.set(0, 50, 0);
    
    // Kamera
    camera.position.copy(player.position);
    camera.quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
    
    // Periodické ukládání (každých 60 snímků)
    saveCounter++;
    if (saveCounter >= 60) {
        saveGame();
        saveCounter = 0;
    }
}

// Animace
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
console.log('✅ MINECRAFT SPUŠTĚN! WASD=pohyb, Space=skok, Levá myš=smazat, Pravá=stavit, 1-5=blok');