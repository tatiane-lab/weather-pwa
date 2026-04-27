import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, switchMap, shareReplay, catchError, of } from 'rxjs';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  isDay: boolean;
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);
  private apiUrl = '/api/weather';

  isOffline = signal(!navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.isOffline.set(false));
    window.addEventListener('offline', () => this.isOffline.set(true));
  }

  getCurrentLocation(): Observable<Coordinates> {
    return from(
      new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10_000,
          maximumAge: 300_000,
        })
      )
    ).pipe(
      switchMap((pos) =>
        of({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      )
    );
  }

  getWeather(coords: Coordinates): Observable<WeatherData> {
    const params = new HttpParams()
      .set('lat', coords.lat)
      .set('lon', coords.lon);
    return this.http
      .get<WeatherData>(`${this.apiUrl}/current`, { params })
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  getForecast(coords: Coordinates): Observable<ForecastDay[]> {
    const params = new HttpParams()
      .set('lat', coords.lat)
      .set('lon', coords.lon)
      .set('days', 7);
    return this.http
      .get<ForecastDay[]>(`${this.apiUrl}/forecast`, { params })
      .pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(() => of([] as ForecastDay[]))
      );
  }
}
