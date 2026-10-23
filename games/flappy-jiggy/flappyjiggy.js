//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//jiggy
let jiggyWidth = 68;
let jiggyHeight = 64;
let jiggyX = boardWidth/8;
let jiggyY = boardHeight/2;
let jiggyImgs = [];
let jiggyImgsIndex = 0;

let jiggy = 
{
    x: jiggyX,
    y: jiggyY,
    width: jiggyWidth,
    height: jiggyHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2; //pipe move speed
let velocityY = 0; //jiggy jump speed   
let gravity = 0.2;

let gameOver = false;
let score = 0;

window.onload = function()
{
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");
    //load images
    for(let i = 0; i < 4; i++)
    {
        let jiggyImg = new Image();
        jiggyImg.src = `./img/flappyjiggy${i}.webp`;
        jiggyImgs.push(jiggyImg);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./img/toppipe.webp";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./img/bottompipe.webp";
    
    requestAnimationFrame(update);
    setInterval(placePipes, 1800);
    setInterval(animateJiggy, 100);
    document.addEventListener("keydown", moveJiggy);
    board.addEventListener("mousedown", (e) => {
        if(e.button === 0)
        {
            flap();
        }
    });
    board.addEventListener("touchstart", (e) => {
        e.preventDefault();
        flap();
    }, {passive: false});
}

function update()
{
    requestAnimationFrame(update);
    if(gameOver)
    {
        return;
    }
    context.clearRect(0, 0, board.width, board.height);
    //jiggy
    velocityY += gravity;
    jiggy.y = Math.max(jiggy.y + velocityY, 0); //apply gravity to jiggy but don't let him go past the top of canvas
    context.drawImage(jiggyImgs[jiggyImgsIndex], jiggy.x, jiggy.y, jiggy.width, jiggy.height);

    if(jiggy.y > board.height)
    {
        gameOver = true;
    }

    //pipes
    for(let i = 0; i < pipeArray.length; i++)
    {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        if(!pipe.passed && jiggy.x > pipe.x + pipe.width)
        {
            score += 0.5; //0.5 since both the top and bottom pipes have the passed attribute, so when player makes it through a gap they get one point
            pipe.passed = true;
        }
        if(detectCollision(jiggy, pipe))
        {
            gameOver = true;
        }
    }

    while(pipeArray.length > 0 && pipeArray[0].x < -pipeWidth)
    {
        pipeArray.shift();
    }

    //score
    context.fillStyle = "white";
    context.font ="45px sans-serif";
    context.fillText(score, 5, 45);

    if(gameOver)
    {
        context.fillText("Game Over", 5 ,90);
    }
}

function placePipes()
{
    if(gameOver)
    {
        return;
    }
    //math.random returns a value from 0-1
    //randomPipeY will be a value somewhere between 1/4 of pipeHeight or -3/4 of pipeHeight. pipeHeight is 512 px which is most of the screen
    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/3;
    let topPipe = 
    {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }

    pipeArray.push(topPipe);

    let bottomPipe = 
    {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(bottomPipe);
}

function moveJiggy(e)
{
    if(e.code == "Space" || e.code == "KeyW")
    {
        //jump
        flap();
    }
}

function flap()
{
    velocityY = -5;
    if(gameOver)
    {
        jiggy.y = jiggyY;
        pipeArray = [];
        score = 0;
        gameOver = false;
    }
}

function detectCollision(a, b)
{
    return a.x < b.x + b.width // a's top left corner doesn't reach b's top right corner
        && a.x + a.width > b.x // a's top right corner passes b's top left corner
        && a.y < b.y + b.height // a's top left corner doesn't reach b's bottom right corner
        && a.y + a.height > b.y; // a's bottom left corner passes b's top left corner
}

function animateJiggy()
{
    jiggyImgsIndex++; //advance to next animation frame
    jiggyImgsIndex %= jiggyImgs.length; //have index wrap around to 0 to prevent out of bounds error
}