const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

//disable smoothing to keep pixel art crisp
ctx.imageSmoothingEnabled = false;

//*game config*
const game_duration = 60; //static time limit in seconds
let gameState = "START"; // start, playing, game over
let score = 0;
let highScore = localStorage.getItem("treatCatcherHighscore") || 0;
let streak = 0;
let timeLeft = game_duration;
let lastTime = 0;

//*asset loader*
const assets = 
{
    background: new Image(),
    catStand: new Image(),
    catRun1: new Image(),
    catRun2: new Image(),
    treat: new Image()
};

// assets.background.src = "img/picnic-background.png";
// assets.catStand.src = "img/cat-stand.png";
// assets.catRun1.src = "img/cat-run1.png";
// assets.catRun2.src = "img/cat-run2.png";
// assets.treat.src = "img/treat.png";

//*ENTITIES*

//player
const player = 
{
    width: 84,
    height: 64,
    x: canvas.width / 2 - 42,
    y: canvas.height - 85,
    speed: 550, //pixels per second
    vx: 0,
    facingLeft: false,
    isMoving: false,
    animTimer: 0,
    animFrame: 0
};

//treat dropper
const dropper = 
{
    width: 60,
    height: 40,
    x: canvas.width / 2 - 30,
    y: 45,
    vx: 260,
    targetX: Math.random() * (canvas.width - 160) + 80,
    dropTimer: 0,
    dropInterval: 0.65 //seconds between treats
};

//active falling treats & score popups
let treats = [];
let popups = [];

//*input handling*
const keys =
{
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false
};

let useMouse = false;
let mouseX = player.x;

window.addEventListener("keydown", (e) => {
    if(keys.hasOwnProperty(e.code))
    {
        keys[e.code] = true;
        useMouse = false; //switch to keyboard
    }
    if(e.code === "Space" && gameState != "PLAYING")
    {
        startGame();
    }
});

window.addEventListener("keyup", (e) => {
    if(keys.hasOwnProperty(e.code))
    {
        keys[e.code] = false;
    }
});

function getCanvasCoords(clientX, clientY)
{
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

//mouse control
canvas.addEventListener("mousemove", (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    mouseX = coords.x;
    useMouse = true;
});

canvas.addEventListener("mousedown", () => {
    if(gameState != "PLAYING")
    {
        StartGame();
    }
});

//mobile touch controls


canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (gameState !== "PLAYING") {
    StartGame();
  } else {
    handleTouchMove(e);
  }
}, { passive: false });

canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

function handleTouchMove(e) {
  e.preventDefault(); // Stop mobile screen from scrolling while dragging
  const touch = e.touches[0];
  const coords = getCanvasCoords(touch.clientX, touch.clientY);
  mouseX = coords.x;
  useMouse = true;
}

//*game functions*
function StartGame() 
{
    score = 0;
    streak = 0;
    timeLeft = game_duration;
    treats = [];
    popups = [];
    player.x = canvas.width / 2 - player.width / 2;
    dropper.x = canvas.width / 2 - dropper.width / 2;
    gameState = "PLAYING";
    lastTime = performance.now();
}

function spawnTreat() 
{
    const progress = 1 - (timeLeft / game_duration);
    const fallSpeed = 240 + (progress * 260);

    //chance for a golden treat worht 3x points (15%)
    const isGolden = Math.random() < 0.15;

    treats.push({
        x: dropper.x + dropper.width / 2 - 16,
        y: dropper.y + dropper.height,
        width: 32,
        height: 32,
        vy: isGolden ? fallSpeed * 1.25 : fallSpeed,
        points: isGolden ?  30 : 10,
        isGolden: isGolden
    });
}

function addPopup(text, x, y, color = "white") 
{
    popups.push({text, x, y, color, alpha: 1.0, vy: -60});
}

//*update loop*
function update(dt) 
{
    if(gameState !== "PLAYING") return;

    //update countdown timer
    timeLeft -= dt;
    if(timeLeft <= 0)
    {
        timeLeft = 0;
        gameState = "GAMEOVER";
        if(score > highScore)
        {
            highScore = score;
            localStorage.setItem("treatCatcherHighScore", highScore);
        }
        return;
    }

    //difficulty multiplier, increases as time gets closer to 0
    const progress = 1 - (timeLeft / game_duration);

    //update player movement
    const prevX = player.x;

    if(useMouse) 
    {
        const target = mouseX - player.width / 2;
        const diff = target - player.x;
        player.x += diff * 0.25; //smooth lerp toward cursor
    } 
    else 
    {
        player.vx = 0;
        if(keys.ArrowLeft || keys.KeyA) player.vx = -player.speed;
        if(keys.ArrowRight || keys.KeyD) player.vx = player.speed;
        player.x += player.vx * dt;
    }

    //clamp player inside screen bounds
    if(player.x < 0) player.x = 0;
    if(player.x + player.width > canvas.width)
    {
        player.x = canvas.width - player.width;
    }

    //determine direction and animation state
    const deltaX = player.x - prevX;
    player.isMoving = Math.abs(deltaX) > 0.5;
    if(deltaX < -0.5) player.facingLeft = true;
    if(deltaX > 0.5) player.facingLeft = false;
    if(player.isMoving)
    {
        player.animTimer += dt;
        if(player.animTimer >= 0.1) //swap run frames every 100ms
        {
            player.animFrame = (player.animFrame + 1) % 3;
            player.animTimer = 0;
        }
    }
    else
    {
        player.animFrame = 0;
    }

    //update dropper AI
    const currentDropperSpeed = dropper.vx + (progress * 280);
    if(Math.abs(dropper.x - dropper.targetX) < 10)
    {
        dropper.targetX = Math.random() * (canvas.width - 160) + 50;
    }
    else if(dropper.x < dropper.targetX)
    {
        dropper.x += currentDropperSpeed * dt;
    }
    else
    {
        dropper.x -= currentDropperSpeed * dt;
    }
    //dropper spawning timer
    dropper.dropInterval = Math.max(0.22, 0.65 - (progress * 0.40));
    dropper.dropTimer += dt;
    if(dropper.dropTimer >= dropper.dropInterval)
    {
        spawnTreat();
        dropper.dropTimer = 0;
    }

    //update falling treats & check collision
    for(let i = treats.length - 1; i >= 0; i--)
    {
        const t = treats[i];
        t.y += t.vy * dt;

        //AABB collision check with player
        const hitX = t.x < player.x + player.width && t.x + t.width > player.x;
        const hitY = t.y < player.y + player.height && t.y + t.height > player.y;
        if(hitX && hitY)
        {
            streak++;
            const multiplier = Math.min(3, 1 + Math.floor(streak / 10));
            const earned = t.points * multiplier;
            score += earned;

            addPopup(`+${earned}`, t.x, player.y, t.isGolden ? "#ffd700" : "#ffffff");
            treats.splice(i, 1);
            continue;
        }
        //missed treat, reset streak
        if(t.y > canvas.height) {
            if(streak >= 5)
            {
                addPopup("Streak Lost!", t.x, canvas.height - 30, "#ff6b6b");
            }
            streak = 0;
            treats.splice(i, 1);
        }
    }
    //update popups
    for(let i = popups.length - 1; i >= 0; i--)
    {
        const p = popups[i];
        p.y += p.vy * dt;
        p.alpha -= dt * 1.4;
        if(p.alpha <= 0) popups.splice(i, 1);
    }   
}

//*rendering/draw loop*
function draw()
{
    //background
    if(assets.background.complete && assets.background.naturalWidth !== 0)
    {
        ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    } 
    else 
    {
        ctx.fillStyle = "#5c9e57";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#4a8246";
        ctx.fillRect(0, canvas.height - 35, canvas.width, 35);
    }

    //heads up display
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, 42);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px 'Poppins', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${score}`, 20, 28);

    if(streak >= 5)
    {
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`STREAK: ${streak}x`, 190, 28);
    }

    ctx.textAlign = "right";
    ctx.fillStyle = "#cccccc";
    ctx.fillText(`BEST: ${highScore}`, canvas.width - 20, 28);

    //dropper
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(dropper.x, dropper.y, dropper.width, dropper.height);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(dropper.x + 8, dropper.y + 8, dropper.width - 16, dropper.height - 16);

    //draw falling treats
    treats.forEach((t) => {
        if(assets.treat.complete && assets.treat.naturalWidth !== 0)
        {
            ctx.drawImage(assets.treat, t.x, t.y, t.width, t.height);
        }
        else
        {
            ctx.fillStyle = t.isGolden ? "#ffd700" : "#ff8a65";
            ctx.beginPath();
            ctx.arc(t.x + t.width / 2, t.y + t.height / 2, t.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#bf360c";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    //draw player
    ctx.save();
    if(player.facingLeft)
    {
        ctx.translate(player.x + player.width, player.y);
        ctx.scale(-1, 1);
    }
    else
    {
        ctx.translate(player.x, player.y);
    }

    let currentCatImg = player.isMoving ? (player.animFrame === 0 ? assets.catRun1 : assets.catRun2) : assets.catStand;
    if(currentCatImg.complete && currentCatImg.naturalWidth !== 0)
    {
        ctx.drawImage(currentCatImg, 0, 0, player.width, player.height);
    }
    else
    {
        //placeholder
        ctx.fillStyle = "#ff9800";
        ctx.fillRect(0, 14, player.width, player.height - 14);
        //cat ears
        ctx.beginPath();
        ctx.moveTo(8, 14);
        ctx.lineTo(18, 0);
        ctx.lineTo(28, 14);
        ctx.moveTo(player.width - 28, 14);
        ctx.lineTo(player.width - 18, 0);
        ctx.lineTo(player.width - 8, 14);
        ctx.fill();
    }
    ctx.restore();

    //popups
    popups.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.font = "bold 18px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x + 16, p.y);
        ctx.restore();
    });

    //Overlays (start & game over)
    if(gameState !== "PLAYING")
    {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";

        if(gameState === "START")
        {
            ctx.font = "bold 46px 'Poppins', sans-serif";
            ctx.fillText("TREAT CATCHER", canvas.width / 2, canvas.height / 2 - 40);
            ctx.font = "20px 'Poppins', sans-serif";
            ctx.fillStyle = "#ffd700";
            ctx.fillText("Use Arrow Keys, A/D, or touch + drag to catch falling treats!", canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Press SPACE or touch to start", canvas.width / 2, canvas.height / 2 + 55);
        }
        else if(gameState === "GAMEOVER")
        {
            ctx.font = "bold 46px 'Poppins', sans-serif";
            ctx.fillText("TIME'S UP!", canvas.width / 2, canvas.height / 2 - 50);
            ctx.font = "bold 28px 'Poppins', sans-serif";
            ctx.fillStyle = "#ffd700";
            ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
            ctx.font = "20px 'Poppins', sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("Press SPACE or touch to play again", canvas.width / 2, canvas.height / 2 + 55);
        }
    }
}

//*game loop*
function gameLoop(timestamp)
{
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); //cap delta time
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
});

