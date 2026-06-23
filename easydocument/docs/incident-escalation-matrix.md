# Incident Escalation Matrix

## Roles

- Incident lead: owns triage and decision-making.
- Backend owner: API, database, Redis, MinIO, providers.
- Mobile owner: Flutter release and client configuration.
- Admin owner: React admin portal and operational workflows.
- Infrastructure owner: Kubernetes, ingress, TLS, registry, secrets.
- Communications owner: stakeholder and support updates.

## Escalation

- `SEV1`: page incident lead, infrastructure owner, backend owner, and communications owner immediately.
- `SEV2`: page incident lead and owning engineer; update stakeholders every 30 minutes.
- `SEV3`: assign owner during business hours and monitor.
- `SEV4`: backlog with next maintenance release.

## External Providers

- SMS provider support contact.
- Firebase/GCP support contact.
- Cloud/database provider support contact.
- DNS/ingress provider support contact.

Keep real names, phone numbers, and vendor account IDs outside this repository in the internal incident system.

