/** MAIN GAME EXECUTION */
function updateUI() {
    let p = entities[0];
    if(!p) return;
    document.getElementById('health-val').innerText = Math.max(0, Math.round((p.hp/p.maxHp)*100)) + '%';
    document.getElementById('fuel-val').innerText = Math.max(0, Math.round((p.fuel/p.maxFuel)*100)) + '%';

    let names = { 'pistol': 'BASIC SEMI-AUTO', 'smg': 'SUBMACHINE GUN', 'laser': 'LASER SHOOTER', 'torpedo': 'TORPEDO SHOOTER', null: 'EMPTY' };
    let w1 = names[p.weapons[0]] || 'NONE';
    let w2 = names[p.weapons[1]] || 'NONE';
    document.getElementById('weapon-name').innerText = `${p.weaponIndex === 0 ? '> ' : ''}${w1} | ${p.weaponIndex === 1 ? '> ' : ''}${w2}`;
    document.getElementById('bomb-count').innerText = p.bombs;

    let statusEl = document.getElementById('status-effect');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerText = `DEFLECTOR: ${Math.ceil(p.deflectorTimer/60)}S`;
    } else {
        statusEl.style.display = 'none';
    }

    document.getElementById('score').innerText = score;
}

function drawMinimap() {
    // Clear
    mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);

    let scaleX = mmCanvas.width / (MAP_COLS * TILE_SIZE);
    let scaleY = mmCanvas.height / (MAP_ROWS * TILE_SIZE);

    // Draw Map Layout
    mmCtx.fillStyle = 'rgba(241, 196, 15, 0.4)'; // Bebop Yellow ghosted
    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            if (map[y][x] === 1) {
                mmCtx.fillRect(x * TILE_SIZE * scaleX, y * TILE_SIZE * scaleY, TILE_SIZE * scaleX, TILE_SIZE * scaleY);
            }
        }
    }

    // Draw Player Only (Radar style)
    let p = entities[0];
    if(p && p.hp > 0) {
        mmCtx.fillStyle = '#00ffff'; // Cyan dot for player
        mmCtx.beginPath();
        mmCtx.arc(p.x * scaleX, p.y * scaleY, 3, 0, Math.PI*2);
        mmCtx.fill();

        // Vision cone approximation
        mmCtx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        mmCtx.beginPath();
        mmCtx.moveTo(p.x * scaleX, p.y * scaleY);
        mmCtx.arc(p.x * scaleX, p.y * scaleY, 40, p.aimAngle - 0.5, p.aimAngle + 0.5);
        mmCtx.fill();
    }
}

/** MAIN LOOP */
function gameLoop() {
    if (!gameActive) return;
    let player = entities[0];

    // UPDATE
    entities.forEach(e => e.update());
    entities = entities.filter(e => e.hp > 0 || e.isPlayer);
    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => b.timer > 0);
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    crates.forEach(c => c.update());
    crates = crates.filter(c => !c.dead);

    // Update Ambient Debris
    debris.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if(d.x < 0) d.x += MAP_COLS*TILE_SIZE; else if(d.x > MAP_COLS*TILE_SIZE) d.x -= MAP_COLS*TILE_SIZE;
        if(d.y < 0) d.y += MAP_ROWS*TILE_SIZE; else if(d.y > MAP_ROWS*TILE_SIZE) d.y -= MAP_ROWS*TILE_SIZE;
    });

    // Camera follow (smooth)
    camera.x += ((player.x + player.w/2 - (canvas.width/gameScale)/2) - camera.x) * 0.1;
    camera.y += ((player.y + player.h/2 - (canvas.height/gameScale)/2) - camera.y) * 0.1;

    // Screen Shake
    let sx = (Math.random()-0.5)*screenShake; let sy = (Math.random()-0.5)*screenShake;
    if(screenShake > 0) screenShake *= 0.9;

    updateUI(); // Keep fuel bar updated

    // DRAW BACKGROUND
    ctx.fillStyle = '#050508'; // Space
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(gameScale, gameScale);

    // Parallax Stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
        let px = (s.x - camera.x * 0.1) % (MAP_COLS*TILE_SIZE);
        let py = (s.y - camera.y * 0.1) % (MAP_ROWS*TILE_SIZE);
        if(px < 0) px += MAP_COLS*TILE_SIZE; if(py < 0) py += MAP_ROWS*TILE_SIZE;
        ctx.globalAlpha = Math.random() > 0.9 ? 0.5 : 1; // Twinkle
        ctx.beginPath(); ctx.arc(px, py, s.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // WORLD SPACE
    ctx.save();
    ctx.translate(-camera.x + sx, -camera.y + sy);

    // Draw Map (Blocky Asteroid structures)
    let ts = TILE_SIZE;

    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            if (map[y][x] === 1) {
                // Culling
                if (x*ts > camera.x - ts && x*ts < camera.x + canvas.width/gameScale &&
                    y*ts > camera.y - ts && y*ts < camera.y + canvas.height/gameScale) {

                    // Base rock
                    ctx.fillStyle = '#555';
                    ctx.fillRect(x * ts, y * ts, ts, ts);

                    // Block borders to give depth and grid texture
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x * ts, y * ts, ts, ts);

                    // Blocky crater/surface details
                    if ((x*13 + y*7) % 4 === 0) {
                        ctx.fillStyle = '#444';
                        ctx.fillRect(x * ts + ts*0.2, y * ts + ts*0.2, ts*0.4, ts*0.4);
                    } else if ((x*7 + y*13) % 5 === 0) {
                        ctx.fillStyle = '#666';
                        ctx.fillRect(x * ts + ts*0.6, y * ts + ts*0.6, ts*0.2, ts*0.2);
                    }
                }
            }
        }
    }

    // Draw Ambient Debris
    ctx.globalAlpha = 0.5;
    debris.forEach(d => {
        if (d.x > camera.x - 10 && d.x < camera.x + canvas.width/gameScale + 10 &&
            d.y > camera.y - 10 && d.y < camera.y + canvas.height/gameScale + 10) {
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.size, d.size);
        }
    });
    ctx.globalAlpha = 1;

    crates.forEach(c => c.draw(ctx));
    bullets.forEach(b => b.draw(ctx));
    particles.forEach(p => p.draw(ctx));

    // Draw Entities
    entities.forEach(e => {
        // Simple Line of Sight/Distance check to render
        if(e.isPlayer || Math.hypot(e.x - player.x, e.y - player.y) < 800) e.draw(ctx);
    });

    ctx.restore();
    ctx.restore(); // Restore global context scale

    // Render Minimap
    drawMinimap();

    // Death Screen (Cowboy Bebop iconic fade out)
    if(player.hp <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0,0,canvas.width, canvas.height);

        ctx.fillStyle = '#ecf0f1';
        ctx.font = '30px "Iosevka Charon", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("DON'T GIVE UP SPACEBOY...", canvas.width/2, canvas.height/2);

        ctx.font = '16px "Iosevka Charon", sans-serif';
        ctx.fillStyle = '#e74c3c';
        ctx.fillText("SYSTEM CONNECTION LOST", canvas.width/2, canvas.height/2 + 40);

        document.getElementById('restart-btn').style.display = 'block';
        return;
    }

    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; updateScale(); });

function startGame(difficulty) {
    document.getElementById('loader-screen').style.display = 'none';
    
    currentDifficulty = difficulty;
    if (difficulty === 'easy') { maxEnemies = 4; spawnIntervalMs = 6000; initialEnemies = 3; }
    else if (difficulty === 'medium') { maxEnemies = 8; spawnIntervalMs = 4000; initialEnemies = 6; }
    else if (difficulty === 'hard') { maxEnemies = 14; spawnIntervalMs = 2500; initialEnemies = 9; }

    initMapAssets();
    generateMap();
    let pSpawn = getSpawn();
    entities.push(new Mercenary(pSpawn.x, pSpawn.y, true)); // Player

    // Fix camera instantly so it doesn't pan across map on start
    let startPlayer = entities[0];
    camera.x = startPlayer.x + startPlayer.w/2 - canvas.width/2;
    camera.y = startPlayer.y + startPlayer.h/2 - canvas.height/2;

    // Spawn AI Enemies of different classes
    let classes = ['grunt', 'assault', 'sniper'];
    for(let i=0; i<initialEnemies; i++) { let s = getSpawn(); entities.push(new Mercenary(s.x, s.y, false, classes[Math.floor(Math.random() * classes.length)])); }

    // Crates Spawner
    setInterval(() => {
        if(!gameActive) return;
        if(crates.length < 4) {
            let s = getSpawn();
            let types = ['durability', 'deflector', 'smg', 'laser', 'torpedo', 'bomb'];
            crates.push(new Crate(s.x, s.y, types[Math.floor(Math.random()*types.length)]));
        }
        if(entities.length < maxEnemies) { let s = getSpawn(); entities.push(new Mercenary(s.x, s.y, false, classes[Math.floor(Math.random() * classes.length)])); }
    }, spawnIntervalMs);

    gameActive = true;
    updateUI();
    gameLoop();
}

document.querySelectorAll('.start-diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => startGame(e.target.getAttribute('data-diff')));
});
document.getElementById('restart-btn').addEventListener('click', () => location.reload());