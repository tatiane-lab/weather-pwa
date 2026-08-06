export interface WmoInfo {
  label: string;
  icon: string;
  theme: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
}

const TABLE: Record<number, WmoInfo> = {
  0: { label: 'Céu limpo', icon: '☀️', theme: 'clear' },
  1: { label: 'Predominantemente limpo', icon: '🌤️', theme: 'clear' },
  2: { label: 'Parcialmente nublado', icon: '⛅', theme: 'cloudy' },
  3: { label: 'Nublado', icon: '☁️', theme: 'cloudy' },
  45: { label: 'Neblina', icon: '🌫️', theme: 'fog' },
  48: { label: 'Nevoeiro com geada', icon: '🌫️', theme: 'fog' },
  51: { label: 'Garoa fraca', icon: '🌦️', theme: 'rain' },
  53: { label: 'Garoa', icon: '🌦️', theme: 'rain' },
  55: { label: 'Garoa forte', icon: '🌧️', theme: 'rain' },
  56: { label: 'Garoa congelante', icon: '🌧️', theme: 'rain' },
  57: { label: 'Garoa congelante', icon: '🌧️', theme: 'rain' },
  61: { label: 'Chuva fraca', icon: '🌦️', theme: 'rain' },
  63: { label: 'Chuva', icon: '🌧️', theme: 'rain' },
  65: { label: 'Chuva forte', icon: '🌧️', theme: 'rain' },
  66: { label: 'Chuva congelante', icon: '🌧️', theme: 'rain' },
  67: { label: 'Chuva congelante', icon: '🌧️', theme: 'rain' },
  71: { label: 'Neve fraca', icon: '🌨️', theme: 'snow' },
  73: { label: 'Neve', icon: '❄️', theme: 'snow' },
  75: { label: 'Neve forte', icon: '❄️', theme: 'snow' },
  77: { label: 'Grãos de neve', icon: '🌨️', theme: 'snow' },
  80: { label: 'Pancadas de chuva', icon: '🌦️', theme: 'rain' },
  81: { label: 'Pancadas de chuva', icon: '🌧️', theme: 'rain' },
  82: { label: 'Pancadas violentas', icon: '⛈️', theme: 'storm' },
  85: { label: 'Pancadas de neve', icon: '🌨️', theme: 'snow' },
  86: { label: 'Pancadas de neve forte', icon: '❄️', theme: 'snow' },
  95: { label: 'Tempestade', icon: '⛈️', theme: 'storm' },
  96: { label: 'Tempestade com granizo', icon: '⛈️', theme: 'storm' },
  99: { label: 'Tempestade severa', icon: '⛈️', theme: 'storm' },
};

export function describeWmo(code: number, isDay = true): WmoInfo {
  const info = TABLE[code] ?? { label: 'Desconhecido', icon: '🌡️', theme: 'cloudy' as const };
  if (!isDay && code <= 1) {
    return { ...info, icon: '🌙' };
  }
  return info;
}

export function toFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}
