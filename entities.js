/** ENTITIES & COMBAT SYSTEMS */
class Particle {
    constructor(x, y, color, speed, life, isSpark = false) {
        this.x = x; this.y = y; this.color = color;
        let ang = Math.random() * Math.PI * 2;
        this.vx = Math.cos(ang) * speed * Math.random();
        this.vy = Math.sin(ang) * speed * Math.random();
        this.life = life; this.maxLife = life;
        this.size = isSpark ? Math.random() * 2 + 1 : Math.random() * 4 + 2;
        this.isSpark = isSpark;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if(this.isSpark) { this.vx *= 0.95; this.vy *= 0.95; }
        this.life--;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife); ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, amount, speed, isSpark = false) {
    for (let i = 0; i < amount; i++) particles.push(new Particle(x, y, color, speed, 15 + Math.random() * 20, isSpark));
}

class Mercenary {
    constructor(x, y, isPlayer, aiClass = 'grunt') {
        this.x = x; this.y = y; this.w = 70; this.h = 70; this.vx = 0; this.vy = 0; this.isPlayer = isPlayer;
        this.aiClass = aiClass; this.speedMod = 1.0; this.preferDist = 250; this.aggroRange = 600;
        this.maxHp = isPlayer ? 100 : 50; this.weapons = ['pistol', null];
        this.color = isPlayer ? '#2c3e50' : '#8e44ad'; this.shirtColor = isPlayer ? '#f1c40f' : '#c0392b';
        
        if (!isPlayer) {
            if (aiClass === 'assault') { this.maxHp = 60; this.color = '#c0392b'; this.speedMod = 1.2; this.preferDist = 150; }
            else if (aiClass === 'sniper') { this.maxHp = 40; this.color = '#27ae60'; this.speedMod = 0.8; this.preferDist = 450; this.aggroRange = 800; }
        }
        
        this.hp = this.maxHp; this.maxFuel = 100; this.fuel = this.maxFuel;
        this.isGrounded = false; this.flashTimer = 0; this.aimAngle = 0; this.thrustAngle = 0; this.deflector = false;
        this.deflectorTimer = 0; this.exhausted = false;
        this.weaponIndex = 0; this.bombs = 5;
        this.swapCooldown = 0; this.bombCooldown = 0; this.fireCooldown = 0; this.aiTimer = 0; this.showHealthTimer = 0;
        this.path = []; this.dodgeCooldown = 0;
        this.lastX = x; this.lastY = y; this.stuckTimer = 0; this.wanderTimer = 0; this.wanderAngle = 0;
    }

    get weapon() { return this.weapons[this.weaponIndex]; }
    set weapon(val) { this.weapons[this.weaponIndex] = val; }

    takeDamage(amt, knockX, knockY) {
        this.hp -= amt; this.flashTimer = 5; this.showHealthTimer = 90;
        this.vx += knockX; this.vy += knockY;
        createParticles(this.x+this.w/2, this.y+this.h/2, '#e74c3c', 5, 4, true);
        if(this.hp <= 0 && !this.isPlayer) { score += 1500; updateUI(); createParticles(this.x+this.w/2, this.y+this.h/2, '#e74c3c', 20, 6, true); }
    }

    update() {
        if(this.hp <= 0) return;
        if(this.flashTimer > 0) this.flashTimer--; if(this.fireCooldown > 0) this.fireCooldown--;
        if(this.showHealthTimer > 0) this.showHealthTimer--; if(this.swapCooldown > 0) this.swapCooldown--;
        if(this.bombCooldown > 0) this.bombCooldown--;
        if(this.deflectorTimer > 0) { this.deflectorTimer--; if(this.deflectorTimer <= 0) this.deflector = false; }

        let speed = 1.2 * (this.isPlayer ? 1 : this.speedMod), thrustActive = false, dx = 0, dy = 0;

        if (this.isPlayer) {
            if (keys.a) dx -= 1; if (keys.d) dx += 1; if (keys.w || keys.space) dy -= 1; if (keys.s) dy += 1;
            if (touchJoystick.active) { dx = touchJoystick.x; dy = touchJoystick.y; }
            if (isTouchUI()) { if (touchJoystick.x !== 0 || touchJoystick.y !== 0) this.aimAngle = Math.atan2(touchJoystick.y, touchJoystick.x); }
            else {
                let mx = (mouse.x / gameScale) + camera.x, my = (mouse.y / gameScale) + camera.y;
                this.aimAngle = Math.atan2(my - (this.y + this.h/2), mx - (this.x + this.w/2));
            }

            if (mouse.down && this.fireCooldown <= 0) this.shoot();
            if (keys.q && this.swapCooldown <= 0) { this.weaponIndex = (this.weaponIndex + 1) % 2; if (!this.weapons[this.weaponIndex]) this.weaponIndex = (this.weaponIndex + 1) % 2; this.swapCooldown = 15; }
            if (keys['1'] && this.weapons[0] && this.swapCooldown <= 0) { this.weaponIndex = 0; this.swapCooldown = 15; }
            if (keys['2'] && this.weapons[1] && this.swapCooldown <= 0) { this.weaponIndex = 1; this.swapCooldown = 15; }
            if (keys.f && this.bombs > 0 && this.bombCooldown <= 0) { this.bombs--; this.bombCooldown = 30; bullets.push(new Bullet(this.x + this.w/2, this.y + this.h/2, 0, this, 0, 150, 'bomb')); }
        } else {
            let p = entities[0], dist = Math.hypot(p.x - this.x, p.y - this.y); this.aiTimer++;
            
            if (this.wanderTimer > 0) {
                this.wanderTimer--;
                dx += Math.cos(this.wanderAngle) * 2; dy += Math.sin(this.wanderAngle) * 2;
                this.aimAngle = Math.atan2(p.y - this.y, p.x - this.x);
            } else {
                // Intelligent Bullet Avoidance
                if (this.dodgeCooldown > 0) this.dodgeCooldown--;
                let dodging = false;
                if (this.dodgeCooldown <= 0) {
                    for (let b of bullets) {
                        if (b.owner === p && b.timer > 0) {
                            let bDist = Math.hypot(b.x - this.x, b.y - this.y);
                            if (bDist < 250) { // If bullet is close
                                // Check if bullet is moving towards enemy
                                let dot = (this.x - b.x) * b.vx + (this.y - b.y) * b.vy;
                                let dodgeChance = this.aiClass === 'assault' ? 0.2 : (this.aiClass === 'sniper' ? 0.3 : 0.6);
                                if (dot > 0 && Math.random() > dodgeChance) { // Class based dodge probability
                                    this.dodgeCooldown = 45; dodging = true;
                                    // Dodge perpendicularly to bullet path
                                    let dodgeAngle = Math.atan2(b.vy, b.vx) + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
                                    dx += Math.cos(dodgeAngle) * 3; dy += Math.sin(dodgeAngle) * 3;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Alert Radius
                if(dist < this.aggroRange) {
                    this.aimAngle = Math.atan2(p.y - this.y, p.x - this.x);
                    let fireRate = this.weapon === 'smg' ? 25 : (this.weapon === 'laser' ? 90 : (this.weapon === 'torpedo' ? 120 : 60));
                    let shootChance = this.aiClass === 'sniper' ? 0.5 : 0.7; // Reduce aggressive random shooting
                    if(dist < this.aggroRange * 0.8 && this.aiTimer % fireRate === 0 && Math.random() > shootChance) this.shoot();

                    if (!dodging) {
                        if (this.aiClass === 'assault') {
                            // A* Pathfinding updating less frequently for performance and less perfect tracking
                            if (this.aiTimer % 45 === 0 || this.path.length === 0) {
                                let sx = Math.floor((this.x + this.w/2) / TILE_SIZE), sy = Math.floor((this.y + this.h/2) / TILE_SIZE);
                                let px = Math.floor((p.x + p.w/2) / TILE_SIZE), py = Math.floor((p.y + p.h/2) / TILE_SIZE);
                                this.path = typeof findPath === 'function' ? findPath(sx, sy, px, py) : [];
                            }

                            if (this.path && this.path.length > 0) {
                                let targetNode = this.path[0];
                                let tx = targetNode.x * TILE_SIZE + TILE_SIZE/2, ty = targetNode.y * TILE_SIZE + TILE_SIZE/2;
                                if (Math.hypot(tx - (this.x + this.w/2), ty - (this.y + this.h/2)) < 30) this.path.shift(); // Move to next node
                                else { let moveAngle = Math.atan2(ty - (this.y + this.h/2), tx - (this.x + this.w/2)); dx += Math.cos(moveAngle); dy += Math.sin(moveAngle); }
                                
                                if (dist < this.preferDist) { dx -= Math.cos(this.aimAngle); dy -= Math.sin(this.aimAngle); } // Maintain class-based personal space
                            } else {
                                // Fallback behavior
                                if(dist < this.preferDist - 50) { dx -= Math.cos(this.aimAngle); dy -= Math.sin(this.aimAngle); } else if(dist > this.preferDist + 50) { dx += Math.cos(this.aimAngle); dy += Math.sin(this.aimAngle); }
                            }
                        } else {
                            // Simpler line-of-sight and strafing for grunt and sniper
                            if(dist < this.preferDist - 50) { dx -= Math.cos(this.aimAngle); dy -= Math.sin(this.aimAngle); } 
                            else if(dist > this.preferDist + 50) { dx += Math.cos(this.aimAngle); dy += Math.sin(this.aimAngle); }
                            else { dx += Math.cos(this.aimAngle + Math.PI/2) * 0.5; dy += Math.sin(this.aimAngle + Math.PI/2) * 0.5; } // Strafe
                        }
                    }
                } else if(this.aiTimer % 120 === 0) { this.vx = (Math.random()-0.5)*5; this.vy = (Math.random()-0.5)*5; }
            }

            // Stuck detection & recovery
            let distMoved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
            if (distMoved < 0.5 && (dx !== 0 || dy !== 0)) this.stuckTimer++;
            else this.stuckTimer = 0;

            if (this.stuckTimer > 20) {
                this.wanderTimer = 30; // Break out of stuck state
                this.stuckTimer = 0;
                this.path = []; // Reset pathfinding
                this.wanderAngle = Math.random() * Math.PI * 2;
            }
            this.lastX = this.x; this.lastY = this.y;
        }

        if (this.fuel <= 0) this.exhausted = true; if (this.fuel >= 20) this.exhausted = false;
        if ((dx !== 0 || dy !== 0) && !this.exhausted && this.fuel > 0) {
            let angle = Math.atan2(dy, dx); this.thrustAngle = angle + Math.PI;
            this.vx += Math.cos(angle) * speed; this.vy += Math.sin(angle) * speed; this.fuel -= 0.5; thrustActive = true;
            let tx = this.x + this.w/2 + Math.cos(this.thrustAngle) * 41, ty = this.y + this.h/2 + Math.sin(this.thrustAngle) * 41;
            createParticles(tx, ty, '#00ffff', 1, 3);
        }

        this.vx *= FRICTION; this.vy *= FRICTION; this.vy += GRAVITY; this.x += this.vx;
        if (checkCollision(this.x, this.y, this.w, this.h)) {
            if (this.vx > 0) this.x = Math.floor((this.x+this.w)/TILE_SIZE)*TILE_SIZE - this.w - 0.1;
            else if (this.vx < 0) this.x = Math.floor(this.x/TILE_SIZE)*TILE_SIZE + TILE_SIZE + 0.1;
            this.vx = 0;
        }
        this.y += this.vy; this.isGrounded = false;
        if (checkCollision(this.x, this.y, this.w, this.h)) {
            if (this.vy > 0) { this.y = Math.floor((this.y+this.h)/TILE_SIZE)*TILE_SIZE - this.h - 0.1; this.isGrounded = true; }
            else if (this.vy < 0) this.y = Math.floor(this.y/TILE_SIZE)*TILE_SIZE + TILE_SIZE + 0.1;
            this.vy = 0;
        }
        if (!thrustActive) this.fuel = Math.min(this.maxFuel, this.fuel + 1);
    }

    shoot() {
        let bx = this.x + this.w/2 + Math.cos(this.aimAngle)*45, by = this.y + this.h/2 + Math.sin(this.aimAngle)*45;
        if (this.weapon === 'pistol') { bullets.push(new Bullet(bx, by, this.aimAngle, this, 18, 15)); this.fireCooldown = 15; this.vx -= Math.cos(this.aimAngle)*2; }
        else if (this.weapon === 'smg') { bullets.push(new Bullet(bx, by, this.aimAngle + (Math.random()-0.5)*0.2, this, 20, 10)); this.fireCooldown = 5; this.vx -= Math.cos(this.aimAngle)*1; }
        else if (this.weapon === 'laser') {
            if (this.isPlayer && this.fuel < this.maxFuel) return; this.fuel = 0;
            let lx = bx, ly = by, dx = Math.cos(this.aimAngle) * 8, dy = Math.sin(this.aimAngle) * 8, hitEntities = new Set();
            for (let i = 0; i < 150; i++) {
                lx += dx; ly += dy;
                if (checkCollision(lx, ly, 1, 1)) { createParticles(lx, ly, '#e74c3c', 2, 2, true); break; }
                entities.forEach(e => { if (e !== this && e.hp > 0 && lx > e.x && lx < e.x+e.w && ly > e.y && ly < e.y+e.h && !hitEntities.has(e)) { e.takeDamage(999, dx*0.5, dy*0.5); hitEntities.add(e); } });
            }
            let startX = bx, startY = by, endX = lx, endY = ly;
            bullets.push({ timer: 15, update: function() { this.timer--; }, draw: function(ctx) { ctx.save(); ctx.globalAlpha = this.timer / 15; ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke(); ctx.restore(); } });
            this.fireCooldown = 40; if (this.isPlayer) screenShake = 4;
        } else if (this.weapon === 'torpedo') {
            bullets.push(new Bullet(bx, by, this.aimAngle, this, 6, 50, 'torpedo')); this.fireCooldown = 50; this.vx -= Math.cos(this.aimAngle)*4; this.weapon = 'pistol'; if (this.isPlayer) screenShake = 3;
        }
        createParticles(bx, by, '#f1c40f', 4, 5, true);
    }

    draw(ctx) {
        if(this.hp <= 0) return;
        ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
        let drawColor = this.flashTimer > 0 ? '#ffffff' : this.color;
        ctx.lineWidth = 2; ctx.strokeStyle = '#000000';
        ctx.save(); ctx.rotate(this.aimAngle);
        ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.rect(-20, -11, 10, 22); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-15, -11); ctx.lineTo(-15, 11); ctx.stroke();
        ctx.fillStyle = drawColor; ctx.beginPath(); ctx.rect(-10, -16, 18, 32); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.rect(-2, -19, 16, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.rect(-2, 12, 16, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = drawColor === '#ffffff' ? '#ffffff' : '#bdc3c7'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.shirtColor; ctx.beginPath(); ctx.arc(2, 0, 10, -Math.PI/2, Math.PI/2); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();

        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.strokeStyle = this.deflector ? '#9b59b6' : '#7f8c8d'; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); ctx.rotate(this.thrustAngle); ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.rect(33, -5, 8, 10); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.rotate(this.aimAngle); ctx.fillStyle = '#333';
        if(this.weapon === 'pistol') { ctx.beginPath(); ctx.rect(29, -4, 10, 6); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.rect(35, -3, 10, 6); ctx.fill(); ctx.stroke(); }
        else if (this.weapon === 'smg') { ctx.beginPath(); ctx.rect(35, -4, 14, 8); ctx.rect(43, 2, 4, 6); ctx.fill(); ctx.stroke(); }
        else if (this.weapon === 'laser') { ctx.beginPath(); ctx.rect(35, -2, 18, 4); ctx.fill(); ctx.stroke(); if (this.fuel >= this.maxFuel || !this.isPlayer) { ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff4d4d'; } else ctx.fillStyle = '#550000'; ctx.fillRect(39, -1, 10, 2); ctx.shadowBlur = 0; }
        else if (this.weapon === 'torpedo') { ctx.beginPath(); ctx.rect(35, -6, 16, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(51, 0, 4, 0, Math.PI*2); ctx.fill(); }
        ctx.restore(); ctx.restore();

        if (!this.isPlayer && this.showHealthTimer > 0) { ctx.fillStyle = '#e74c3c'; ctx.fillRect(-15, -45, 30, 4); ctx.fillStyle = '#2ecc71'; ctx.fillRect(-15, -45, 30 * Math.max(0, this.hp / this.maxHp), 4); ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.strokeRect(-15, -45, 30, 4); }
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, owner, speed, damage, type = 'normal') {
        this.x = x; this.y = y; this.owner = owner; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.damage = damage; this.type = type; this.size = type === 'torpedo' ? 6 : (type === 'laser' ? 2 : (type === 'bomb' ? 8 : 4));
        this.timer = type === 'torpedo' ? 150 : (type === 'bomb' ? 180 : 60); this.px = x; this.py = y;
    }
    update() {
        this.px = this.x; this.py = this.y; this.x += this.vx; this.y += this.vy; this.timer--;
        const explodeTorpedo = (tx, ty) => {
            screenShake = 10; let cx = Math.floor(tx / TILE_SIZE), cy = Math.floor(ty / TILE_SIZE);
            for (let ny = cy - 2; ny <= cy + 2; ny++) for (let nx = cx - 2; nx <= cx + 2; nx++) if (ny > 0 && ny < MAP_ROWS - 1 && nx > 0 && nx < MAP_COLS - 1 && map[ny] && map[ny][nx] === 1) { map[ny][nx] = 0; createParticles(nx*TILE_SIZE + TILE_SIZE/2, ny*TILE_SIZE + TILE_SIZE/2, '#555', 8, 3); }
        };
        if (this.type === 'bomb' && this.timer <= 0) {
            createParticles(this.x, this.y, '#e74c3c', 30, 8, true); explodeTorpedo(this.x, this.y);
            entities.forEach(e => { if (e.hp > 0 && Math.hypot(e.x+e.w/2 - this.x, e.y+e.h/2 - this.y) < 120) e.takeDamage(this.damage, (e.x+e.w/2-this.x)*0.15, (e.y+e.h/2-this.y)*0.15); }); return;
        }
        if (this.type === 'bomb') return;
        if(checkCollision(this.x, this.y, this.size, this.size)) { this.timer = -1; createParticles(this.x, this.y, this.type === 'torpedo' ? '#e74c3c' : '#f1c40f', 5, 3, true); if (this.type === 'torpedo') explodeTorpedo(this.x, this.y); }
        entities.forEach(e => {
            if(e !== this.owner && e.hp > 0 && this.x > e.x && this.x < e.x+e.w && this.y > e.y && this.y < e.y+e.h) {
                if (e.deflector && this.type !== 'torpedo') {
                    let reflectAngle = Math.atan2(this.y - (e.y+e.h/2), this.x - (e.x+e.w/2)), spd = Math.hypot(this.vx, this.vy);
                    this.vx = Math.cos(reflectAngle) * spd; this.vy = Math.sin(reflectAngle) * spd; this.owner = e; createParticles(this.x, this.y, '#00ffff', 5, 3, true);
                } else {
                    e.takeDamage(this.damage, this.vx*0.2, -2); this.timer = -1;
                    if(this.type === 'torpedo') { createParticles(this.x, this.y, '#e74c3c', 20, 6, true); explodeTorpedo(this.x, this.y); }
                }
            }
        });
    }
    draw(ctx) {
        if (this.type === 'torpedo') { ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); }
        else if (this.type === 'bomb') { ctx.fillStyle = (this.timer % 15 < 7) ? '#e74c3c' : '#ffffff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.px, this.py); ctx.lineTo(this.x, this.y); ctx.stroke(); }
    }
}

class Crate {
    constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.w = 20; this.h = 20; this.bob = Math.random()*Math.PI*2; }
    update() {
        this.bob += 0.05;
        for (let e of entities) {
            if(e.hp > 0 && e.x < this.x+this.w && e.x+e.w > this.x && e.y < this.y+this.h && e.y+e.h > this.y) {
                if(this.type === 'durability') { e.maxHp += 50; e.hp = e.maxHp; } else if (this.type === 'deflector') { e.deflector = true; e.deflectorTimer = 3600; } else if (this.type === 'bomb') { e.bombs = Math.min(5, e.bombs + 2); }
                else {
                    if (e.weapons[0] === this.type || e.weapons[1] === this.type) { if (this.type === 'torpedo') e.weapons[e.weaponIndex] = this.type; }
                    else if (!e.weapons[0]) { e.weapons[0] = this.type; e.weaponIndex = 0; } else if (!e.weapons[1]) { e.weapons[1] = this.type; e.weaponIndex = 1; } else e.weapons[e.weaponIndex] = this.type;
                }
                this.dead = true; if (e.isPlayer) { score += 100; updateUI(); }
                createParticles(this.x+10, this.y+10, '#3498db', 10, 5); break;
            }
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.bob)*4); ctx.lineWidth = 2; ctx.strokeStyle = '#000';
        let color = '#3498db', txt = '';
        if(this.type === 'durability') { color = '#2ecc71'; txt = 'DUR'; } else if(this.type === 'deflector') { color = '#9b59b6'; txt = 'DEF'; } else if(this.type === 'bomb') { color = '#e67e22'; txt = 'BMB'; } else if(this.type === 'smg') txt = 'SMG'; else if(this.type === 'laser') txt = 'LSR'; else if(this.type === 'torpedo') txt = 'TOR';
        ctx.fillStyle = color; ctx.beginPath(); ctx.rect(0, 0, this.w, this.h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px "Iosevka Charon", sans-serif'; ctx.fillText(txt, this.w/2, this.h/2 + 1); ctx.restore();
    }
}