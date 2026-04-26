/** CORE SETUP & SHARED GLOBALS */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mmCanvas = document.getElementById('minimapCanvas');
const mmCtx = mmCanvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE_SIZE = 40, MAP_COLS = 80, MAP_ROWS = 60;
const GRAVITY = 0, FRICTION = 0.85; // Zero gravity for space feel
let score = 0;
let camera = { x: 0, y: 0 };
let screenShake = 0;
let gameScale = 1;
let gameActive = false; // Prevents loop running until 'Start'
let currentDifficulty = 'medium';
let maxEnemies = 8;
let spawnIntervalMs = 4000;
let initialEnemies = 6;

// Environment / Entities shared pools
let map = [];
let stars = [];
let debris = [];
let entities = [];
let particles = [];
let bullets = [];
let crates = [];

let keys = { a: false, d: false, w: false, s: false, space: false, q: false, f: false, 1: false, 2: false };
let mouse = { x: 0, y: 0, down: false };
let isTouchUI = () => document.getElementById('touch-joystick').style.display !== 'none';
let touchJoystick = { active: false, x: 0, y: 0 };

function updateScale() { gameScale = Math.max(0.4, Math.min(1, window.innerWidth / 1280)); }