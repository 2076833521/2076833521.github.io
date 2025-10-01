// script.js

// 获取Canvas和上下文
const canvas = document.getElementById('weatherCanvas');
const ctx = canvas.getContext('2d');

// 设置Canvas大小
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 监听窗口大小变化
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// 雨滴类
class Raindrop {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.length = Math.random() * 20 + 10;
        this.speed = Math.random() * 5 + 5;
        this.opacity = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.reset();
        }
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.strokeStyle = `rgba(173, 216, 230, ${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// 闪电类
class Lightning {
    constructor() {
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = Math.random() * canvas.width;
        this.y = 0;
        this.length = Math.random() * 100 + 50;
        this.duration = Math.random() * 500 + 200;
        this.startTime = Date.now();
    }

    update() {
        if (!this.active && Math.random() < 0.002) {
            this.active = true;
            this.startTime = Date.now();
        }

        if (this.active) {
            if (Date.now() - this.startTime > this.duration) {
                this.active = false;
            }
        }
    }

    draw() {
        if (this.active) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.length);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 添加闪电分支
            const branches = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < branches; i++) {
                const branchX = this.x + (Math.random() * 20 - 10);
                const branchY = this.y + (Math.random() * this.length / 2);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(branchX, branchY);
                ctx.stroke();
            }
        }
    }
}

// 风类
class Wind {
    constructor() {
        this.speed = Math.random() * 2 + 1; // 风速
        this.direction = Math.random() * 360; // 风向
    }

    update() {
        this.speed = Math.random() * 2 + 1;
        this.direction = Math.random() * 360;
    }

    applyToRaindrops(raindrops) {
        raindrops.forEach(raindrop => {
            const angle = this.direction * (Math.PI / 180);
            raindrop.x += Math.cos(angle) * this.speed;
            raindrop.y += Math.sin(angle) * this.speed;
            if (raindrop.x > canvas.width || raindrop.x < 0) {
                raindrop.reset();
            }
        });
    }
}

// 初始化雨滴、闪电和风
const raindrops = [];
const numRaindrops = 200;
for (let i = 0; i < numRaindrops; i++) {
    raindrops.push(new Raindrop());
}

const lightning = new Lightning();
const wind = new Wind();

// 动画循环
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制雨滴
    raindrops.forEach(raindrop => {
        raindrop.update();
        raindrop.draw();
    });

    // 更新和绘制闪电
    lightning.update();
    lightning.draw();

    // 应用风的效果
    wind.applyToRaindrops(raindrops);
    wind.update();

    requestAnimationFrame(animate);
}

animate();

// 蜡烛火焰熄灭效果
function blowOutCandle(candle) {
    const flame = candle.querySelector('.flame');
    if (flame.style.display !== 'none') {
        flame.style.display = 'none';
        new Tone.Synth().toDestination().triggerAttackRelease("C4", "8n");
        setTimeout(() => {
            document.body.style.backgroundColor = 
                `hsl(${Math.random() * 360}, 70%, 10%)`;
        }, 200);
    } else {
        flame.style.display = '';
        document.body.style.backgroundColor = ''; 
    }
}

// 纪念碑旋转效果
document.querySelectorAll('.tombstone').forEach(tomb => {
    let angle = 0;
    tomb.addEventListener('mousemove', (e) => {
        const rect = tomb.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        tomb.style.transform = `
            rotateY(${x * 15}deg) 
            rotateX(${-y * 15}deg)
            translateZ(20px)
        `;
    });
    tomb.addEventListener('mouseleave', () => {
        tomb.style.transform = '';
    });
});