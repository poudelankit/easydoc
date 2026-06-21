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
flutter run
```

Run tests:

```bash
flutter test
```
