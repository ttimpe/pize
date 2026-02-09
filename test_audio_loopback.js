// Test if BlackHole audio loopback works
const Speaker = require('speaker');
const { spawn } = require('child_process');

const SAMPLE_RATE = 24000;
const FREQ = 1200; // Test tone

console.log("Testing BlackHole audio loopback...");
console.log("Generating 1200 Hz test tone for 2 seconds...");

// Generate test tone
const duration = 2; // seconds
const samples = SAMPLE_RATE * duration;
const buffer = Buffer.alloc(samples * 2); // 16-bit samples

for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * FREQ * (i / SAMPLE_RATE)) * 32767;
    buffer.writeInt16LE(sample, i * 2);
}

// Output speaker
const speaker = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: SAMPLE_RATE,
    device: 'BlackHole 2ch'
});

// Input recorder
const recorder = spawn('sox', [
    '-t', 'coreaudio', 'BlackHole 2ch',
    '-q', '-b', '16', '-c', '1', '-r', SAMPLE_RATE.toString(),
    '-e', 'signed-integer', '-t', 'raw', '-'
]);

let receivedBytes = 0;
recorder.stdout.on('data', (chunk) => {
    receivedBytes += chunk.length;
});

recorder.stderr.on('data', (d) => console.error(`Recorder error: ${d}`));

console.log("Playing test tone...");
speaker.write(buffer);

setTimeout(() => {
    recorder.kill();
    console.log(`\nReceived ${receivedBytes} bytes (expected ~${samples * 2})`);
    if (receivedBytes > samples * 2 * 0.9) {
        console.log("✓ BlackHole loopback WORKS!");
    } else {
        console.log("✗ BlackHole loopback FAILED - audio not received");
    }
    process.exit(0);
}, 3000);
