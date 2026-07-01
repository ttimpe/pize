export interface TerminalAction {
  key: string;
  action: string;
  textLine1?: string;
  isPrompt?: boolean;
  isBlinking?: boolean;
}

export interface DeviceConfig {
  serial_port?: string;
  vehicle_number?: number;
  MFD: boolean;
  external_announcements: boolean;
  TERMINAL_A: boolean;
  TERMINAL_B: boolean;
  validators: boolean[];
  signs: boolean[];
  UESTRA_LVA: number[];
  DS021_STOP_NAME?: number[];
  terminal_config: {
    actions: TerminalAction[];
    sounds: { ABFAHRT: number; WEISUNG: number; FEHLER: number };
  };
  use_gpio?: boolean;
  GPIO_PINOUT?: { [pin: string]: number };
  announcement_distance_before_next_stop: number;
  line_number_in_ds009: boolean;
  query_device_status: boolean;
  RADIO?: {
    enabled: boolean;
    vehicle_address: number;
    channels: { voice: number; data: number; lsa: number };
  };
  IRIS_A?: boolean;
  IRIS_B?: boolean;
  AUDIO?: {
    radio: { input_device: string; output_device: string };
    announcements: { output_device: string };
  };
}

export interface SetupStatus {
  configured: boolean;
  dbPresent: boolean;
  dbRowCounts: { [table: string]: number };
  announcementCount: number;
  serialConfigured: boolean;
  serialPort?: string;
  serialOpen: boolean;
  serialError?: string;
  version: string;
}

export interface SetupSchema {
  keyActions: string[];
  keys: string[];
  addresses: number[];
  gpioPins: string[];
}

export interface UploadSummary {
  ok: boolean;
  db: { tables: number; rowCounts: { [t: string]: number } };
  announcements: number;
  backup: string | null;
  note: string;
}
