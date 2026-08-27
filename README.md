<div align="center">
  <img src="docs/assets/icon-512.png" width="96" alt="Polentita Music" />
  <h1>Polentita Music</h1>
  <p>Reproductor de música local para iPhone — biblioteca offline, importación de playlists de Spotify/YouTube y reproducción en segundo plano.</p>
  <p>
    <a href="https://senkuch4n.github.io/Polentita-Music-iOS/"><b>Sitio web</b></a> ·
    <a href="INSTALL.md"><b>Guía de instalación</b></a> ·
    <a href="https://github.com/senkuch4n/Polentita-Music-iOS/releases/latest"><b>Descargar .ipa</b></a>
  </p>
</div>

---

## Qué es

App de música construida con Expo / React Native (workflow *bare*, código nativo
en `ios/`). No está en la App Store: se distribuye como `.ipa` y se instala por
**sideload** con [Sideloadly](https://sideloadly.io) o [AltStore](https://altstore.io).

- Biblioteca local en SQLite, reproducción con `react-native-track-player`.
- Importación de playlists de Spotify y YouTube, con un bridge Python/QuickJS
  embebido para resolver y descargar el audio (yt-dlp).
- Editor de metadatos y portada por canción.
- Sin cuentas, sin anuncios, sin telemetría. Funciona offline.

## Instalar (usuarios)

Ver **[INSTALL.md](INSTALL.md)** para la guía completa (Sideloadly y AltStore),
requisitos y solución de problemas. Resumen:

1. Descargá `PolentitaMusic.ipa` desde [Releases](https://github.com/senkuch4n/Polentita-Music-iOS/releases/latest).
2. Firmalo con tu Apple ID usando Sideloadly o AltStore.
3. En el iPhone: **Ajustes → General → VPN y gestión de dispositivos → Confiar**.

Requiere iOS 16.4+. Con Apple ID gratuito la firma dura 7 días.

## Compilar (desarrolladores)

```bash
npm install
npx pod-install
npm run ios            # correr en simulador / dispositivo con Xcode

# generar un .ipa sin firmar para sideload:
./scripts/build-ipa.sh # -> build/ipa/PolentitaMusic.ipa
```

`scripts/build-ipa.sh` hace `xcodebuild archive` en Release con la firma
desactivada y empaqueta el `.app` en un `.ipa`. Sideloadly / AltStore lo firman
al instalar.

## Sitio web

La landing en `docs/` se publica con **GitHub Pages** (rama `master`, carpeta
`/docs`): <https://senkuch4n.github.io/Polentita-Music-iOS/>

## Aviso legal

Software libre para uso personal. No está afiliado a Apple, Spotify ni YouTube.
Usá la app de acuerdo con las leyes y los términos de servicio aplicables en tu país.
