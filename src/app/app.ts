import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { WeatherComponent } from './weather/weather.component';
import { WeatherService } from './weather/weather.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-root',
  imports: [WeatherComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly isOffline = inject(WeatherService).isOffline;
  protected readonly installEvent = signal<BeforeInstallPromptEvent | null>(null);

  @HostListener('window:beforeinstallprompt', ['$event'])
  protected onBeforeInstall(event: Event): void {
    event.preventDefault();
    this.installEvent.set(event as BeforeInstallPromptEvent);
  }

  @HostListener('window:appinstalled')
  protected onInstalled(): void {
    this.installEvent.set(null);
  }

  protected async install(): Promise<void> {
    const ev = this.installEvent();
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice;
    this.installEvent.set(null);
  }
}
