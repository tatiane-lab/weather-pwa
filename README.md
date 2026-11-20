# Clima PWA

App de previsão do tempo instalável e com suporte offline, feito com **Angular 22**, signals e service worker do Angular. Os dados vêm do [Open-Meteo](https://open-meteo.com/) (gratuito, sem chave de API).

## Funcionalidades

- **Condições atuais** - temperatura, sensação térmica, umidade, vento, pressão, índice UV, nascer e pôr do sol.
- **Próximas 24 horas** e **previsão de 7 dias**, com probabilidade de chuva e barras de variação de temperatura.
- **Busca de cidades** com autocomplete (debounce, geocoding do Open-Meteo) e lista de locais recentes.
- **Geolocalização** - botão "Usar minha localização" com geocodificação reversa; fallback para uma cidade padrão se a permissão for negada.
- **Alternância °C / °F**, persistida em `localStorage`.
- **Modo offline** - a última previsão fica salva localmente e aparece na hora ao abrir o app (marcada como "Previsão salva"); um banner reage aos eventos `online`/`offline`.
- **PWA instalável** - manifest, ícones PNG/SVG/maskable e botão "Instalar app" via `beforeinstallprompt`.
- **Skeleton de loading, estados vazio e de erro**, com nova tentativa.
- Tema adaptativo por condição do tempo e dia/noite, UI clara/escura automática, layout responsivo e respeito a `prefers-reduced-motion`.
- Textos, datas e números em pt-BR.

## Stack

Angular 22 (componentes standalone, signals, `@let`, novo control flow, OnPush) - `@angular/service-worker` - RxJS 7 - SCSS - Vitest (`ng test`). TypeScript e templates em modo estrito.

## Como rodar

```bash
npm install
npm start                      # dev server (service worker desativado em dev)
npm run build                  # build de produção + ngsw.json
npx http-server dist/ng-weather-pwa/browser -p 4211   # testar service worker / instalação
npm test                       # testes unitários
```

O `.npmrc` define `legacy-peer-deps=true` porque alguns peers das ferramentas ainda não acompanham o Angular 22 / TypeScript 6.

## Arquitetura

```
src/app/
  app.ts / app.html        shell: cabeçalho, banner offline, convite de instalação
  weather/
    weather.component.*    view + estado da tela (signals, computed)
    weather.service.ts     acesso HTTP ao Open-Meteo, geolocalização, sinal online/offline
    weather-storage.ts     wrapper defensivo de localStorage (unidade, recentes, último relatório)
    weather.models.ts      modelos de domínio tipados (DTOs da API são mapeados, não vazam para a UI)
    wmo.ts                 código WMO -> descrição / ícone / tema
```

Decisões:

- **Signals + `computed`** para todo o estado de view; RxJS apenas onde faz mais sentido (busca com debounce e `switchMap`, HTTP).
- **Mapeamento da API no service** - a UI usa um modelo de domínio limpo, não os arrays paralelos do Open-Meteo.
- **UX stale-while-revalidate** - o relatório em cache aparece imediatamente e é atualizado em segundo plano; falhas degradam para a previsão salva com aviso, em vez de tela vazia.
- **Data groups do service worker** (`ngsw-config.json`): a API de previsão usa `freshness` (rede primeiro, timeout de 6 s, fallback de 3 h); geocoding usa `performance` (cache primeiro, 7 d). O app shell é `prefetch`.
- **Sem segredos nem backend** - todas as APIs são públicas e com CORS habilitado.

## Estratégias de cache

| Grupo | Estratégia | TTL |
|---|---|---|
| Previsão (`api.open-meteo.com`) | `freshness` | 3 h |
| Geocoding / geocodificação reversa | `performance` | 7 d |
| App shell | `prefetch` | - |
