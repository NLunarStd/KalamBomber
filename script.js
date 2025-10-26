// =================================================================================
// GAME CONSTANTS & VARIABLES
// =================================================================================

const ROWS = 20;
const COLS = 30;
const INITIAL_TIME = 10; // เวลาเริ่มต้น (วินาที)
const TIME_BONUS = 10;  // เวลาที่เพิ่มขึ้นเมื่อเปิดช่องสำเร็จ (วินาที)

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

// =================================================================================
// DOM ELEMENTS (ต้องมี ID เหล่านี้ใน HTML)
// =================================================================================

const boardGrid = document.getElementById('board-grid');
const stageDisplay = document.getElementById('stage-display');
const minesLeftDisplay = document.getElementById('mines-left-display');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display'); // DOM ใหม่
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');

// =================================================================================
// TIMER FUNCTIONS
// =================================================================================

/**
 * ฟังก์ชันเริ่มต้นและควบคุมการนับถอยหลัง
 */
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

/**
 * ฟังก์ชันเพิ่มเวลาโบนัส
 */
function addTimeBonus() {
    timeRemaining += TIME_BONUS;
    timerDisplay.textContent = `${timeRemaining}s`;
}

/**
 * ฟังก์ชันที่ถูกเรียกเมื่อเวลาหมด
 */
function timeIsUp() {
    if (gameActive) {
        // -1, -1 และ timedOut=true เพื่อแสดงว่าแพ้เพราะเวลาหมด
        gameOver(-1, -1, true); 
    }
}

/**
 * ฟังก์ชันหยุด Timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// =================================================================================
// GAME LOGIC FUNCTIONS
// =================================================================================

/**
 * ฟังก์ชันคำนวณจำนวนระเบิดรอบๆ ช่องที่ไม่ใช่ระเบิด
 */
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

/**
 * ฟังก์ชันวางระเบิดแบบสุ่ม หลังจากคลิกครั้งแรก
 */
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

/**
 * ฟังก์ชันเปิดเผยช่อง (Recursive)
 */
function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || mask[r][c] !== 'concealed') return;
    
    mask[r][c] = 'opened';
    score += 100; 
    scoreDisplay.textContent = score;

    const cellElement = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    cellElement.classList.add('opened');
    
    const value = board[r][c];
    
    if (value > 0) {
        cellElement.textContent = value;
        cellElement.classList.add(`num-${value}`);
    } 
    
    // การเปิดช่องลูกโซ่ (ถ้าเป็น 0)
    if (value === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                revealCell(r + dr, c + dc); 
            }
        }
    }
}

/**
 * จัดการคลิกซ้าย (เปิดช่อง)
 */
function handleLeftClick(event) {
    if (!gameActive) return;

    const r = parseInt(event.target.dataset.row);
    const c = parseInt(event.target.dataset.col);

    if (mask[r][c] === 'flagged' || mask[r][c] === 'opened') return;
    
    // 1. คลิกครั้งแรก: วางระเบิดและเริ่ม Timer
    if (firstClick) {
        placeMines(r, c);
        firstClick = false;
        startTimer(); // <<< เริ่ม Timer
    }
    
    // 2. ถ้าเจอระเบิด: แพ้!
    if (board[r][c] === 'mine') {
        gameOver(r, c);
        return;
    }
    
    // 3. เปิดช่อง
    const initialScore = score;
    revealCell(r, c);
    
    // 4. เพิ่มเวลาโบนัส: หากคะแนนเพิ่มขึ้น (เปิดช่องสำเร็จอย่างน้อย 1 ช่อง)
    if (score > initialScore) {
        addTimeBonus();
    }
    
    // 5. ตรวจสอบเงื่อนไขชนะ
    checkWinCondition();
}

/**
 * จัดการคลิกขวา (ปักธง)
 */
function handleRightClick(event) {
    event.preventDefault(); 
    if (!gameActive) return;

    const r = parseInt(event.target.dataset.row);
    const c = parseInt(event.target.dataset.col);
    const cellElement = event.target;

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

/**
 * ตรวจสอบว่าผู้เล่นเปิดช่องที่ไม่ใช่ระเบิดครบหรือไม่
 */
function checkWinCondition() {
    let uncoveredSafeCells = 0;
    const totalSafeCells = (ROWS * COLS) - currentMines;
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
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
        
        const nextMines = Math.min(120 + (stage - 1) * 10, 300);
        alert(`Stage ${stage - 1} Cleared! Preparing for Stage ${stage} with ${nextMines} mines!`);
        
        initializeGame(); 
    }
}

/**
 * จัดการเหตุการณ์ Game Over
 * @param {number} hitRow แถวที่คลิกโดนระเบิด
 * @param {number} hitCol คอลัมน์ที่คลิกโดนระเบิด
 * @param {boolean} timedOut บอกว่าแพ้เพราะหมดเวลาหรือไม่
 */
function gameOver(hitRow, hitCol, timedOut = false) {
    gameActive = false;
    stopTimer(); // หยุด Timer
    
    // เปิดเผยระเบิดทั้งหมด
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellElement = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (board[r][c] === 'mine') {
                cellElement.classList.add('mine');
                cellElement.textContent = '💣';
                cellElement.classList.remove('flagged'); 
            }
            // ลบ Event Listeners เพื่อหยุดการเล่น
            cellElement.removeEventListener('click', handleLeftClick);
            cellElement.removeEventListener('contextmenu', handleRightClick);
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
    
    console.log(`Final Score for Leaderboard: ${score}`);
}

/**
 * ฟังก์ชันเริ่มต้นเกม/ด่านใหม่
 */
function initializeGame() {
    // 1. กำหนดจำนวนระเบิดตาม Difficulty Progression
    currentMines = Math.min(120 + (stage - 1) * 10, 300);
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
    timeRemaining = INITIAL_TIME; 

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

// =================================================================================
// STARTUP
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ป้องกันเมนูบริบทของเบราว์เซอร์เมื่อคลิกขวาในพื้นที่กระดาน
    boardGrid.addEventListener('contextmenu', (e) => e.preventDefault()); 
    initializeGame();

});

