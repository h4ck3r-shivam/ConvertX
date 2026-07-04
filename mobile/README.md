# Convertor King — Mobile App

A hybrid native mobile app for Convertor King, built with React Native + Expo.

## Features

- **Offline-first**: Image and text conversions work fully offline using native APIs
- **Server sync**: Connects to your self-hosted Convertor King server for complex conversions
- **Job queue**: Queues conversions while offline, syncs when connection returns
- **Secure auth**: JWT token stored in device secure storage (Keychain/Keystore)
- **Native UI**: Real native components, not a web wrapper — passes App Store review

## Architecture

```
mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/             # Auth group (login, register)
│   ├── (tabs)/             # Main tab navigation
│   │   ├── index.tsx       # Home — file picker + convert
│   │   ├── history.tsx     # Conversion history
│   │   └── settings.tsx    # Account + server config
│   ├── results/[id].tsx    # Job results detail
│   └── _layout.tsx         # Root layout with providers
├── components/
│   └── Loader.tsx          # Animated crown loader (matching web)
├── lib/
│   ├── api.ts              # Typed API client (Bearer token auth)
│   ├── convert.ts          # Native conversion engine (images, text)
│   ├── db.ts               # expo-sqlite offline database
│   ├── store.ts            # Zustand stores (auth, theme)
│   └── sync.ts             # Background sync manager
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

## Getting Started

```bash
cd mobile
npm install
npx expo start
```

## Connecting to Your Server

1. Open the app
2. Tap "Configure server" on the login screen
3. Enter your Convertor King server URL (e.g., `http://192.168.1.100:3000`)
4. Login with your server credentials

## API Endpoints

The mobile app uses the `/api/v1/*` JSON API layer on the Convertor King server:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | POST | Login, returns JWT |
| `/api/v1/auth/register` | POST | Register, returns JWT |
| `/api/v1/auth/me` | GET | Get current user |
| `/api/v1/auth/account` | POST | Update account |
| `/api/v1/jobs` | POST | Create a job |
| `/api/v1/jobs` | GET | List all jobs |
| `/api/v1/jobs/:id` | GET | Get job details |
| `/api/v1/jobs/:id/upload` | POST | Upload files to job |
| `/api/v1/jobs/:id/convert` | POST | Start conversion |
| `/api/v1/jobs/:id/progress` | GET | Poll conversion progress |
| `/api/v1/jobs/delete` | POST | Delete jobs |
| `/api/v1/converters` | GET | List all converters |
| `/api/v1/conversions` | POST | Get possible targets for file type |
| `/api/v1/config` | GET | Server config |

## Offline Conversion Support

| Format | Offline? | Method |
|---|---|---|
| PNG ↔ JPEG ↔ WebP ↔ BMP | ✅ | expo-image-manipulator |
| JSON ↔ CSV ↔ YAML ↔ XML | ✅ | Pure JS converters |
| MD ↔ TXT | ✅ | Pure JS |
| Video (FFmpeg) | ❌ | Requires server |
| Office docs (LibreOffice) | ❌ | Requires server |
| SVG (Inkscape) | ❌ | Requires server |

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```
