/** INPUT HANDLING & UI TOGGLES */
window.addEventListener('keydown', e => { if(isTouchUI()) return; if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; if(e.key===' ') keys.space=true; });
window.addEventListener('keyup', e => { if(isTouchUI()) return; if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; if(e.key===' ') keys.space=false; });
window.addEventListener('mousemove', e => { if(isTouchUI()) return; mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if(isTouchUI()) return; if(e.button===0) mouse.down = true; });
window.addEventListener('mouseup', e => { if(isTouchUI()) return; if(e.button===0) mouse.down = false; });
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('touchstart', e => {
    if(e.target.tagName === 'BUTTON' || e.target.classList.contains('mob-btn') || e.target.closest('#touch-joystick') || e.target.closest('#mobile-actions')) return;
    if(isTouchUI()) return; 
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
    mouse.down = true;
}, {passive: false});
window.addEventListener('touchmove', e => {
    if(e.target.tagName === 'BUTTON' || e.target.classList.contains('mob-btn') || e.target.closest('#touch-joystick') || e.target.closest('#mobile-actions')) return;
    if(isTouchUI()) return;
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
}, {passive: false});
window.addEventListener('touchend', e => {
    if(e.target.tagName === 'BUTTON' || e.target.classList.contains('mob-btn') || e.target.closest('#touch-joystick') || e.target.closest('#mobile-actions')) return;
    if(isTouchUI()) return;
    mouse.down = false;
});

document.getElementById('touch-toggle').addEventListener('click', () => {
    let joy = document.getElementById('touch-joystick');
    let actions = document.getElementById('mobile-actions');
    let btn = document.getElementById('touch-toggle');
    if (joy.style.display === 'none') {
        joy.style.display = 'block'; actions.style.display = 'flex';
        btn.innerText = 'TOUCH UI: ON';
        for (let k in keys) keys[k] = false; mouse.down = false;
        localStorage.setItem('spaceboy_touchUI', 'true');
    } else {
        joy.style.display = 'none'; actions.style.display = 'none';
        btn.innerText = 'TOUCH UI: OFF';
        localStorage.setItem('spaceboy_touchUI', 'false');
    }
});
if (localStorage.getItem('spaceboy_touchUI') === 'true') document.getElementById('touch-toggle').click();

const joyBase = document.getElementById('touch-joystick'), joyKnob = document.getElementById('touch-knob');
let joyActive = false, joyCenter = { x: 0, y: 0 };

joyBase.addEventListener('touchstart', e => {
    e.preventDefault(); joyActive = true; let rect = joyBase.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2; joyCenter.y = rect.top + rect.height / 2; updateJoy(e.touches[0]);
}, {passive: false});
joyBase.addEventListener('touchmove', e => { e.preventDefault(); if (joyActive) updateJoy(e.touches[0]); }, {passive: false});
joyBase.addEventListener('touchend', e => { e.preventDefault(); joyActive = false; joyKnob.style.transform = `translate(-50%, -50%)`; touchJoystick.x = 0; touchJoystick.y = 0; touchJoystick.active = false; }, {passive: false});

function updateJoy(touch) {
    let dx = touch.clientX - joyCenter.x, dy = touch.clientY - joyCenter.y, dist = Math.hypot(dx, dy);
    if (dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    touchJoystick.x = dx / 40; touchJoystick.y = dy / 40; touchJoystick.active = true;
}

document.getElementById('fullscreen-toggle').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.log(err));
    else document.exitFullscreen();
});