import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Place, WeatherReport } from './weather.models';

interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;
}

interface ForecastResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    surface_pressure: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

interface ReverseResponse {
  address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
}

/** Acesso a dados do Open-Meteo (sem chave de API) + estado de conectividade. */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  private readonly forecastUrl = 'https://api.open-meteo.com/v1/forecast';
  private readonly geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  readonly isOffline = signal(typeof navigator !== 'undefined' && !navigator.onLine);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
  }

  /** Resolve a posição do dispositivo; rejeita com objeto tipo GeolocationPositionError. */
  getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject({ code: 0, message: 'Geolocation not supported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        reject,
        { timeout: 10_000, maximumAge: 300_000 },
      );
    });
  }

  /** Geocodificação reversa (melhor esforço) para mostrar o nome real da cidade. */
  reversePlace(latitude: number, longitude: number): Observable<Place> {
    const params = new HttpParams()
      .set('format', 'jsonv2')
      .set('lat', latitude)
      .set('lon', longitude)
      .set('zoom', 10)
      .set('accept-language', 'pt-BR');
    return this.http
      .get<ReverseResponse>('https://nominatim.openstreetmap.org/reverse', { params })
      .pipe(
        map((r) => ({
          id: Math.round(latitude * 1000) * 100000 + Math.round(longitude * 1000),
          name: r.address?.city ?? r.address?.town ?? r.address?.village ?? 'Minha localização',
          admin1: r.address?.state,
          country: r.address?.country ?? '',
          latitude,
          longitude,
          timezone: 'auto',
        })),
      );
  }

  searchPlaces(query: string): Observable<Place[]> {
    const params = new HttpParams().set('name', query).set('count', 6).set('language', 'pt');
    return this.http.get<GeocodingResponse>(this.geocodingUrl, { params }).pipe(
      map((res) =>
        (res.results ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          admin1: r.admin1,
          country: r.country ?? '',
          latitude: r.latitude,
          longitude: r.longitude,
          timezone: r.timezone,
        })),
      ),
    );
  }

  getReport(place: Place): Observable<WeatherReport> {
    const params = new HttpParams()
      .set('latitude', place.latitude)
      .set('longitude', place.longitude)
      .set(
        'current',
        'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,weather_code,is_day',
      )
      .set('hourly', 'temperature_2m,weather_code,precipitation_probability,is_day')
      .set(
        'daily',
        'temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max',
      )
      .set('forecast_days', 7)
      .set('timezone', 'auto');

    return this.http.get<ForecastResponse>(this.forecastUrl, { params }).pipe(
      map((r) => ({
        place,
        fetchedAt: Date.now(),
        current: {
          temperature: r.current.temperature_2m,
          feelsLike: r.current.apparent_temperature,
          humidity: r.current.relative_humidity_2m,
          windSpeed: r.current.wind_speed_10m,
          pressure: r.current.surface_pressure,
          precipitation: r.current.precipitation,
          code: r.current.weather_code,
          isDay: r.current.is_day === 1,
        },
        hourly: r.hourly.time.map((time, i) => ({
          time,
          temperature: r.hourly.temperature_2m[i],
          code: r.hourly.weather_code[i],
          precipProbability: r.hourly.precipitation_probability[i] ?? 0,
          isDay: r.hourly.is_day[i] === 1,
        })),
        daily: r.daily.time.map((date, i) => ({
          date,
          tempMin: r.daily.temperature_2m_min[i],
          tempMax: r.daily.temperature_2m_max[i],
          code: r.daily.weather_code[i],
          precipProbability: r.daily.precipitation_probability_max[i] ?? 0,
          sunrise: r.daily.sunrise[i],
          sunset: r.daily.sunset[i],
          uvIndexMax: r.daily.uv_index_max[i] ?? 0,
        })),
      })),
    );
  }
}
