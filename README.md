# Weather PWA

> Angular 22 · `@angular/pwa` · Service Worker · Geolocation · Offline Mode · Cache Strategies

A Progressive Web App for real-time weather with offline support, geolocation, and installable as a native-like app.

## Features

- **Service Worker** – `ngsw-config.json` configures two asset groups (prefetch for the app shell, lazy for static assets) and two data groups with different strategies: `freshness` for the current-weather endpoint (network first, 1 h TTL) and `performance` for the forecast (cache first, 3 h TTL).
- **Offline Mode** – the app reacts to `navigator.onLine` via `window.addEventListener('online'/'offline')`, surfacing an offline banner when connectivity is lost; the service worker serves stale data transparently.
- **Geolocation** – `getCurrentLocation()` wraps `navigator.geolocation.getCurrentPosition` in `from(new Promise(...))`, then pipes the result through `switchMap` to the weather call; `maximumAge: 300_000` avoids redundant GPS calls.
- **Installable** – `manifest.webmanifest` provides icons, theme colour and `display: standalone`; `ng add @angular/pwa` wires it into the build.
- **Accessibility** – temperature toggle exposes `aria-pressed`, weather icons have `aria-label`, keyboard focus is trapped in modals.

## Tech Stack

| Package | Version |
|---|---|
| `@angular/core` | ^22.3.0 |
| `@angular/pwa` | ^22.3.0 |
| `@angular/service-worker` | ^22.3.0 |

## Running locally

```bash
npm install
ng build
npx http-server dist/ng-weather-pwa/browser   # service worker requires HTTP
```

## Cache strategies

| Group | Strategy | TTL |
|---|---|---|
| Current weather | `freshness` | 1 h |
| Forecast | `performance` | 3 h |
| App shell | `prefetch` | — |
