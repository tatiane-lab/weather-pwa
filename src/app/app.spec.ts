import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { describeWmo, toFahrenheit } from './weather/wmo';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('cria o app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza título e busca', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Clima');
    expect(el.querySelector('input[type="search"]')).toBeTruthy();
  });

  it('renderiza a previsão vinda da API', async () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    // Sem geolocalização no jsdom, o app usa a cidade padrão.
    await new Promise((r) => setTimeout(r));
    const req = http.expectOne((r) => r.url.includes('api.open-meteo.com'));
    req.flush({
      current: {
        temperature_2m: 21.4, apparent_temperature: 20, relative_humidity_2m: 60,
        wind_speed_10m: 12, surface_pressure: 1013, precipitation: 0, weather_code: 0, is_day: 1,
      },
      hourly: { time: ['2026-11-24T00:00'], temperature_2m: [20], weather_code: [0], precipitation_probability: [0], is_day: [1] },
      daily: {
        time: ['2026-11-24'], temperature_2m_min: [15], temperature_2m_max: [25], weather_code: [0],
        precipitation_probability_max: [5], sunrise: ['2026-11-24T05:30'], sunset: ['2026-11-24T18:30'], uv_index_max: [8],
      },
    });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Céu limpo');
  });
});

describe('utilitários WMO', () => {
  it('mapeia códigos do tempo', () => {
    expect(describeWmo(0).label).toBe('Céu limpo');
    expect(describeWmo(0, false).icon).toBe('🌙');
    expect(describeWmo(999).label).toBe('Desconhecido');
  });

  it('converte para Fahrenheit', () => {
    expect(toFahrenheit(100)).toBe(212);
    expect(toFahrenheit(0)).toBe(32);
  });
});
