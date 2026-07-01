import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { SetupService } from './setup.service';
import { DeviceConfig, SetupSchema, SetupStatus, TerminalAction, UploadSummary } from './device-config.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ButtonModule, CardModule, CheckboxModule, InputTextModule, InputNumberModule,
    MessageModule, ToastModule, ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  steps = ['Fahrzeug', 'GPIO & Geräte', 'Terminalbelegung', 'Audio', 'Daten-Upload'];
  activeStep = 0;

  config?: DeviceConfig;
  schema?: SetupSchema;
  status?: SetupStatus;

  // Address selections derived from the boolean[] config fields.
  signsSelected: number[] = [];
  validatorsSelected: number[] = [];

  selectedFile?: File;
  uploadSummary?: UploadSummary;
  uploading = false;
  saving = false;

  restarting = false;

  constructor(private api: SetupService, private toast: MessageService) {}

  ngOnInit(): void {
    this.api.getSchema().subscribe({ next: s => (this.schema = s) });
    this.refreshStatus();
    this.api.getConfig().subscribe({
      next: c => {
        this.config = this.ensureShape(c);
        this.signsSelected = this.boolToAddresses(this.config.signs);
        this.validatorsSelected = this.boolToAddresses(this.config.validators);
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Fehler', detail: 'Konfiguration konnte nicht geladen werden' })
    });
  }

  refreshStatus(): void {
    this.api.getStatus().subscribe({ next: s => (this.status = s) });
  }

  get serialFault(): boolean {
    return !!(this.status && this.status.serialConfigured && !this.status.serialOpen);
  }

  // Make sure nested objects exist so template bindings never hit undefined.
  private ensureShape(c: DeviceConfig): DeviceConfig {
    c.validators = c.validators || [];
    c.signs = c.signs || [];
    c.UESTRA_LVA = c.UESTRA_LVA || [];
    c.DS021_STOP_NAME = c.DS021_STOP_NAME || [];
    c.terminal_config = c.terminal_config || { actions: [], sounds: { ABFAHRT: 0, WEISUNG: 0, FEHLER: 0 } };
    c.terminal_config.actions = c.terminal_config.actions || [];
    c.terminal_config.sounds = c.terminal_config.sounds || { ABFAHRT: 0, WEISUNG: 0, FEHLER: 0 };
    c.GPIO_PINOUT = c.GPIO_PINOUT || {};
    for (const p of ['WI', 'OBI', 'TK', 'FLE', 'PLE', 'UEB', 'KKA', 'KKB', 'K1', 'K2', 'K4', 'K8', 'DS', 'STAST', 'TFS']) {
      if (c.GPIO_PINOUT[p] === undefined) c.GPIO_PINOUT[p] = 0;
    }
    c.RADIO = c.RADIO || { enabled: false, vehicle_address: 0, channels: { voice: 0, data: 0, lsa: 0 } };
    c.RADIO.channels = c.RADIO.channels || { voice: 0, data: 0, lsa: 0 };
    c.AUDIO = c.AUDIO || { radio: { input_device: 'default', output_device: 'default' }, announcements: { output_device: 'default' } };
    return c;
  }

  private boolToAddresses(arr: boolean[]): number[] {
    const out: number[] = [];
    (arr || []).forEach((v, i) => { if (v) out.push(i); });
    return out;
  }

  private addressesToBool(addrs: number[], len = 15): boolean[] {
    const out = new Array(len).fill(false);
    (addrs || []).forEach(a => { if (a >= 0 && a < len) out[a] = true; });
    return out;
  }

  get gpioPins(): string[] {
    return this.schema?.gpioPins || [];
  }
  get addresses(): number[] {
    return this.schema?.addresses || [];
  }

  goToStep(i: number): void {
    if (i >= 0 && i < this.steps.length) this.activeStep = i;
  }
  next(): void { if (this.activeStep < this.steps.length - 1) this.activeStep++; }
  prev(): void { if (this.activeStep > 0) this.activeStep--; }

  addAction(): void {
    this.config?.terminal_config.actions.push({ key: '', action: '', textLine1: '', isPrompt: false, isBlinking: false });
  }
  removeAction(row: TerminalAction): void {
    if (!this.config) return;
    this.config.terminal_config.actions = this.config.terminal_config.actions.filter(a => a !== row);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length ? input.files[0] : undefined;
    this.uploadSummary = undefined;
  }

  upload(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.api.uploadData(this.selectedFile).subscribe({
      next: s => {
        this.uploading = false;
        this.uploadSummary = s;
        this.toast.add({ severity: 'success', summary: 'Daten übernommen', detail: `DB + ${s.announcements} Ansagen. Neustart nötig.` });
        this.refreshStatus();
      },
      error: err => {
        this.uploading = false;
        this.toast.add({ severity: 'error', summary: 'Upload fehlgeschlagen', detail: err?.error?.error || 'Unbekannter Fehler' });
      }
    });
  }

  private buildConfigForSave(): DeviceConfig {
    const c = this.config as DeviceConfig;
    c.signs = this.addressesToBool(this.signsSelected);
    c.validators = this.addressesToBool(this.validatorsSelected);
    return c;
  }

  saveConfig(): void {
    if (!this.config) return;
    this.saving = true;
    this.api.saveConfig(this.buildConfigForSave()).subscribe({
      next: () => {
        this.saving = false;
        this.toast.add({ severity: 'success', summary: 'Gespeichert', detail: 'Konfiguration geschrieben. Neustart zum Übernehmen.' });
      },
      error: err => {
        this.saving = false;
        this.toast.add({ severity: 'error', summary: 'Speichern fehlgeschlagen', detail: err?.error?.error || 'Unbekannter Fehler' });
      }
    });
  }

  // Save everything, then restart. The overlay polls /status until the server returns.
  finishAndRestart(): void {
    if (!this.config) return;
    this.saving = true;
    this.api.saveConfig(this.buildConfigForSave()).subscribe({
      next: () => {
        this.saving = false;
        this.doRestart();
      },
      error: err => {
        this.saving = false;
        this.toast.add({ severity: 'error', summary: 'Speichern fehlgeschlagen', detail: err?.error?.error || 'Unbekannter Fehler' });
      }
    });
  }

  doRestart(): void {
    this.restarting = true;
    this.api.restart().subscribe({
      next: () => this.pollUntilBack(),
      // The server may drop the connection as it shuts down — that's expected; still poll.
      error: () => this.pollUntilBack()
    });
  }

  private pollUntilBack(): void {
    let down = false;
    const timer = setInterval(() => {
      this.api.getStatus().subscribe({
        next: () => {
          // Only treat as "back" once we've seen it go down first (a real restart).
          if (down) {
            clearInterval(timer);
            window.location.reload();
          }
        },
        error: () => { down = true; }
      });
    }, 1500);
  }

  reconfigureSerial(): void {
    this.goToStep(0);
  }
}
