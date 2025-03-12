// This class should send all needed radio telegrams

import * as record from 'node-record-lpcm16';
import Speaker from 'speaker';
import { AudioContext } from 'audio-context';
import FFT from 'fft.js';

// Constants for FFSK
const SAMPLE_RATE = 44100;  // Sample rate (Hz)
const BAUD_RATE = 2400;     // Baud rate (bps)
const FREQ_LOW = 1200;      // Low frequency (Hz)
const FREQ_HIGH = 2400;     // High frequency (Hz)
const SYMBOL_DURATION = 1 / BAUD_RATE; // Duration of one symbol in seconds
const TONE_DURATION = SYMBOL_DURATION * SAMPLE_RATE; // Duration in samples

class RadioController {
  private audioContext: AudioContext;
  private speaker: Speaker;
  private micStream: NodeJS.ReadWriteStream;
  private fft: FFT;
  private audioBuffer: number[];

  constructor() {
    this.audioContext = new AudioContext();
    this.speaker = new Speaker({
      channels: 1,   // Mono output
      bitDepth: 16,   // 16-bit depth
      sampleRate: SAMPLE_RATE
    });
    

    this.fft = new FFT(SAMPLE_RATE);
    this.audioBuffer = [];
  }

  // Create a sine wave buffer for a given frequency and duration
  private createSineWave(frequency: number, duration: number): Float32Array {
    const sampleCount = Math.floor(SAMPLE_RATE * duration);
    const buffer = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      buffer[i] = Math.sin(2 * Math.PI * frequency * i / SAMPLE_RATE);
    }
    return buffer;
  }

  // Encode binary data to FFSK tones (1200Hz for 0, 2400Hz for 1)
  public encodeFFSK(data: string): Float32Array {
    const toneSequence: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const bit = data[i];
      const frequency = bit === '0' ? FREQ_LOW : FREQ_HIGH;
      const tone = this.createSineWave(frequency, SYMBOL_DURATION);
      toneSequence.push(...tone);
    }
    return new Float32Array(toneSequence);
  }

  // Play a sequence of FFSK tones
  public playFFSK(toneSequence: Float32Array) {
    const buffer = this.audioContext.createBuffer(1, toneSequence.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(toneSequence);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.speaker);
    source.start();
  }

  // Decode FFSK from audio input using FFT
  private getFrequencyWithFFT(segment: Float32Array): number {
    const spectrum = this.fft.createComplexArray();
    this.fft.realTransform(spectrum, segment);
    this.fft.completeSpectrum(spectrum);

    let peakFreq = 0;
    let maxMagnitude = 0;

    // Find the peak frequency
    for (let i = 0; i < spectrum.length / 2; i++) {
      const magnitude = Math.sqrt(spectrum[2 * i] ** 2 + spectrum[2 * i + 1] ** 2);
      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
        peakFreq = i * SAMPLE_RATE / segment.length;
      }
    }

    return peakFreq;
  }

  // Decode FFSK from audio buffer
  public decodeFFSK(buffer: Float32Array): string {
    const bitStream: string[] = [];
    for (let i = 0; i < buffer.length; i += TONE_DURATION) {
      const segment = buffer.slice(i, i + TONE_DURATION);
      const frequency = this.getFrequencyWithFFT(segment);
      const bit = frequency < (FREQ_LOW + FREQ_HIGH) / 2 ? '0' : '1';
      bitStream.push(bit);
    }
    return bitStream.join('');
  }

  // Start capturing audio and decoding the FFSK signal
  public startListening() {
    this.micStream = record.start({
      sampleRateHertz: SAMPLE_RATE,
      threshold: 0,
      silence: 1000
    });

    this.micStream.on('data', (chunk: Buffer) => {
      const audioData = new Float32Array(chunk.buffer);
      this.audioBuffer.push(...audioData);

      if (this.audioBuffer.length > SAMPLE_RATE) {
        const segment = this.audioBuffer.splice(0, SAMPLE_RATE);
        const decodedData = this.decodeFFSK(new Float32Array(segment));
        console.log('Decoded:', decodedData);
      }
    });

    this.micStream.on('error', (err: Error) => {
      console.error('Error capturing audio:', err);
    });
  }

  // Stop capturing audio
  public stopListening() {
    record.stop();
    console.log('Stopped listening to audio');
  }

  // Example usage: Encode and play a message
  public exampleEncodeAndPlay() {
    const message = '010101010101'; // Example binary message
    const toneSequence = this.encodeFFSK(message);
    this.playFFSK(toneSequence);
  }
}




