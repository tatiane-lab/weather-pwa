import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { weatherStorage } from './weather-storage';
import { Place, TempUnit, WeatherReport } from './weather.models';
import { WeatherService } from './weather.service';
import { describeWmo, toFahrenheit } from './wmo';

const DEFAULT_PLACE: Place = {
  id: 3448439,
  name: 'São Paulo',
  admin1: 'São Paulo',
  country: 'Brazil',
  latitude: -23.5475,
  longitude: -46.63611,
  timezone: 'America/Sao_Paulo',
};

@Component({
  selector: 'app-weather',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './weather.component.html',
  styleUrl: './weather.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherComponent {
  private readonly service = inject(WeatherService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOffline = this.service.isOffline;

  readonly report = signal<WeatherReport | null>(weatherStorage.loadReport());
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  /** Verdadeiro quando o relatório exibido veio do cache local e não da rede. */
  readonly isStale = signal(this.report() !== null);
  readonly unit = signal<TempUnit>(weatherStorage.loadUnit());
  readonly recent = signal<Place[]>(weatherStorage.loadRecent());

  readonly query = signal('');
  readonly results = signal<Place[]>([]);
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchOpen = signal(false);

  private readonly search$ = new Subject<string>();

  readonly current = computed(() => {
    const r = this.report();
    return r ? { ...r.current, info: describeWmo(r.current.code, r.current.isDay) } : null;
  });

  readonly theme = computed(() => {
    const c = this.current();
    return c ? `${c.info.theme}-${c.isDay ? 'day' : 'night'}` : 'clear-day';
  });

  /** Próximas 24 horas a partir da hora atual (horários no fuso do local). */
  readonly hourly = computed(() => {
    const r = this.report();
    if (!r) return [];
    const nowKey = r.current ? this.localHourKey(r) : '';
    const start = Math.max(0, r.hourly.findIndex((h) => h.time >= nowKey));
    return r.hourly.slice(start, start + 24).map((h) => ({ ...h, info: describeWmo(h.code, h.isDay) }));
  });

  readonly daily = computed(() => {
    const r = this.report();
    if (!r) return [];
    const min = Math.min(...r.daily.map((d) => d.tempMin));
    const max = Math.max(...r.daily.map((d) => d.tempMax));
    const span = Math.max(1, max - min);
    return r.daily.map((d) => ({
      ...d,
      info: describeWmo(d.code),
      barLeft: ((d.tempMin - min) / span) * 100,
      barWidth: Math.max(8, ((d.tempMax - d.tempMin) / span) * 100),
    }));
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((q) => {
          this.searchError.set(null);
          this.isSearching.set(q.length >= 2);
          if (q.length < 2) this.results.set([]);
        }),
        switchMap((q) =>
          q.length < 2
            ? EMPTY
            : this.service.searchPlaces(q).pipe(
                catchError(() => {
                  this.searchError.set('Falha na busca. Verifique sua conexão e tente novamente.');
                  return of([] as Place[]);
                }),
                finalize(() => this.isSearching.set(false)),
              ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((places) => this.results.set(places));

    this.start();
  }

  // ---- actions -----------------------------------------------------------

  onQuery(value: string): void {
    this.query.set(value);
    this.searchOpen.set(true);
    this.search$.next(value.trim());
  }

  selectPlace(place: Place): void {
    this.query.set('');
    this.results.set([]);
    this.searchOpen.set(false);
    this.notice.set(null);
    this.load(place);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  useMyLocation(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.service
      .getCurrentPosition()
      .then((pos) => {
        this.service
          .reversePlace(pos.latitude, pos.longitude)
          .pipe(
            catchError(() =>
              of<Place>({
                id: 0,
                name: 'Minha localização',
                country: '',
                latitude: pos.latitude,
                longitude: pos.longitude,
                timezone: 'auto',
              }),
            ),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((place) => this.load(place));
      })
      .catch((err: { code?: number }) => {
        this.isLoading.set(false);
        const msg =
          err?.code === 1
            ? 'Permissão de localização negada. Busque uma cidade.'
            : 'Não foi possível obter sua localização. Busque uma cidade.';
        if (this.report()) this.notice.set(msg);
        else this.load(this.recent()[0] ?? DEFAULT_PLACE, msg);
      });
  }

  retry(): void {
    const place = this.report()?.place ?? this.recent()[0] ?? DEFAULT_PLACE;
    this.load(place);
  }

  toggleUnit(): void {
    this.unit.update((u) => (u === 'C' ? 'F' : 'C'));
    weatherStorage.saveUnit(this.unit());
  }

  temp(celsius: number): number {
    return this.unit() === 'C' ? celsius : toFahrenheit(celsius);
  }

  placeLabel(p: Place): string {
    return [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, p.country]
      .filter(Boolean)
      .join(', ');
  }

  // ---- internals ---------------------------------------------------------

  private start(): void {
    const cached = this.report();
    if (cached) {
      this.load(cached.place);
    } else {
      this.useMyLocation();
    }
  }

  private load(place: Place, notice?: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    if (notice) this.notice.set(notice);

    this.service
      .getReport(place)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.isStale.set(false);
          weatherStorage.saveReport(report);
          this.remember(place);
        },
        error: () => {
          this.isStale.set(true);
          this.error.set(
            this.report()
              ? null
              : this.isOffline()
                ? 'Você está offline e ainda não há previsão salva.'
                : 'O serviço de clima está indisponível no momento. Tente novamente.',
          );
          if (this.report()) {
            this.notice.set(
              this.isOffline()
                ? 'Você está offline. Exibindo a última previsão salva.'
                : 'Não foi possível atualizar. Exibindo a última previsão salva.',
            );
          }
        },
      });
  }

  private remember(place: Place): void {
    const list = [place, ...this.recent().filter((p) => p.id !== place.id)].slice(0, 5);
    this.recent.set(list);
    weatherStorage.saveRecent(list);
  }

  private localHourKey(r: WeatherReport): string {
    // Os horários do Open-Meteo são ISO locais sem fuso no fuso do local.
    try {
      const tz = r.place.timezone === 'auto' ? undefined : r.place.timezone;
      const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
      }).format(new Date());
      // "2026-11-24 14" -> "2026-11-24T14:00"
      return parts.replace(' ', 'T').slice(0, 13) + ':00';
    } catch {
      return r.hourly[0]?.time ?? '';
    }
  }
}
