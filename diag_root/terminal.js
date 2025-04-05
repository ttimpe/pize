// ATM Terminal in JS

const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;
const POINT_SIZE = 5;
const POINT_MARGIN = 0.3;
const CHAR_H_SPACING = 1; // in points
const ROW_V_SPACING = 2; // in points

const DISPLAY_COLS = 16;
const DISPLAY_ROWS = 2;

const FOREGROUND = '#003000'; // dark green
const BACKGROUND = '#32CD32'; // lime green
const BLINK_INTERVAL_MS = 1000;

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

let inNumberMode = false;
let numberBuffer = ''

// Display content
const display = Array.from({ length: DISPLAY_ROWS }, () => Array(DISPLAY_COLS).fill(' '));
const blinking = Array.from({ length: DISPLAY_ROWS }, () => Array(DISPLAY_COLS).fill(false));
let lastBlink = 0;
const canvas = document.getElementById('display-canvas');
canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT
const ctx = canvas.getContext('2d');

// Draw a single character
function drawChar(char, row, col, visible = true) {
    const pattern = FONT[char] || FONT[' '];
    const xStart = col * (CHAR_WIDTH + CHAR_H_SPACING) * POINT_SIZE;
    const yStart = row * (CHAR_HEIGHT + ROW_V_SPACING) * POINT_SIZE;
  
    for (let y = 0; y < CHAR_HEIGHT; y++) {
      for (let x = 0; x < CHAR_WIDTH; x++) {
        if (visible && pattern[y][x] === '1') {
          ctx.fillStyle = FOREGROUND;
          ctx.fillRect(
            xStart + x * POINT_SIZE + POINT_MARGIN,
            yStart + y * POINT_SIZE + POINT_MARGIN,
            POINT_SIZE - 2 * POINT_MARGIN,
            POINT_SIZE - 2 * POINT_MARGIN
          );
        }
      }
    }
  }

  function drawBackgroundGrid() {
    for (let row = 0; row < DISPLAY_ROWS; row++) {
      for (let col = 0; col < DISPLAY_COLS; col++) {
        const xStart = col * (CHAR_WIDTH + CHAR_H_SPACING) * POINT_SIZE;
        const yStart = row * (CHAR_HEIGHT + ROW_V_SPACING) * POINT_SIZE;
  
        for (let y = 0; y < CHAR_HEIGHT; y++) {
          for (let x = 0; x < CHAR_WIDTH; x++) {
            ctx.fillStyle = 'rgba(0, 100, 0, 0.1)'; // subtle inactive dot
            ctx.fillRect(
              xStart + x * POINT_SIZE + POINT_MARGIN,
              yStart + y * POINT_SIZE + POINT_MARGIN,
              POINT_SIZE - 2 * POINT_MARGIN,
              POINT_SIZE - 2 * POINT_MARGIN
            );
          }
        }
      }
    }
  }
  
// Redraw entire display

let blinkState = true;
let lastBlinkTime = performance.now();

function render(timestamp) {
    if (timestamp - lastBlink >= BLINK_INTERVAL_MS) {
      blinkState = !blinkState;
      lastBlink = timestamp;
    }
  
    // Fill canvas background
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
    // Draw faint grid first
    drawBackgroundGrid();
  
    // Then draw characters on top
    for (let row = 0; row < DISPLAY_ROWS; row++) {
      for (let col = 0; col < DISPLAY_COLS; col++) {
        const char = display[row][col] || ' ';
        const blink = blinking[row][col];
        const show = blink ? blinkState : true;
        drawChar(char, row, col, show);
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
                inNumberMode = false
                setStringWithMode(y, x, text, false)
                break;
            case 3:
                inNumberMode = true;
                setStringWithMode(y, x, text, false)
                break;
            case 4:
                inNumberMode = false
                setStringWithMode(y, x, text, true)
                break;
            case 6:
                inNumberMode = false
                setStringWithMode(y, x, text, true)
                break;
            case 7:
                inNumberMode = true
                setStringWithMode(y, x, text, true)
                break;

        }
    }
}

function handleTerminalButtonPress(event) {
    const button = event.target;
    const number = button.dataset.number;
    let telegram = 'mm';
    playMelody(['D6'], 350);
    if (!inNumberMode || button.classList.contains('function-button')) {
        // Eingabe/Quitt und Löschen abfangen
        if (number == '?') {

            telegram += '?' + numberBuffer;
            numberBuffer = ''
        } else if (number == '/') {
            setStringWithMode(16 - numberBuffer.length  - 1, 0, ''.padStart(numberBuffer.length, ' '), false);
            numberBuffer = ''

        } else {
            telegram += number;
        }
        const payload = JSON.stringify({ 'channel': 'WBED', 'data': telegram });
        websocket.send(payload);
    } else {
        

        if (numberBuffer == '') {
            // Erste Zahl eingegeben, also erstmal löschen

            for (let i=0; i< 16; i++) {
                blinking[0][i] = false;
            }
            let indexOfColon = display[0].join('').indexOf(':') + 2
            setStringWithMode(indexOfColon - 1, 0, ''.padStart(16 - indexOfColon + 1), false);
        }
        numberBuffer += number
        setStringWithMode(16 - numberBuffer.length, 0, numberBuffer, false);
    }

}

const terminalButtons = document.querySelectorAll('.terminal button');
for (var i=0; i<terminalButtons.length; i++) {
    terminalButtons[i].addEventListener('click', handleTerminalButtonPress);
}


// Pieptöne

function midiNoteToFreq(note) {
    const noteMap = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
  
    const match = note.match(/^([A-Ga-g]#?b?)(\d)$/);
    if (!match) return null;
  
    const [, name, octave] = match;
    const semitone = noteMap[name.toUpperCase()];
    const midiNumber = (parseInt(octave) + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playMelody(melody, tempo = 120) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let currentTime = audioCtx.currentTime;
    const beatDuration = 60 / tempo;
  
    melody.forEach(entry => {
      let note = '', duration = 1;
  
      if (typeof entry === 'string') {
        note = entry;
      } else {
        note = entry.note;
        duration = entry.duration ?? 1;
      }
  
      const noteLength = beatDuration * duration;
      const actualSoundLength = noteLength * 0.9; // 10% articulation gap
  
      if (note && note !== '') {
        const freq = midiNoteToFreq(note);
        if (freq) {
          const osc = audioCtx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, currentTime);
          osc.connect(audioCtx.destination);
          osc.start(currentTime);
          osc.stop(currentTime + actualSoundLength);
        }
      }
  
      currentTime += noteLength;
    });
  }
  
  


  document.getElementById('button-start').addEventListener('click', () => {
    const duesseldorfMelody = [
        { note: 'G5', duration: 1.5 },  // "WÄRST"
        { note: 'G5', duration: 0.5 },  // "du"
        { note: 'G5', duration: 1 },  // "doch"
        { note: 'G5', duration: 1 },  // "in"
        { note: 'B5', duration: 1   },  // "DÜS"
        { note: 'A5', duration: 1   },  // "sel"
        { note: 'G5', duration: 1   },  // "dorf"
        { note: 'F5', duration: 1 },  // "ge"
        { note: 'E5', duration: 2 },  // "blie"
        { note: 'C5', duration: 1 },  // "ben"
      ];
                  playMelody(duesseldorfMelody, 160);  
  })
