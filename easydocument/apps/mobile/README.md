# EasyDocument Mobile

Flutter application for EasyDocument customers and agents.

## Planned Scope

- Customer OTP authentication and profile setup.
- Agent OTP authentication and KYC onboarding.
- Role-aware navigation for customer and agent flows.
- Future task, matching, chat, calls, reviews, and disputes modules.

## Current State

This folder contains the Phase 1 Flutter shell for OTP, customer profile, and agent KYC onboarding flows. API integration will be wired after the backend contracts stabilize.

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
