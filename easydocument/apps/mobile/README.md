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

This folder contains the Phase 9 Flutter shell for OTP, customer profile, agent KYC onboarding, customer task placeholders, agent task placeholders, task chat placeholders, task lifecycle placeholders, task call placeholders, task dispute placeholders, review/reputation placeholders, and notification placeholders. API integration will be wired after the backend contracts stabilize.

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
