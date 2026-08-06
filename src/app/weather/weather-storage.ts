import { Place, TempUnit, WeatherReport } from './weather.models';

const KEYS = {
  unit: 'weather.unit',
  recent: 'weather.recent',
  report: 'weather.lastReport',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento indisponível (modo privado / cota) - pode ignorar
  }
}

export const weatherStorage = {
  loadUnit: (): TempUnit => (read<TempUnit>(KEYS.unit, 'C') === 'F' ? 'F' : 'C'),
  saveUnit: (u: TempUnit) => write(KEYS.unit, u),
  loadRecent: (): Place[] => read<Place[]>(KEYS.recent, []),
  saveRecent: (p: Place[]) => write(KEYS.recent, p),
  loadReport: (): WeatherReport | null => read<WeatherReport | null>(KEYS.report, null),
  saveReport: (r: WeatherReport) => write(KEYS.report, r),
};
