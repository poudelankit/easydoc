# EasyDocument Mobile

Flutter application for EasyDocument customers and agents.

## Planned Scope

- Customer OTP authentication and profile setup.
- Agent OTP authentication and KYC onboarding.
- Role-aware navigation for customer and agent flows.
- Customer task creation and task detail placeholders.
- Agent nearby request and accepted task detail placeholders.
- Customer task timeline and completion placeholders.
- Agent progress update and expected delivery date placeholders.
- Audio, video, incoming call, active call, and external phone call placeholders with `tel:` URI launch support.
- Dispute opening, dispute status, and resolution summary placeholders.
- Leave review, rating selector, review text, and agent reviews placeholders.
- Notification list, unread badge/count, and mark-as-read placeholders.
- Future production chat/call/dispute/review/notification client integration.

## Current State

This folder contains the Phase 10 Flutter shell for OTP, customer profile, agent KYC onboarding, customer task placeholders, agent task placeholders, task chat placeholders, task lifecycle placeholders, task call placeholders, task dispute placeholders, review/reputation placeholders, notification placeholders, and compile-time environment validation. API integration will be wired after the backend contracts stabilize.

## Local Setup

Prerequisite: install the Flutter SDK and make sure `flutter --version` works before running the mobile app.

```bash
flutter pub get
flutter analyze
flutter test
```

Production-style runs must pass compile-time configuration:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://api.easydocument.example/v1 \
  --dart-define=SOCKET_URL=https://api.easydocument.example \
  --dart-define=GOOGLE_MAPS_API_KEY=replace-with-real-key \
  --dart-define=PRODUCTION=true
```

## Local Linux Validation

Linux desktop support is included only as a local validation target.

Prerequisites:

- Flutter Linux desktop support enabled.
- Linux desktop build toolchain available; verify with `flutter doctor`.

Run locally:

```bash
flutter run -d linux
```

## Local Backend Demo Viewing

Seed the local demo data from the repository root before launching Flutter:

```bash
./scripts/start-local-infra.sh
DATABASE_URL=postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument ./scripts/validate-migrations.sh
./scripts/seed-local-demo-data.sh
```

Start the backend on `localhost:3000`, then run the mobile shell:

```bash
flutter run -d linux \
  --dart-define=API_BASE_URL=http://localhost:3000/v1 \
  --dart-define=SOCKET_URL=http://localhost:3000
```

Use the OTP tab with the local mock OTP:

- Customer: `+9779800000100`
- Agent: `+9779800000200`
- OTP: `123456`

After login:

- Customer tabs load assigned task detail, timeline, messages, submitted reviews, and notifications from the backend.
- Agent tabs load nearby requests, assigned task detail, timeline, messages, received reviews, and notifications from the backend.

For a physical phone, replace `localhost` with the LAN IP address of the machine running the backend.

## Android Setup

Android platform support is included, but emulator/device testing requires the Android SDK.

Install Android Studio or Android command-line tools, then make sure these are available:

- Android SDK.
- Android SDK Platform Tools.
- Android SDK Build Tools.
- An Android emulator image or a USB-connected Android device.

After installing Android tooling:

```bash
flutter doctor --android-licenses
flutter doctor
flutter devices
flutter run -d <android-device-id>
```
