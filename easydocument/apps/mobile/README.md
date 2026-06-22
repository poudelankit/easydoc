# EasyDocument Mobile

Flutter application for EasyDocument customers and agents.

## Planned Scope

- Customer OTP authentication and profile setup.
- Agent OTP authentication and KYC onboarding.
- Role-aware navigation for customer and agent flows.
- Customer task creation and task detail placeholders.
- Agent nearby request and accepted task detail placeholders.
- Future chat, calls, reviews, and disputes modules.

## Current State

This folder contains the Phase 2 Flutter shell for OTP, customer profile, agent KYC onboarding, customer task placeholders, and agent task placeholders. API integration will be wired after the backend contracts stabilize.

## Local Setup

Prerequisite: install the Flutter SDK and make sure `flutter --version` works before running the mobile app.

```bash
flutter pub get
flutter analyze
flutter test
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
