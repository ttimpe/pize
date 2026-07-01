import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeviceConfig, SetupSchema, SetupStatus, UploadSummary } from './device-config.model';

@Injectable({ providedIn: 'root' })
export class SetupService {
  constructor(private http: HttpClient) {}

  getStatus(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>('/api/setup/status');
  }

  getSchema(): Observable<SetupSchema> {
    return this.http.get<SetupSchema>('/api/setup/schema');
  }

  getConfig(): Observable<DeviceConfig> {
    return this.http.get<DeviceConfig>('/api/setup/config');
  }

  saveConfig(config: DeviceConfig): Observable<{ ok: boolean; config: DeviceConfig }> {
    return this.http.post<{ ok: boolean; config: DeviceConfig }>('/api/setup/config', config);
  }

  uploadData(file: File): Observable<UploadSummary> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadSummary>('/api/setup/data', form);
  }

  restart(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/setup/restart', {});
  }
}
