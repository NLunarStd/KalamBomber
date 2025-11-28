const ROWS = 20;
const COLS = 30;
const INITIAL_TIME = 10; // เวลาเริ่มต้น (วินาที)
const TIME_BONUS = 10;   // เวลาที่เพิ่มขึ้นเมื่อเปิดช่องสำเร็จ (วินาที)

let currentMines;
let board; // เก็บสถานะของกระดาน (มีระเบิด, ตัวเลข)
let mask;  // เก็บสถานะการแสดงผล (ซ่อน, เปิด, ธง)
let gameActive = true;
let firstClick = true;
let score = 0;
let stage = 1;
let minesLeft = 0; // ตัวนับระเบิดที่เหลือ (สำหรับ UI)

let timeRemaining = INITIAL_TIME;
let timerInterval; // ตัวแปรสำหรับเก็บ Interval ID ของ Timer

const clickSound = new Audio('../audio/click_sfx.mp3');
const explodeSound = new Audio('../audio/explode_sfx.mp3');
const gameEndSound = new Audio('../audio/gameEnd_sfx.mp3');

function playSound(audioObj) {
    audioObj.pause();
    audioObj.currentTime = 0; // รีเซ็ตเสียงไปที่จุดเริ่มต้น
    audioObj.play().catch(e => console.log("Audio error: ", e));
}

const boardGrid = document.getElementById('board-grid');
const stageDisplay = document.getElementById('stage-display');
const minesLeftDisplay = document.getElementById('mines-left-display');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display'); 
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');


function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(timerInterval);
            return;
        }

        timeRemaining--;
        timerDisplay.textContent = `${timeRemaining}s`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timeIsUp(); 
        }
    }, 1000);
}


function addTimeBonus() {
    timeRemaining += TIME_BONUS;
    timerDisplay.textContent = `${timeRemaining}s`;
}


function timeIsUp() {
    if (gameActive) {
        // -1, -1 และ timedOut=true เพื่อแสดงว่าแพ้เพราะเวลาหมด
        gameOver(-1, -1, true); 
    }
}


function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}


function calculateNumbers() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 'mine') continue;

            let mineCount = 0;
            
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue; 

                    const nr = r + dr;
                    const nc = c + dc;
                    
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                        if (board[nr][nc] === 'mine') {
                            mineCount++;
                        }
                    }
                }
            }
            board[r][c] = mineCount;
        }
    }
}


function placeMines(firstRow, firstCol) {
    let minesPlaced = 0;
    while (minesPlaced < currentMines) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        
        // เว้นพื้นที่ 3x3 รอบจุดคลิกแรก
        if (board[r][c] !== 'mine' && 
            (Math.abs(r - firstRow) > 1 || Math.abs(c - firstCol) > 1)) { 
            
            board[r][c] = 'mine';
            minesPlaced++;
        }
    }
    
    calculateNumbers();
}


function revealCell(r, c) {
    // 1. ตรวจสอบขอบเขตและสถานะ (หากไม่ใช่ 'concealed' ให้จบการทำงาน)
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || mask[r][c] !== 'concealed') return 0;
    
    // 2. เปิดช่องปัจจุบัน
    mask[r][c] = 'opened';
    
    const cellElement = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    cellElement.classList.add('opened');
    
    const value = board[r][c];
    
    if (value > 0) {
        cellElement.textContent = value;
        cellElement.classList.add(`num-${value}`);
    } 
    
    // นับตัวเองเป็น 1 ช่องที่ถูกเปิด
    let cellsOpened = 1;
    
    // 3. การเปิดช่องลูกโซ่ (ถ้าเป็น 0)
    if (value === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                // เรียกซ้ำ และเพิ่มจำนวนช่องที่ถูกเปิดจากเพื่อนบ้าน
                cellsOpened += revealCell(r + dr, c + dc); 
            }
        }
    }
    
    return cellsOpened; // ส่งคืนจำนวนช่องที่ถูกเปิดใหม่ทั้งหมดในลูปนี้
}


function handleLeftClick(event) {
    if (!gameActive) return;

    const r = parseInt(event.target.dataset.row);
    const c = parseInt(event.target.dataset.col);

    if (mask[r][c] === 'flagged' || mask[r][c] === 'opened') return;
    

    playSound(clickSound);


    // 1. คลิกครั้งแรก: วางระเบิดและเริ่ม Timer
    if (firstClick) {
        placeMines(r, c);
        firstClick = false;
        startTimer(); // <<< เริ่ม Timer
    }
    
    // 2. ถ้าเจอระเบิด: แพ้!
    if (board[r][c] === 'mine') {
        playSound(explodeSound);
        gameOver(r, c);
        return;
    }
    
    // 3. เปิดช่องและรับจำนวนช่องที่เปิดใหม่
    const cellsOpened = revealCell(r, c);
    
    // 4. คำนวณคะแนนและเพิ่มเวลาโบนัส (หากมีการเปิดช่องใหม่)
    if (cellsOpened > 0) {
        score += cellsOpened * 100;
        scoreDisplay.textContent = score;
        
        // เพิ่มเวลาโบนัส 1 ครั้งต่อการคลิกเท่านั้น (ไม่ว่าเปิดกี่ช่องก็ตาม)
        addTimeBonus();
    }
    
    // 5. ตรวจสอบเงื่อนไขชนะ
    checkWinCondition();
}


function handleRightClick(event) {
    event.preventDefault(); 
    if (!gameActive) return;

    const r = parseInt(event.target.dataset.row);
    const c = parseInt(event.target.dataset.col);
    const cellElement = event.target;

    playSound(clickSound);

    if (mask[r][c] === 'opened') return;

    if (mask[r][c] === 'concealed') {
        mask[r][c] = 'flagged';
        cellElement.classList.add('flagged');
        cellElement.textContent = '🚩';
        minesLeft--; 
    } else if (mask[r][c] === 'flagged') {
        mask[r][c] = 'concealed';
        cellElement.classList.remove('flagged');
        cellElement.textContent = '';
        minesLeft++; 
    }
    minesLeftDisplay.textContent = minesLeft;
}


function checkWinCondition() {
    let uncoveredSafeCells = 0;
    const totalSafeCells = (ROWS * COLS) - currentMines;
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // ตรวจสอบว่าช่องถูกเปิด และไม่ใช่ระเบิด
            if (mask[r][c] === 'opened' && board[r][c] !== 'mine') {
                uncoveredSafeCells++;
            }
        }
    }
    
    if (uncoveredSafeCells === totalSafeCells) {
        // ชนะด่าน! เตรียมขึ้นด่านใหม่
        gameActive = false;
        stopTimer(); // หยุด Timer ชั่วคราว
        stage++;
        
        const nextMines = Math.min(150 + (stage - 1) * 10, 300);
        alert(`Stage ${stage - 1} Cleared! Preparing for Stage ${stage} with ${nextMines} mines!`);
        
        // เพิ่มเวลาเริ่มต้นให้มากขึ้นเมื่อขึ้นด่านใหม่เพื่อให้ท้าทายขึ้นเล็กน้อย
        timeRemaining = INITIAL_TIME; 
        
        initializeGame(); 
    }
}


//// ทำตรงนี้เพื่อบันทึกคะแนนไปยัง Server ////
function saveGameScore(finalScore) {
    
    if (finalScore <= 0) return;

    // ส่งคะแนนไปยัง Server
    fetch('/saveScore', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score: finalScore })
    })
    // อ่านผลลัพธ์จาก Server
    .then(response => {
        
        if(response.status === 500) 
        {
        console.log("failed to save score");
        }
        
    })
}


function gameOver(hitRow, hitCol, timedOut = false) {
    gameActive = false;
    stopTimer(); // หยุด Timer
    
    playSound(gameEndSound);

    // เปิดเผยระเบิดทั้งหมด
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellElement = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (board[r][c] === 'mine') {
                cellElement.classList.add('mine');
                cellElement.textContent = '💣';
                cellElement.classList.remove('flagged'); 
            }
        }
    }
    
    // ไฮไลท์ระเบิดที่ผู้เล่นคลิกโดน (ถ้าแพ้เพราะระเบิด)
    if (!timedOut) {
        const hitCell = document.querySelector(`.cell[data-row="${hitRow}"][data-col="${hitCol}"]`);
        if (hitCell) hitCell.style.backgroundColor = 'darkred';
    }

    // แสดงหน้าจอ Game Over
    finalScore.textContent = score;
    
    // อัปเดตข้อความ Game Over
    const h2Element = document.querySelector('#game-over-screen h2');
    const pElement = document.querySelector('#game-over-screen p:nth-child(2)');
    
    if (timedOut) {
        h2Element.textContent = 'TIME IS UP!';
        pElement.textContent = 'You ran out of time!';
    } else {
        h2Element.textContent = 'GAME OVER!';
        pElement.textContent = 'You detonated a **Kalam Bomb**!';
    }
    
    gameOverScreen.classList.remove('hidden');
    

    saveGameScore(score);

    // console.log(`Final Score: ${score}`);
}


function initializeGame() {
    // 1. กำหนดจำนวนระเบิดตาม Difficulty Progression
    currentMines = Math.min(150 + (stage - 1) * 10, 300);
    minesLeft = currentMines;
    
    // 2. สร้างโครงสร้างข้อมูลกระดาน (board) และมาสก์ (mask)
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    mask = Array(ROWS).fill(0).map(() => Array(COLS).fill('concealed'));
    
    // ล้างกระดานเก่าใน DOM
    boardGrid.innerHTML = ''; 
    
    // รีเซ็ตตัวแปรสถานะ
    gameActive = true;
    firstClick = true;
    
    // รีเซ็ต Timer 
    stopTimer(); 
    // ใช้ timeRemaining ที่มีการอัปเดตหากมีการชนะด่าน 
    if (stage === 1) {
        timeRemaining = INITIAL_TIME;
    }
    

    // 3. อัปเดต UI
    stageDisplay.textContent = stage;
    minesLeftDisplay.textContent = minesLeft;
    scoreDisplay.textContent = score; 
    timerDisplay.textContent = `${timeRemaining}s`;
    
    // 4. สร้าง Cell Element ใน DOM
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            cell.addEventListener('click', handleLeftClick);
            cell.addEventListener('contextmenu', handleRightClick);
            
            boardGrid.appendChild(cell);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    boardGrid.addEventListener('contextmenu', (e) => e.preventDefault()); 
    initializeGame();
});