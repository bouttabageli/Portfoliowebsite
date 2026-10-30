const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

// * GAME STATE & CONFIG *
let gameState = "START"; // START, PLAYING, VICTORY, GAMEOVER
let lastTime = 0;

// * ASSET LOADER *
const assets = {
    background: new Image(),
    opponentIdle: new Image(),
    opponentWindupLeft: new Image(),
    opponentWindupRight: new Image(),
    opponentWindupUppercut: new Image(),
    opponentAttacking: new Image(),
    opponentStunned: new Image(),
    playerGloveLeft: new Image(),
    playerGloveRight: new Image()
};
// Uncomment when sprites are present
 assets.background.src = "img/ringbg.webp";
// assets.opponentIdle.src = "img/opponent-idle.webp";
// assets.opponentWindupLeft.src = "img/opponent-windup-left.webp";
// assets.opponentWindupRight.src = "img/opponent-windup-right.webp";
// assets.opponentWindupUppercut.src = "img/opponent-windup-uppercut.webp";
// assets.opponentAttacking.src = "img/opponent-attack.webp";
// assets.opponentStunned.src = "img/opponent-stunned.webp";
// assets.playerGloveLeft.src = "img/glove-left.webp";
// assets.playerGloveRight.src = "img/glove-right.webp";

function isImageReady(img) {
    return img && img.complete && img.naturalWidth !== 0;
}

// * ENTITIES *
const player = {
    maxHp: 5,
    hp: 5,
    state: "IDLE", // IDLE, BLOCKING, LEFT_HOOK, RIGHT_JAB, HIT
    stateTimer: 0,
    holdingBlock: false
};

const opponent = {
    maxHp: 5,
    hp: 5,
    // IDLE, WINDUP_LEFT, WINDUP_RIGHT, WINDUP_UPPERCUT, ATTACKING, STUNNED
    state: "IDLE",
    stateTimer: 0,
    aiCooldown: 1.5,
    attackType: null, // "LEFT", "RIGHT", "UPPERCUT"
    shakeX: 0
};

let popups = [];
let screenFlashTimer = 0;
let screenFlashColor = "rgba(255, 0, 0, 0.35)";

function addPopup(text, x, y, color = "#ffffff") {
    popups.push({ text, x, y, color, alpha: 1.0, vy: -50 });
}

// * GAME INITIALIZATION *
function startGame() {
    player.hp = player.maxHp;
    player.state = "IDLE";
    player.stateTimer = 0;
    player.holdingBlock = false;

    // Randomize opponent health between 5 and 10 inclusive
    opponent.maxHp = Math.floor(Math.random() * 6) + 5;
    opponent.hp = opponent.maxHp;
    opponent.state = "IDLE";
    opponent.stateTimer = 0;
    opponent.aiCooldown = 1.2;
    opponent.attackType = null;

    popups = [];
    screenFlashTimer = 0;
    gameState = "PLAYING";
    lastTime = performance.now();
}

// * PLAYER ACTIONS *
function startBlock() {
    if (gameState !== "PLAYING") return;
    player.holdingBlock = true;
    if (player.state === "IDLE") {
        player.state = "BLOCKING";
    }
}

function stopBlock() {
    player.holdingBlock = false;
    if (player.state === "BLOCKING") {
        player.state = "IDLE";
    }
}

function throwPunch(side) {
    if (gameState !== "PLAYING") return;
    // Can only throw a punch from IDLE or BLOCKING
    if (player.state !== "IDLE" && player.state !== "BLOCKING") return;

    player.state = side === "LEFT" ? "LEFT_HOOK" : "RIGHT_JAB";
    player.stateTimer = 0.28; // Punch animation duration

    resolvePlayerPunch(side);
}

function resolvePlayerPunch(side) {
    // Check if opponent is winding up on the SAME side (guard lowered on that side)
    if (
        (side === "LEFT" && opponent.state === "WINDUP_LEFT") ||
        (side === "RIGHT" && opponent.state === "WINDUP_RIGHT")
    ) {
        opponent.hp--;
        opponent.state = "STUNNED";
        opponent.stateTimer = 0.65;
        opponent.shakeX = 12;
        addPopup("COUNTER!", canvas.width / 2, 210, "#facc15");

        if (opponent.hp <= 0) {
            opponent.hp = 0;
            gameState = "VICTORY";
        }
    } else if (opponent.state === "WINDUP_UPPERCUT") {
        addPopup("GUARD UP!", canvas.width / 2, 230, "#94a3b8");
    } else {
        addPopup("BLOCKED!", canvas.width / 2, 230, "#cbd5e1");
    }
}

// * INPUT HANDLING (Desktop Keyboard + Mobile/Mouse Touch Zones) *
window.addEventListener("keydown", (e) => {
    if (["KeyW", "KeyA", "KeyD", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (gameState !== "PLAYING") {
        if (e.code === "Space") startGame();
        return;
    }

    if (e.repeat) return;

    if (e.code === "KeyW") {
        startBlock();
    } else if (e.code === "KeyA") {
        throwPunch("LEFT");
    } else if (e.code === "KeyD") {
        throwPunch("RIGHT");
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") {
        stopBlock();
    }
});

function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handlePointerDown(clientX, clientY) {
    if (gameState !== "PLAYING") {
        startGame();
        return;
    }

    const pos = getCanvasCoords(clientX, clientY);
    const twoThirdsY = (canvas.height * 2) / 3; // y = 426.67

    if (pos.y >= twoThirdsY) {
        // Bottom 1/3: Hold to block
        startBlock();
    } else {
        // Upper 2/3: Split left and right for punches
        if (pos.x < canvas.width / 2) {
            throwPunch("LEFT");
        } else {
            throwPunch("RIGHT");
        }
    }
}

// Mouse listeners
canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        handlePointerDown(e.clientX, e.clientY);
    }
});

window.addEventListener("mouseup", () => {
    stopBlock();
});

// Touch listeners
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerDown(t.clientX, t.clientY);
    }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const twoThirdsY = (canvas.height * 2) / 3;
    let stillHoldingBottom = false;

    for (let i = 0; i < e.touches.length; i++) {
        const pos = getCanvasCoords(e.touches[i].clientX, e.touches[i].clientY);
        if (pos.y >= twoThirdsY) {
            stillHoldingBottom = true;
            break;
        }
    }

    if (!stillHoldingBottom) {
        stopBlock();
    }
}, { passive: false });

canvas.addEventListener("touchcancel", () => {
    stopBlock();
});

// * UPDATE LOOP *
function update(dt) {
    if (gameState !== "PLAYING") return;

    if (screenFlashTimer > 0) {
        screenFlashTimer -= dt;
    }

    // Update Player State Timer
    if (player.state === "LEFT_HOOK" || player.state === "RIGHT_JAB" || player.state === "HIT") {
        player.stateTimer -= dt;
        if (player.stateTimer <= 0) {
            player.state = player.holdingBlock ? "BLOCKING" : "IDLE";
        }
    }

    // Opponent shake decay
    if (opponent.shakeX > 0) {
        opponent.shakeX = Math.max(0, opponent.shakeX - dt * 40);
    }

    // Update Opponent AI State Machine
    if (opponent.state === "IDLE") {
        opponent.aiCooldown -= dt;
        if (opponent.aiCooldown <= 0) {
            const roll = Math.random();
            if (roll < 0.4) {
                opponent.state = "WINDUP_LEFT";
                opponent.attackType = "LEFT";
                opponent.stateTimer = 0.85; // Counter window
            } else if (roll < 0.8) {
                opponent.state = "WINDUP_RIGHT";
                opponent.attackType = "RIGHT";
                opponent.stateTimer = 0.85; // Counter window
            } else {
                opponent.state = "WINDUP_UPPERCUT";
                opponent.attackType = "UPPERCUT";
                opponent.stateTimer = 1.0; // Warning window to block
            }
        }
    } else if (
        opponent.state === "WINDUP_LEFT" ||
        opponent.state === "WINDUP_RIGHT" ||
        opponent.state === "WINDUP_UPPERCUT"
    ) {
        opponent.stateTimer -= dt;
        if (opponent.stateTimer <= 0) {
            // Opponent throws the punch
            opponent.state = "ATTACKING";
            opponent.stateTimer = 0.25;

            if (player.state === "BLOCKING") {
                addPopup("BLOCKED!", canvas.width / 2, 430, "#38bdf8");
                screenFlashColor = "rgba(56, 189, 248, 0.2)";
                screenFlashTimer = 0.12;
            } else {
                player.hp--;
                player.state = "HIT";
                player.stateTimer = 0.4;
                addPopup("OUCH! -1", canvas.width / 2, 430, "#ef4444");
                screenFlashColor = "rgba(239, 68, 68, 0.45)";
                screenFlashTimer = 0.2;

                if (player.hp <= 0) {
                    player.hp = 0;
                    gameState = "GAMEOVER";
                }
            }
        }
    } else if (opponent.state === "ATTACKING" || opponent.state === "STUNNED") {
        opponent.stateTimer -= dt;
        if (opponent.stateTimer <= 0) {
            opponent.state = "IDLE";
            // Faster attacks as opponent gets lower on HP
            const speedBoost = (1 - opponent.hp / opponent.maxHp) * 0.45;
            opponent.aiCooldown = Math.max(0.55, 1.3 - speedBoost + Math.random() * 0.5);
        }
    }

    // Update Popups
    for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y += p.vy * dt;
        p.alpha -= dt * 1.3;
        if (p.alpha <= 0) popups.splice(i, 1);
    }
}

// * RENDERING / DRAW LOOP *
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background (Boxing Ring)
    if (isImageReady(assets.background)) {
        ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    } else {
        // Crowd / Arena dark top
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, 180);

        // Ring Mat
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(0, 180, canvas.width, canvas.height - 180);

        // Ring Posts
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(10, 90, 16, 110);
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(canvas.width - 26, 90, 16, 110);

        // Ring Ropes
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 4;
        [115, 145, 175].forEach((ry) => {
            ctx.beginPath();
            ctx.moveTo(0, ry);
            ctx.lineTo(canvas.width, ry);
            ctx.stroke();
        });
    }

    // 2. Subtle Control Zone Guides during gameplay
    const twoThirdsY = Math.floor((canvas.height * 2) / 3);
    if (gameState === "PLAYING") {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;

        // Horizontal split (upper 2/3 vs bottom 1/3)
        ctx.beginPath();
        ctx.moveTo(0, twoThirdsY);
        ctx.lineTo(canvas.width, twoThirdsY);
        ctx.stroke();

        // Vertical split in upper 2/3 (Left Hook vs Right Jab)
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 60);
        ctx.lineTo(canvas.width / 2, twoThirdsY);
        ctx.stroke();

        ctx.setLineDash([]); //reset line dash

        // Zone Watermark Labels
        function drawZoneBadge(text, centerX, centerY) {
            ctx.font = "bold 11px 'Poppins', sans-serif";
            const textMetrics = ctx.measureText(text);
            const paddingX = 10;
            const paddingY = 5;
            const boxWidth = textMetrics.width + paddingX * 2;
            const boxHeight = 22;
            const boxX = centerX - boxWidth / 2;
            const boxY = centerY - boxHeight / 2;
            const radius = 6;

            // Background badge box
            ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            ctx.lineWidth = 1;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
            } else {
                ctx.rect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.fill();
            ctx.stroke();

            // Badge text
            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, centerX, centerY + 0.5);
        }

        // Render the 3 zone badges
        drawZoneBadge("LEFT HOOK (A)", canvas.width / 4, twoThirdsY - 20);
        drawZoneBadge("RIGHT JAB (D)", (canvas.width * 3) / 4, twoThirdsY - 20);
        drawZoneBadge("HOLD TO BLOCK (W)", canvas.width / 2, canvas.height - 24);

        ctx.restore();
    }

    // 3. Draw Opponent (Placeholder 2D Boxer)
    drawOpponent();

    // 4. Draw Player Gloves (Bottom 1/3 of screen)
    drawPlayerGloves();

    // 5. Screen Flash Effect (on hit or block)
    if (screenFlashTimer > 0) {
        ctx.fillStyle = screenFlashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 6. Draw HUD (Health Bars)
    drawHUD();

    // 7. Draw Floating Popups
    popups.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.font = "bold 22px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    });

    // 8. State Overlays (START, VICTORY, GAMEOVER)
    if (gameState !== "PLAYING") {
        drawOverlay();
    }
}

function drawOpponent() {
    ctx.save();
    const shakeOffset = opponent.shakeX ? Math.sin(performance.now() * 0.08) * opponent.shakeX : 0;
    const centerX = canvas.width / 2 + shakeOffset;
    const baseY = 370;

    // Determine the active sprite according to current AI state
    let activeSprite = null;
    switch (opponent.state) {
        case "WINDUP_LEFT":
            activeSprite = assets.opponentWindupLeft;
            break;
        case "WINDUP_RIGHT":
            activeSprite = assets.opponentWindupRight;
            break;
        case "WINDUP_UPPERCUT":
            activeSprite = assets.opponentWindupUppercut;
            break;
        case "ATTACKING":
            activeSprite = assets.opponentAttacking;
            break;
        case "STUNNED":
            activeSprite = assets.opponentStunned;
            break;
        case "IDLE":
        default:
            activeSprite = assets.opponentIdle;
            break;
    }

    // Telegraphed Warnings & Indicators (Always displayed for gameplay clarity)
    if (opponent.state === "WINDUP_UPPERCUT") {
        ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
        ctx.beginPath();
        ctx.arc(centerX, baseY, 95, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 16px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠ UPPERCUT! BLOCK! ⚠", centerX, 145);
    } else if (opponent.state === "WINDUP_LEFT") {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 15px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⬅ COUNTER LEFT!", centerX - 45, 150);
    } else if (opponent.state === "WINDUP_RIGHT") {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 15px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("COUNTER RIGHT! ➡", centerX + 45, 150);
    }

    // PRIMARY RENDER: Use image sprite if available
    if (isImageReady(activeSprite)) {
        // Suggested placeholder sprite size (approx 180w x 220h)
        const spriteWidth = 180;
        const spriteHeight = 220;
        const spriteX = centerX - spriteWidth / 2;
        const spriteY = baseY - 100; // Aligns sprite over the upper torso area

        ctx.drawImage(activeSprite, spriteX, spriteY, spriteWidth, spriteHeight);
    } else {
        // FALLBACK: 2D Canvas Procedural Boxer
        // Torso
        ctx.fillStyle = opponent.state === "STUNNED" ? "#fca5a5" : "#d97706";
        ctx.fillRect(centerX - 48, baseY - 30, 96, 110);

        // Shorts
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(centerX - 50, baseY + 80, 100, 35);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(centerX - 50, baseY + 80, 100, 8);

        // Head
        ctx.fillStyle = opponent.state === "STUNNED" ? "#fecaca" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(centerX, baseY - 60, 34, 0, Math.PI * 2);
        ctx.fill();

        // Eyes / Expression
        ctx.fillStyle = "#111827";
        if (opponent.state === "STUNNED") {
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("X   X", centerX, baseY - 58);
        } else {
            ctx.fillRect(centerX - 16, baseY - 68, 10, 6);
            ctx.fillRect(centerX + 6, baseY - 68, 10, 6);
        }

        // Glove positioning logic for procedural shapes
        let leftGloveX = centerX - 38;
        let leftGloveY = baseY - 48;
        let rightGloveX = centerX + 38;
        let rightGloveY = baseY - 48;
        let leftRadius = 22;
        let rightRadius = 22;

        if (opponent.state === "WINDUP_LEFT") {
            leftGloveX = centerX - 82;
            leftGloveY = baseY + 25;
        } else if (opponent.state === "WINDUP_RIGHT") {
            rightGloveX = centerX + 82;
            rightGloveY = baseY + 25;
        } else if (opponent.state === "WINDUP_UPPERCUT") {
            leftGloveX = centerX - 24;
            leftGloveY = baseY - 52;
            rightGloveX = centerX + 24;
            rightGloveY = baseY - 52;
        } else if (opponent.state === "ATTACKING") {
            if (opponent.attackType === "LEFT") {
                leftGloveX = centerX - 20;
                leftGloveY = baseY + 95;
                leftRadius = 36;
            } else if (opponent.attackType === "RIGHT") {
                rightGloveX = centerX + 20;
                rightGloveY = baseY + 95;
                rightRadius = 36;
            } else {
                leftGloveY = baseY + 90;
                rightGloveY = baseY + 90;
                leftRadius = 34;
                rightRadius = 34;
            }
        } else if (opponent.state === "STUNNED") {
            leftGloveX = centerX - 70;
            leftGloveY = baseY + 10;
            rightGloveX = centerX + 70;
            rightGloveY = baseY + 10;
        }

        // Draw Left Glove
        ctx.fillStyle = opponent.state === "WINDUP_LEFT" ? "#ef4444" : "#b91c1c";
        ctx.beginPath();
        ctx.arc(leftGloveX, leftGloveY, leftRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#450a0a";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Right Glove
        ctx.fillStyle = opponent.state === "WINDUP_RIGHT" ? "#ef4444" : "#b91c1c";
        ctx.beginPath();
        ctx.arc(rightGloveX, rightGloveY, rightRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function drawPlayerGloves() {
    // Player gloves rest in the bottom third of the screen (y >= 426)
    let leftX = 95;
    let leftY = 535;
    let rightX = canvas.width - 95;
    let rightY = 535;

    //Dimensions use when drawing sprite
    const gloveW = 76;
    const gloveH = 76;



    if (player.state === "BLOCKING") {
        // Raise gloves high and tight to block
        leftX = 130;
        leftY = 455;
        rightX = canvas.width - 130;
        rightY = 455;
    } else if (player.state === "LEFT_HOOK") {
        // Punch toward opponent's left side
        leftX = 145;
        leftY = 360;
    } else if (player.state === "RIGHT_JAB") {
        // Punch toward opponent's right side
        rightX = canvas.width - 145;
        rightY = 360;
    } else if (player.state === "HIT") {
        leftY = 575;
        rightY = 575;
    }

    if(isImageReady(assets.playerGloveLeft))
    {
        ctx.drawImage(assets.playerGloveLeft, leftX - gloveW / 2, leftY - gloveH / 2, gloveW, gloveH);
    }
    else
    {
        // Draw Left Player Glove
        ctx.save();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(leftX, leftY, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#14532d";
        ctx.stroke();
        // Glove cuff
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(leftX - 24, leftY + 26, 48, 18);
    }

    if(isImageReady(assets.playerGloveRight))
    {
        ctx.drawImage(assets.playerGloveRight, rightX - gloveW / 2, rightY - gloveH / 2, gloveW, gloveH);
    }
    else
    {
        // Draw Right Player Glove
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(rightX, rightY, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Glove cuff
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(rightX - 24, rightY + 26, 48, 18);
    }    
    ctx.restore();
}

function drawHUD() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, canvas.width, 54);

    // Player HP (Left)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px 'Poppins', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`YOU (${player.hp}/${player.maxHp})`, 14, 18);

    ctx.fillStyle = "#334155";
    ctx.fillRect(14, 25, 130, 16);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(14, 25, (player.hp / player.maxHp) * 130, 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, 25, 130, 16);

    // Opponent HP (Right)
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(`CHAMP (${opponent.hp}/${opponent.maxHp})`, canvas.width - 14, 18);

    ctx.fillStyle = "#334155";
    ctx.fillRect(canvas.width - 144, 25, 130, 16);
    ctx.fillStyle = "#ef4444";
    const oppWidth = (opponent.hp / opponent.maxHp) * 130;
    ctx.fillRect(canvas.width - 14 - oppWidth, 25, oppWidth, 16);
    ctx.strokeRect(canvas.width - 144, 25, 130, 16);
}

function drawOverlay() {
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";

    if (gameState === "START") {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 44px 'Poppins', sans-serif";
        ctx.fillText("BOXER", canvas.width / 2, 110);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px 'Poppins', sans-serif";
        ctx.fillText("HOW TO WIN", canvas.width / 2, 160);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "13px 'Poppins', sans-serif";
        ctx.fillText("Watch the opponent! When they wind up", canvas.width / 2, 185);
        ctx.fillText("a Left or Right punch, their guard drops", canvas.width / 2, 205);
        ctx.fillText("on that side—punch that same side to", canvas.width / 2, 225);
        ctx.fillText("land a counter! If they glow for an", canvas.width / 2, 245);
        ctx.fillText("Uppercut, their guard stays up: BLOCK!", canvas.width / 2, 265);
        ctx.fillText("KO the Champ (5–10 HP) before taking 5 hits.", canvas.width / 2, 290);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 16px 'Poppins', sans-serif";
        ctx.fillText("CONTROLS", canvas.width / 2, 340);

        ctx.fillStyle = "#ffffff";
        ctx.font = "13px 'Poppins', sans-serif";
        ctx.fillText("• Left Hook: Tap Top-Left or press [A]", canvas.width / 2, 368);
        ctx.fillText("• Right Jab: Tap Top-Right or press [D]", canvas.width / 2, 392);
        ctx.fillText("• Block: Hold Bottom 1/3 or hold [W]", canvas.width / 2, 416);

        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 18px 'Poppins', sans-serif";
        ctx.fillText("Tap Anywhere or Press SPACE", canvas.width / 2, 510);
    } else if (gameState === "VICTORY") {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 40px 'Poppins', sans-serif";
        ctx.fillText("KNOCKOUT!", canvas.width / 2, 260);

        ctx.fillStyle = "#ffffff";
        ctx.font = "20px 'Poppins', sans-serif";
        ctx.fillText("You are the Boxing Champion!", canvas.width / 2, 310);

        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 18px 'Poppins', sans-serif";
        ctx.fillText("Tap or Press SPACE to Fight Again", canvas.width / 2, 380);
    } else if (gameState === "GAMEOVER") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 40px 'Poppins', sans-serif";
        ctx.fillText("KNOCKED OUT!", canvas.width / 2, 260);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "18px 'Poppins', sans-serif";
        ctx.fillText(`Opponent had ${opponent.hp} HP remaining`, canvas.width / 2, 310);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px 'Poppins', sans-serif";
        ctx.fillText("Tap or Press SPACE to Try Again", canvas.width / 2, 380);
    }
}

// * MAIN GAME LOOP *
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((timestamp) => {
    lastTime = timestamp;
    gameLoop(timestamp);
});