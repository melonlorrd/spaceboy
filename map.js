/** MAP & ENVIRONMENT GENERATION */
function initMapAssets() {
    for(let i=0; i<150; i++) stars.push({ x: Math.random()*MAP_COLS*TILE_SIZE, y: Math.random()*MAP_ROWS*TILE_SIZE, size: Math.random()*2 });
    for(let i=0; i<200; i++) debris.push({
        x: Math.random()*MAP_COLS*TILE_SIZE, y: Math.random()*MAP_ROWS*TILE_SIZE,
        vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5,
        size: Math.random()*3 + 1, color: Math.random() > 0.5 ? '#555' : '#7f8c8d'
    });
}

function generateMap() {
    for (let y = 0; y < MAP_ROWS; y++) {
        map[y] = [];
        for (let x = 0; x < MAP_COLS; x++) { map[y][x] = (x===0 || x===MAP_COLS-1 || y===0 || y===MAP_ROWS-1) ? 1 : (Math.random() < 0.39 ? 1 : 0); }
    }
    for (let i = 0; i < 4; i++) {
        let newMap = JSON.parse(JSON.stringify(map));
        for (let y = 1; y < MAP_ROWS - 1; y++) {
            for (let x = 1; x < MAP_COLS - 1; x++) {
                let walls = 0;
                for (let ny = y-1; ny <= y+1; ny++) for (let nx = x-1; nx <= x+1; nx++) if (map[ny][nx] === 1) walls++;
                newMap[y][x] = walls > 4 ? 1 : 0;
            }
        }
        map = newMap;
    }
}

function getSpawn(w = 70, h = 70) {
    for (let i=0; i<1000; i++) {
        let x = Math.floor(Math.random()*(MAP_COLS-4))+2, y = Math.floor(Math.random()*(MAP_ROWS-4))+2;
        let px = x * TILE_SIZE + (TILE_SIZE - w)/2, py = y * TILE_SIZE + (TILE_SIZE - h)/2;
        if (!checkCollision(px, py, w, h)) return { x: px, y: py };
    }
    return { x: TILE_SIZE * 2, y: TILE_SIZE * 2 };
}

function checkCollision(x, y, w, h) {
    let l = Math.floor(x/TILE_SIZE), r = Math.floor((x+w)/TILE_SIZE), t = Math.floor(y/TILE_SIZE), b = Math.floor((y+h)/TILE_SIZE);
    for (let ty = t; ty <= b; ty++) for (let tx = l; tx <= r; tx++) if (map[ty] && map[ty][tx] === 1) return true;
    return false;
}

/** A* PATHFINDING */
function findPath(startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];
    if (endX < 0 || endX >= MAP_COLS || endY < 0 || endY >= MAP_ROWS) return [];
    
    let openSet = [{x: startX, y: startY, g: 0, h: 0, f: 0, parent: null}];
    let closedSet = new Set();
    const toKey = (x, y) => `${x},${y}`;
    let iterations = 0;

    while (openSet.length > 0 && iterations < 500) {
        iterations++;
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();
        closedSet.add(toKey(current.x, current.y));

        if (current.x === endX && current.y === endY) {
            let path = [];
            let curr = current;
            while (curr.parent) { path.push({x: curr.x, y: curr.y}); curr = curr.parent; }
            return path.reverse();
        }

        let neighbors = [
            {x: current.x, y: current.y - 1}, {x: current.x, y: current.y + 1},
            {x: current.x - 1, y: current.y}, {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y - 1}, {x: current.x + 1, y: current.y - 1},
            {x: current.x - 1, y: current.y + 1}, {x: current.x + 1, y: current.y + 1}
        ];

        for (let n of neighbors) {
            if (n.x < 0 || n.x >= MAP_COLS || n.y < 0 || n.y >= MAP_ROWS) continue;
            if (map[n.y] && map[n.y][n.x] === 1) continue;
            if (n.x !== current.x && n.y !== current.y && (map[current.y][n.x] === 1 || map[n.y][current.x] === 1)) continue; // No corner cutting

            let key = toKey(n.x, n.y);
            if (closedSet.has(key)) continue;

            let isDiag = n.x !== current.x && n.y !== current.y;
            let g = current.g + (isDiag ? 1.414 : 1);
            
            let existing = openSet.find(node => node.x === n.x && node.y === n.y);
            if (!existing) {
                let h = Math.hypot(n.x - endX, n.y - endY);
                openSet.push({x: n.x, y: n.y, g: g, h: h, f: g + h, parent: current});
            } else if (g < existing.g) {
                existing.g = g; existing.f = g + existing.h; existing.parent = current;
            }
        }
    }
    return [];
}