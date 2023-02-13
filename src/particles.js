const canvas = document.getElementById("particles");
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var anim;

var lengthSlider = document.getElementById("length");

var particles = [];
let amount = 100;
let r = 1.5;              // radius of particles
let l = 1;            // length that a particle moves between each frame
let color = "#00ff3c";       // color of particle
let stuckColor = "#6d46eb";  // color of a stuck particle

var fps = document.getElementById("fps");
var startTime = performance.now();
var frame = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        if (document.getElementById('wasm').checked) {
            Module.ccall(
                'releaseAll_wasm',
                null,
                null,
                null
            );
        } else {
            releaseAll();
        }
    }
})

lengthSlider.oninput = () => {
    l = lengthSlider.value;
    Module.ccall(
        'setVariables',
        null,
        ['number', 'number', 'number', 'number'],
        [canvas.width, canvas.height, l, r]
    );
}

function updateParticles() {

    cancelAnimationFrame(anim);
    resetParticlesArrays();
    var value = document.getElementById("numOfParticles");
    amount = parseInt(value.options[value.selectedIndex].value);
    
    if (document.getElementById('wasm').checked) {
        console.log("wasm checked!");
        Module.ccall(
            'setVariables',
            null,
            ['number', 'number', 'number', 'number'],
            [canvas.width, canvas.height, l, r]
        );
        Module.ccall(
            'initParticles',
            null,
            ['number'],
            [amount]
        );
        animateParticles_wasm();
    } else {
            initParticles();  
            animateParticles();
        }
    }

function initParticles() {
    particles = []
    for (var i = 0; i < amount; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        particles.push(new Particle(x, y, true));
    }
}

class Particle {
    constructor(x, y, isMoving) {
        this.x = x;
        this.y = y;
        this.isMoving = isMoving;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = this.isMoving ? color : stuckColor;
        ctx.fill()
    }

    update(i) {
        if (this.isMoving) this.randomMove(l);
        
        if (this.x >= canvas.width-r) {
            this.x = canvas.width-r;
            this.isMoving = false;
        }
        else if (this.x <= r) {
            this.x = r;
            this.isMoving = false;
        }
        else if (this.y >= canvas.height-r) {
            this.y = canvas.height-r;
            this.isMoving = false;
        }
        else if (this.y <= r) {
            this.y = r;
            this.isMoving = false;
        }

        this.collision(i);

        this.draw();
    }

    collision(i) {
        for (var j = 0; j < amount; j++) {
            if (i === j) continue;
            if (Math.sqrt(Math.pow(this.x - particles[j].x, 2) + Math.pow(this.y - particles[j].y, 2)) <= 2*r) {
                this.isMoving = false;
            }
        }
    }

    randomMove(L) {
        let v = Math.random() * 2*Math.PI;
        this.x += L * Math.cos(v);
        this.y += L * Math.sin(v);
    }
   
    release() {
        this.isMoving = true;
    }

}

function releaseAll() {
    particles.forEach(p => p.release());
}

function animateParticles(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frame++;
    if (time - startTime > 1000) {
        fps.innerHTML = (frame / ((time - startTime) / 1000)).toFixed(1);
        startTime = time;
        frame = 0;
      }
    for (let i = 0; i < particles.length; i++) {
        particles[i].update(i);
    }

    anim = requestAnimationFrame(animateParticles);
}

function animateParticles_wasm(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //var startUpdateTime = performance.now();
    //var time = performance.now();
    frame++;
    if (time - startTime > 1000) {
        fps.innerHTML = (frame / ((time - startTime) / 1000)).toFixed(1);
        startTime = time;
        frame = 0;
    }
    Module.ccall(
        'update',
        null,
        null,
        null
    );
    //var endUpdateTime = performance.now();
    //console.log(`Updating and drawing all particles (ccall) took: ${endUpdateTime-startUpdateTime}`);
    anim = requestAnimationFrame(animateParticles_wasm);
}

// invoked from particles.c
function drawParticle(x, y, radius, isMoving) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = isMoving ? color : stuckColor;
    ctx.fill()
}

function resetParticlesArrays() {
    particles = [];
    Module.ccall(
        'freeMemory',
        null,
        null,
        null
    )
}

// invoke C initParticles function
Module.onRuntimeInitialized = () => {
    // set w, h, l, r
    Module.ccall(
        'setVariables',
        null,
        ['number', 'number', 'number', 'number'],
        [canvas.width, canvas.height, l, r]
    );
    // init particles
    Module.ccall(
        'initParticles',
        null,
        ['number'],
        [amount]
    );
    initParticles();
    //animateParticles_wasm();
    animateParticles();
}