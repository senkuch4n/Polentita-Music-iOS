# Instalar PolentitaMusic en tu iPhone

PolentitaMusic no está en la App Store. Se instala por **sideload**: agarrás el
archivo `.ipa` y lo firmás con tu propia cuenta de Apple usando una herramienta
como **Sideloadly** o **AltStore**.

| Dato | Valor |
|------|-------|
| Versión | 1.0.0 |
| iOS mínimo | 16.4 |
| Tamaño del `.ipa` | ~38 MB |
| Bundle ID original | `com.polentita.music` (la herramienta lo reescribe al firmar) |

---

## Antes de empezar

Necesitás:

- Una **Mac o PC con Windows**.
- Un **cable USB** para conectar el iPhone (Sideloadly también soporta Wi-Fi una vez emparejado).
- Un **Apple ID**. Sirve uno gratis, pero con limitaciones (ver más abajo).
- El archivo **`PolentitaMusic.ipa`**:
  - Si te lo pasaron, guardalo en el escritorio.
  - Si tenés el código, generalo con `./scripts/build-ipa.sh` (queda en `build/ipa/PolentitaMusic.ipa`).

### Apple ID gratis vs. de pago

| | Gratis | Apple Developer ($99/año) |
|---|---|---|
| Duración de la firma | **7 días** (después la app deja de abrir hasta re-firmar) | **1 año** |
| Apps sideloadeadas a la vez | 3 | sin límite práctico |
| IDs de app por semana | 10 | sin límite |

Con cuenta gratis vas a tener que repetir la instalación (o refrescar con AltStore)
cada 7 días. Es molesto pero funciona.

### Contraseña específica de app (si tenés verificación en dos pasos)

Casi todas las cuentas hoy tienen 2FA. En ese caso, **no** uses tu contraseña normal:

1. Entrá a <https://account.apple.com> → **Iniciar sesión y seguridad** → **Contraseñas específicas de apps**.
2. Creá una nueva (llamala "Sideloadly" o "AltStore").
3. Usá esa contraseña de 16 caracteres cuando la herramienta te pida la del Apple ID.

---

## Opción A — Sideloadly (recomendada para instalar y usar)

Es la más simple. Instala la app una vez; cuando caduca, repetís los pasos.

1. Descargá Sideloadly de <https://sideloadly.io> e instalalo.
2. Conectá el iPhone por USB. En el iPhone, tocá **Confiar** si aparece el aviso.
3. Abrí Sideloadly. Arriba debería aparecer tu iPhone en el desplegable de dispositivos.
4. En **Apple account** escribí tu Apple ID.
5. Arrastrá `PolentitaMusic.ipa` a la ventana de Sideloadly.
6. Click en **Start**.
7. Ingresá la contraseña del Apple ID (la **específica de app** si tenés 2FA).
8. Esperá a que diga **Done**. Tarda 1–3 minutos.
9. En el iPhone: **Ajustes → General → VPN y gestión de dispositivos** → tocá tu
   Apple ID en "App del desarrollador" → **Confiar** → **Confiar** otra vez.
10. Abrí PolentitaMusic desde la pantalla de inicio.

**Para renovar a los 7 días:** conectá el iPhone, abrí Sideloadly y repetí desde
el paso 5. No perdés tus datos (biblioteca, listas) mientras el bundle ID no cambie.

---

## Opción B — AltStore (re-firma sola cada 7 días)

Más trabajo para configurar, pero después la app se renueva sola mientras
**AltServer** esté corriendo en la compu y en la misma red Wi-Fi que el iPhone.

### 1. Instalar AltServer

1. Descargá AltServer de <https://altstore.io>, movelo a Aplicaciones (Mac) y abrilo.
   Aparece un ícono de rombo en la barra de menú / bandeja del sistema.
2. **Mac:** menú de AltServer → **Install Mail Plug-in** y seguí los pasos
   (AltServer lo usa para firmar).
   **Windows:** necesitás iTunes e iCloud instalados desde el sitio de Apple (no
   los de la Microsoft Store).

### 2. Instalar AltStore en el iPhone

3. Conectá el iPhone por USB.
4. Menú de AltServer → **Install AltStore → [tu iPhone]**.
5. Ingresá el Apple ID y su contraseña (la específica de app si tenés 2FA).
6. En el iPhone: **Ajustes → General → VPN y gestión de dispositivos** → **Confiar**
   en tu Apple ID. Abrí **AltStore**.

### 3. Instalar PolentitaMusic

7. Pasá `PolentitaMusic.ipa` al iPhone (AirDrop, o guardalo en la app **Archivos**).
8. En AltStore: pestaña **My Apps** → botón **+** arriba a la izquierda → elegí
   `PolentitaMusic.ipa`.
9. AltStore lo firma e instala.

**Renovación:** dejá AltServer abierto en la compu. Abrí AltStore en el iPhone
cada tantos días (con la compu encendida en la misma red) para que refresque la
firma antes de que venza. También podés activar **Settings → Background Refresh**.

---

## Después de instalar: activar la app

Siempre, la primera vez:

**Ajustes → General → VPN y gestión de dispositivos → [tu Apple ID] → Confiar**

Si no hacés esto, iOS muestra "App no disponible" o "No se pudo verificar la app"
al abrirla.

---

## Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| "No se pudo verificar la app" al abrir | Falta **Confiar** el perfil en Ajustes (ver arriba), o la firma ya caducó → re-instalá / refrescá. |
| La app se cierra sola después de ~7 días | Firma vencida (Apple ID gratis). Re-instalá con Sideloadly o refrescá con AltStore. |
| Sideloadly: "Could not find a valid device" | Reconectá el cable, desbloqueá el iPhone y tocá **Confiar**. Probá otro puerto/cable. |
| Sideloadly/AltStore: error de login | Usá una **contraseña específica de app**, no la normal. Revisá que el Apple ID no esté bloqueado. |
| "Unable to install… maximum number of apps" | Con Apple ID gratis solo entran 3 apps sideloadeadas. Borrá alguna. |
| AltStore no refresca | AltServer tiene que estar abierto en la compu, encendida y en la **misma red Wi-Fi**. |
| Se instala pero no aparece el ícono | Buscala con Spotlight (deslizá hacia abajo en la pantalla de inicio); a veces queda en otra página. |

---

## Privacidad

- Tu Apple ID y su contraseña se usan **solo localmente** entre tu compu y los
  servidores de Apple para firmar la app. Ni PolentitaMusic ni quien te pasó el
  `.ipa` los ven.
- Aun así, se recomienda usar una **contraseña específica de app** y revocarla
  cuando no la necesites más (desde <https://account.apple.com>).

---

## Para desarrolladores: generar el `.ipa`

```bash
cd PolentitaMusic
npm install
npx pod-install        # o: cd ios && pod install
./scripts/build-ipa.sh
# -> build/ipa/PolentitaMusic.ipa  (sin firmar; Sideloadly/AltStore lo firman)
```

El script hace un `xcodebuild archive` en Release con la firma desactivada y
empaqueta el `.app` en un `.ipa`. Requiere Xcode y Node instalados.
