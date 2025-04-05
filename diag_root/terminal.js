// ATM Terminal in JS

const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;
const POINT_SIZE = 5;
const CHAR_H_SPACING = 1; // in points
const ROW_V_SPACING = 2; // in points

const DISPLAY_COLS = 16;
const DISPLAY_ROWS = 2;

const FOREGROUND = '#005000'; // dark green
const BACKGROUND = '#32CD32'; // lime green
const BLINK_INTERVAL_MS = 500;

// Calculate canvas size
const CANVAS_WIDTH = DISPLAY_COLS * (CHAR_WIDTH + CHAR_H_SPACING) * POINT_SIZE;
const CANVAS_HEIGHT = DISPLAY_ROWS * (CHAR_HEIGHT + ROW_V_SPACING) * POINT_SIZE;

// Basic 5x7 font (partial sample shown; extend as needed)
const FONT = {
  'A': [
    '01110','10001','10001','11111','10001','10001','10001'
  ],
  'B': [
    '11110','10001','10001','11110','10001','10001','11110'
  ],
  'C': [
    '01111','10000','10000','10000','10000','10000','01111'
  ],
  'D': [
    '11110','10001','10001','10001','10001','10001','11110'
  ],
  'E': [
    '11111','10000','10000','11110','10000','10000','11111'
  ],
  'F': [
    '11111','10000','10000','11110','10000','10000','10000'
  ],
  'G': [
    '01111','10000','10000','10111','10001','10001','01111'
  ],
  'H': [
    '10001','10001','10001','11111','10001','10001','10001'
  ],
  'I': [
    '01110','00100','00100','00100','00100','00100','01110'
  ],
  'J': [
    '00001','00001','00001','00001','10001','10001','01110'
  ],
  'K': [
    '10001','10010','10100','11000','10100','10010','10001'
  ],
  'L': [
    '10000','10000','10000','10000','10000','10000','11111'
  ],
  'M': [
    '10001','11011','10101','10101','10001','10001','10001'
  ],
  'N': [
    '10001','10001','11001','10101','10011','10001','10001'
  ],
  'O': [
    '01110','10001','10001','10001','10001','10001','01110'
  ],
  'P': [
    '11110','10001','10001','11110','10000','10000','10000'
  ],
  'Q': [
    '01110','10001','10001','10001','10101','10010','01101'
  ],
  'R': [
    '11110','10001','10001','11110','10100','10010','10001'
  ],
  'S': [
    '01111','10000','10000','01110','00001','00001','11110'
  ],
  'T': [
    '11111','00100','00100','00100','00100','00100','00100'
  ],
  'U': [
    '10001','10001','10001','10001','10001','10001','01110'
  ],
  'V': [
    '10001','10001','10001','10001','10001','01010','00100'
  ],
  'W': [
    '10001','10001','10001','10101','10101','10101','01010'
  ],
  'X': [
    '10001','10001','01010','00100','01010','10001','10001'
  ],
  'Y': [
    '10001','10001','01010','00100','00100','00100','00100'
  ],
  'Z': [
    '11111','00001','00010','00100','01000','10000','11111'
  ],
  // Numbers
  '0': [
    '01110','10001','10011','10101','11001','10001','01110'
  ],
  '1': [
    '00100','01100','00100','00100','00100','00100','01110'
  ],
  '2': [
    '01110','10001','00001','00010','00100','01000','11111'
  ],
  '3': [
    '11110','00001','00001','01110','00001','00001','11110'
  ],
  '4': [
    '00010','00110','01010','10010','11111','00010','00010'
  ],
  '5': [
    '11111','10000','10000','11110','00001','00001','11110'
  ],
  '6': [
    '01110','10000','10000','11110','10001','10001','01110'
  ],
  '7': [
    '11111','00001','00010','00100','01000','01000','01000'
  ],
  '8': [
    '01110','10001','10001','01110','10001','10001','01110'
  ],
  '9': [
    '01110','10001','10001','01111','00001','00001','01110'
  ],
  // Lowercase (just a few for brevity)
  'a': [
    '00000','00000','01110','00001','01111','10001','01111'
  ],
  'b': [
    '10000','10000','11110','10001','10001','10001','11110'
  ],
  'c': [
    '00000','00000','01110','10000','10000','10000','01110'
  ],
  // Umlauts and others
  'Ä': [
    '01010','01110','10001','11111','10001','10001','10001'
  ],
  'Ö': [
    '01010','01110','10001','10001','10001','10001','01110'
  ],
  'Ü': [
    '01010','10001','10001','10001','10001','10001','01110'
  ],
  'ä': [
    '01010','00000','01110','00001','01111','10001','01111'
  ],
  'ö': [
    '01010','00000','01110','10001','10001','10001','01110'
  ],
  'ü': [
    '01010','00000','10001','10001','10001','10011','01101'
  ],
  'ß': [
    '01110','10001','00001','01110','00001','10001','01110'
  ],
  '-': [
    '00000','00000','00000','11111','00000','00000','00000'
  ],
  '/': [
    '00001','00010','00100','01000','10000','00000','00000'
  ],
  '\\': [
    '10000','01000','00100','00010','00001','00000','00000'
  ],
  '@': [
    '01110','10001','00001','01101','10101','10101','01110'
  ],
  ']': [
    '11100','00100','00100','00100','00100','00100','11100'
  ],
  '[': [
    '00111','00100','00100','00100','00100','00100','00111'
  ],
  '|': [
    '00100','00100','00100','00100','00100','00100','00100'
  ],
  ' ': [
    '00000','00000','00000','00000','00000','00000','00000'
  ],
  '.': [
    '00000','00000','00000','00000','00000','00000','00100'
  ],
  ':': [
    '00000','00000','00000','00100','00000','00100','00000'
  ],
};

// Display content
const display = Array.from({ length: DISPLAY_ROWS }, () => Array(DISPLAY_COLS).fill(' '));
const blinking = Array.from({ length: DISPLAY_ROWS }, () => Array(DISPLAY_COLS).fill(false));

const canvas = document.getElementById('display-canvas');
canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT
const ctx = canvas.getContext('2d');

// Draw a single character
function drawChar(char, row, col, visible = true) {
  const pattern = FONT[char] || FONT[' '];
  const startX = col * (CHAR_WIDTH + CHAR_H_SPACING) * POINT_SIZE;
  const startY = row * (CHAR_HEIGHT + ROW_V_SPACING) * POINT_SIZE;

  for (let y = 0; y < CHAR_HEIGHT; y++) {
    for (let x = 0; x < CHAR_WIDTH; x++) {
      const bit = pattern[y][x];
      if (bit === '1' && visible) {
        ctx.fillStyle = FOREGROUND;
        ctx.fillRect(startX + x * POINT_SIZE, startY + y * POINT_SIZE, POINT_SIZE, POINT_SIZE);
      }
    }
  }
}

// Redraw entire display

let blinkState = true;
let lastBlinkTime = performance.now();

function render(timestamp) {
  // Fill canvas background once
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (timestamp - lastBlinkTime >= BLINK_INTERVAL_MS) {
    blinkState = !blinkState;
    lastBlinkTime = timestamp;
  }

  for (let row = 0; row < DISPLAY_ROWS; row++) {
    for (let col = 0; col < DISPLAY_COLS; col++) {
      const char = display[row][col];
      const isBlinking = blinking[row][col];
      const visible = isBlinking ? blinkState : true;
      drawChar(char, row, col, visible);
    }
  }

  requestAnimationFrame(render);
}

// Utility to set characters
function setChar(char, row, col, blink = false) {
  if (row >= 0 && row < DISPLAY_ROWS && col >= 0 && col < DISPLAY_COLS) {
    display[row][col] = char;
    blinking[row][col] = blink;
  }
}

// Example: set string on display


// Start animation loop
render();


function setStringWithMode(startColumn, y, string, blinking) {
    string.split('').forEach((c, i) => {
        setChar(c, y,startColumn + i, blinking)
    })
}


setStringWithMode(0, 0, 'IBIS GESTOERT 1', false);
 
function onReceiveTelegram(telegram) {
    telegram = telegram.substring(0, telegram.length - 2)
    console.log('Parsing telegram', telegram)
    if (telegram.startsWith('mC')) {
        // Character setting
        const mode= parseInt(telegram[2]);
        // Telegrammlänge erstmal ignorieren
        const x = parseInt(telegram[4])
        const y = parseInt(telegram[5])
        const text = telegram.substr(6)
        switch (mode) {
            case 2:
                setStringWithMode(y, x, text, false)
                break;
            case 3:
                setStringWithMode(y, x, text, false)
                break;
            case 4:
                setStringWithMode(y, x, text, true)
                break;
            case 6:
                setStringWithMode(y, x, text, true)
                break;
            break;
            case 7:
                setStringWithMode(y, x, text, true)
                break;

        }
    }
}

function handleTerminalButtonPress(event) {
    const button = event.target;
    const number = button.dataset.number;
    
    const payload = JSON.stringify({ 'channel': 'WBED', 'data': 'mm' + number });
    websocket.send(payload);

}

const terminalButtons = document.querySelectorAll('.terminal button');
for (var i=0; i<terminalButtons.length; i++) {
    terminalButtons[i].addEventListener('click', handleTerminalButtonPress);
}

