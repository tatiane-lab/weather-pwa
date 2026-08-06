export interface Place {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  precipitation: number;
  code: number;
  isDay: boolean;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  code: number;
  precipProbability: number;
  isDay: boolean;
}

export interface DailyPoint {
  date: string;
  tempMin: number;
  tempMax: number;
  code: number;
  precipProbability: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface WeatherReport {
  place: Place;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  fetchedAt: number;
}

export type TempUnit = 'C' | 'F';
