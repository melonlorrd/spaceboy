# Spaceboy: Game Architecture & Mechanics

This document outlines the inner workings of **Spaceboy**, a 2D top-down zero-gravity shooter. It covers the core systems, algorithms, and architectural decisions used to build the game.

## 1. Game Loop & Rendering (`game.js`)
The game operates on a continuous `requestAnimationFrame` loop, executing the standard **Update -> Render** cycle.

### Smooth Camera System
The camera does not lock strictly to the player; instead, it uses **Linear Interpolation (Lerp)** to smoothly pan towards the player's position. 
```javascript
camera.x += (targetX - camera.x) * 0.1;
```
### Frustum Culling
To maintain a high framerate despite the large 80x60 tile map, the rendering engine checks if a tile is within the camera's current viewport before drawing it. Off-screen tiles, debris, and far-away entities are ignored during the draw phase.

---

## 2. Map Generation: Cellular Automata (`map.js`)
The cave-like asteroid map is procedurally generated every time a new game starts using a **Cellular Automata** algorithm. 

**How it works:**
1. **Noise Seeding**: The 80x60 grid is populated randomly. There is a 39% chance for any given tile to be a wall (`1`), and a 61% chance to be empty space (`0`). The outer borders are hardcoded to be walls to prevent entities from flying off the map.
2. **Smoothing Iterations**: The algorithm runs 4 passes over the grid. For every tile, it looks at its 8 immediate neighbors (a 3x3 grid). 
   - If the number of surrounding wall tiles is strictly greater than 4, the current tile becomes a wall.
   - Otherwise, it becomes empty space.
3. **Result**: This logic organically naturally clusters walls together and smooths out jagged random noise, resulting in the interconnected "cave" and "arena" structures.

---

## 3. Artificial Intelligence & Pathfinding
The enemy Mercenaries use a mix of state-machine logic, steering behaviors, and graph search algorithms to fight the player.

### A* (A-Star) Pathfinding (`map.js`)
Certain enemy classes (like the `assault` class) actively hunt the player through the complex cave systems. Because simple line-of-sight moving would cause them to get stuck on walls, they use the **A* Pathfinding Algorithm**.

- **Nodes**: Every valid empty tile on the 80x60 map acts as a traversable node.
- **Heuristic**: It calculates the `f-cost` by adding the `g` (distance from start) and the `h` (Euclidean distance to the player).
- **Optimization**: Running A* every frame for multiple enemies would crash the browser. Instead, enemies only recalculate their path every 45 frames (roughly 1.5 times a second), and follow the cached waypoints in the meantime.

### Dynamic Bullet Evasion (`entities.js`)
Enemies are programmed to dodge incoming fire. 
- The AI calculates the **Dot Product** between the bullet's velocity vector and the vector pointing from the bullet to the enemy.
- If the result is positive, it means the bullet is traveling *towards* them.
- Depending on the AI's class (e.g., Sniper vs Grunt), there is a probability check. If passed, the enemy calculates a perpendicular vector to the bullet's trajectory and applies thrust to dodge out of the way.

### Class-based Behaviors
- **Grunt**: Standard line-of-sight followers. Uses basic strafing.
- **Assault**: Highly aggressive. Uses A* pathfinding to navigate mazes and prefers close combat (150px distance).
- **Sniper**: Low health, high damage (Laser). High aggro-range, high dodge probability, and actively attempts to keep a vast distance (450px) from the player.

---

## 4. Entity & Physics System (`entities.js`)
The player and enemies share the same base class (`Mercenary`). 

### Zero-Gravity Physics
The game mimics a zero-gravity vacuum. 
- Thrust applies acceleration vectors (`vx`, `vy`) to the entity based on input.
- A constant `FRICTION` multiplier of `0.85` is applied every frame. This creates a slight "slide" or "drift" effect when the player stops thrusting, simulating momentum in space.

### Collision Detection (AABB)
Entity-to-Wall collision uses **Axis-Aligned Bounding Box (AABB)** checks against the map's 2D array. 
- Movement is resolved on one axis at a time (X, then Y).
- If moving along the X axis results in intersecting a tile marked `1`, the entity's position is snapped back to the edge of the tile, and `vx` is zeroed out.

### Raycasting (Laser Weapon)
The Laser weapon functions as an instantaneous hit-scan weapon using raycasting.
- Upon firing, a point steps forward along the firing angle mathematically, checking collisions against walls or entities every few pixels.
- It stops the moment it hits a wall, but damages any entity it passes through instantly.

---

## 5. Input & Touch UI Handling (`input.js`)
The game seamlessly supports both Desktop (Mouse/Keyboard) and Mobile (Touch) controls.

### Virtual Joystick
When active, the touch joystick calculates the touch's distance from the joystick center.
- It limits the drag radius using `Math.hypot` (Pythagorean theorem).
- The resulting `X` and `Y` coordinates are normalized into a value between `-1.0` and `1.0`. 
- These normalized values are fed directly into the player's thrust vector, allowing for smooth 360-degree analog movement, rather than the 8-directional movement of WASD keyboards.

### Responsive UI
The UI is heavily reliant on CSS Flexbox, absolute positioning, and dynamic media queries to ensure the top minimal status bar, radar, and touch controls remain perfectly anchored regardless of the device aspect ratio.
