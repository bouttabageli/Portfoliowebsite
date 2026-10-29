//board
var blockSize = 25;
var rows = 20;
var cols = 20;
var board;
var context;

//game state
var gameState = "START" // start, playing, game over
var score = 0;
var highScore = localStorage.getItem("snakeHighScore") || 0;   

//snake head
var snakeX = blockSize * 5;
var snakeY = blockSize * 5;
var velocityX = 0;
var velocityY = 0;
var snakeBody = [];

//food
var foodX;
var foodY;

//asset loader
const assets = {
    head: new Image(),
    body: new Image(),
    food: new Image()
};

// assets.head.src = "img/snake_head.png";
// assets.body.src = "img/snake_body.png";
// assets.food.src = "img/apple.png";

//touch controls
let touchStartX = 0;
let touchStartY = 0;

function isImageReady(img)
{
    return img && img.complete && img.naturalWidth !== 0;
}


window.onload = function() {
    board = document.getElementById("board");
    board.height = rows * blockSize;
    board.width = cols * blockSize;
    context = board.getContext("2d"); //used for rendering
    context.imageSmoothingEnabled = false; // keeps pixel art crisp when rendered
    placeFood();
    document.addEventListener("keydown", changeDirection);
    board.addEventListener("mousedown", handleCanvasClick);
    board.addEventListener("touchstart", handleTouchStart, {passive: false});
    board.addEventListener("touchend", handleTouchEnd, {passive: false});
    setInterval(update, 1000/6);
}

function startGame() 
{
    snakeX = blockSize * 5;
    snakeY = blockSize * 5;
    velocityX = 1;
    velocityY = 0;
    snakeBody = [];
    score = 0;
    placeFood();
    gameState = "PLAYING";
}

function handleGameOver()
{
    gameState = "GAMEOVER";
    if(score > highScore)
    {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
    }
}

function update() {

    context.fillStyle = "black";
    context.fillRect(0, 0, board.width, board.height);

    if(isImageReady(assets.food))
    {
        context.drawImage(assets.food, foodX, foodY, blockSize, blockSize);
    }
    else
    {
        context.fillStyle = "red"
        context.fillRect(foodX, foodY, blockSize, blockSize);
    }

    //update physics & positions only while playing
    if(gameState === "PLAYING")
    {
        //food collision
        if(snakeX == foodX && snakeY == foodY)
        {   
            snakeBody.push([foodX, foodY]);
            placeFood();
            score++;
        }
        //shift body segments forward
        for(let i = snakeBody.length-1; i > 0; i--) 
        {
            snakeBody[i] = snakeBody[i-1];
        }
        if(snakeBody.length)
        {
            snakeBody[0] = [snakeX, snakeY]
        }

        snakeX += velocityX * blockSize;
        snakeY += velocityY * blockSize;

        if(snakeX < 0 || snakeX > cols*blockSize-1 || snakeY < 0 || snakeY > rows*blockSize-1)
        {
            handleGameOver();
        }

        for(let i = 0; i < snakeBody.length; i++)
        {
            if(snakeX == snakeBody[i][0] && snakeY == snakeBody[i][1])
            {
                handleGameOver();
            }
        }
    }
    
    if(isImageReady(assets.head))
    {
        context.drawImage(assets.head, snakeX, snakeY, blockSize, blockSize);
    }
    else
    {
        context.fillStyle = "lime";
        context.fillRect(snakeX, snakeY, blockSize, blockSize);
    }
    
    for(let i = 0; i < snakeBody.length; i++)
    {
        if(isImageReady(assets.body))
        {
            context.drawImage(assets.body, snakeBody[i][0], snakeBody[i][1], blockSize, blockSize);
        }
        else
        {
            context.fillStyle = "lime";
            context.fillRect(snakeBody[i][0], snakeBody[i][1], blockSize, blockSize);
        }

        
    }
    // Draw border & score HUD
    context.strokeStyle = "#2563eb"; // Blue border
    context.lineWidth = 4;
    context.strokeRect(0, 0, board.width, board.height);

    if(gameState === "PLAYING")
    {
        context.fillStyle = "rgba(255, 255, 255, 0.85)";
        context.font = "bold 16px 'Poppins', sans-serif";
        context.textAlign = "left";
        context.fillText(`Score: ${score}`, 12, 24);

        context.textAlign = "right";
        context.fillStyle = "#94a3b8";
        context.fillText(`Best: ${highScore}`, board.width - 12, 24);
    }

    // Render Overlays for start and game over
    if(gameState !== "PLAYING")
    {
        context.fillStyle = "rgba(255, 255, 255, 0.75)"
        context.fillRect(0, 0, board.width, board.height);

        context.fillStyle = "#000";
        context.textAlign = "center";

        if(gameState === "START")
        {
            context.font = "bold 36px 'Poppins', sans-serif";
            context.fillText("SNAKE", board.width / 2, board.height / 2 - 40);

            context.font = "15px 'Poppins', sans-serif";
            context.fillStyle = "#3584de";
            context.fillText("Use Arrow Keys, WASD, or Swipe to change direction", board.width / 2, board.height / 2 + 5);

            context.fillStyle = "#000";
            context.fillText("Press Space or Tap to Start", board.width / 2, board.height / 2 + 45);
        }
        else if(gameState === "GAMEOVER")
        {
            context.font = "bold 36px 'Poppins', sans-serif";
            context.fillStyle = "#ef4444";
            context.fillText("GAME OVER", board.width / 2, board.height / 2 - 45);

            context.font = "bold 20px 'Poppins', sans-serif";
            context.fillStyle = "#000";
            context.fillText(`Final Score: ${score}`, board.width / 2, board.height / 2 - 5);

            context.font = "14px 'Poppins', sans-serif";
            context.fillStyle = "#94a3b8";
            context.fillText(`High Score: ${highScore}`, board.width / 2, board.height / 2 + 25);

            context.font = "15px 'Poppins', sans-serif";
            context.fillStyle = "#000";
            context.fillText("Press Space or Tap to Play Again", board.width / 2, board.height / 2 + 65);
        }
    }

}


function changeDirection(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if(e.code === "Space")
    {
        if(gameState !== "PLAYING")
        {
            startGame();
        }
        return;
    }

    if(gameState !== "PLAYING") return;
    
    if((e.code === "ArrowUp" || e.code === "KeyW") && velocityY != 1) {
        velocityX = 0;
        velocityY = -1;
    }
    else if((e.code === "ArrowDown" || e.code === "KeyS") && velocityY != -1) {
        velocityX = 0;
        velocityY = 1;
    }
    else if((e.code === "ArrowLeft" || e.code === "KeyA") && velocityX != 1) {
        velocityX = -1;
        velocityY = 0;
    }
    else if((e.code === "ArrowRight" || e.code === "KeyD") && velocityX != -1) {
        velocityX = 1;
        velocityY = 0;
    }
}

function handleCanvasClick(e)
{
    if(e.button === 0 && gameState !== "PLAYING")
    {
        startGame();
    }
}

//touch controls
function handleTouchStart(e)
{
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    if(gameState !== "PLAYING")
    {
        startGame();
    }
}

function handleTouchEnd(e)
{
    e.preventDefault();
    if(gameState !== "PLAYING") return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if(Math.abs(dx) > Math.abs(dy))
    {
        if(dx > 0 && velocityX !== -1)
        {
            velocityX = 1;
            velocityY = 0;
        }
        else if(dx < 0 && velocityX !== 1 )
        {
            velocityX = -1;
            velocityY = 0;  
        }
    }
    else
    {
        if(dy > 0 && velocityY !== -1)
        {
            velocityX = 0;
            velocityY = 1;
        }
        else if(dy < 0 && velocityY !== -1)
        {
            velocityX = 0;
            velocityY = -1
        }
    }
}

function placeFood() {
    foodX = Math.floor(Math.random() * cols) * blockSize;
    foodY = Math.floor(Math.random() * rows) * blockSize;
}