import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { switchMap, catchError, of, tap } from 'rxjs';
import { WeatherService, WeatherData, ForecastDay, Coordinates } from './weather.service';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe],
  templateUrl: './weather.component.html',
})
export class WeatherComponent implements OnInit {
  private weatherService = inject(WeatherService);
  private destroyRef = inject(DestroyRef);

  weather = signal<WeatherData | null>(null);
  forecast = signal<ForecastDay[]>([]);
  coords = signal<Coordinates | null>(null);
  isLoading = signal(false);
  locationError = signal<string | null>(null);

  isOffline = this.weatherService.isOffline;

  tempUnit = signal<'C' | 'F'>('C');

  displayTemp = computed(() => {
    const temp = this.weather()?.temperature;
    if (temp === undefined) return null;
    return this.tempUnit() === 'C' ? temp : (temp * 9) / 5 + 32;
  });

  ngOnInit() {
    this.loadWeather();
  }

  loadWeather() {
    this.isLoading.set(true);
    this.locationError.set(null);

    this.weatherService
      .getCurrentLocation()
      .pipe(
        tap((coords) => this.coords.set(coords)),
        switchMap((coords) => this.weatherService.getWeather(coords)),
        catchError((err) => {
          this.locationError.set(
            err.code === 1
              ? 'Location access denied. Please enable location permissions.'
              : 'Unable to get location. Check your connection.'
          );
          this.isLoading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        if (data) this.weather.set(data);
        this.isLoading.set(false);
      });
  }

  toggleUnit() {
    this.tempUnit.update((u) => (u === 'C' ? 'F' : 'C'));
  }
}
