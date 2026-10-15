# Web-guide operational decisions

User-invoked grilling session, 2026-10-13. This records decisions; it does not
by itself send notifications or publish guides. The user confirmed the final
shared understanding and instructed implementation to resume.

## Accepted decisions

- Activate the author acquisition page for the first release with a real
  WhatsApp contact controlled and monitored by the owner.
  User supplied +5511953664050 for those public contact buttons.
- Send external alerts for author approvals. Correction reports remain in the
  durable local operator inbox for regular review.
- Retain Frankenstein's explicit missing-arc limitation for the first public
  example. Add a novel-only arc only after suitable source review.
- Retain the 24-hour publication and private correction promises for the initial
  pilot. Owner accepted daily inbox review, including weekends.
- Route approval alerts to the existing business inbox, lead@enrichreader.com.
  Existing backend Resend infrastructure is available for implementation reuse;
  guide approval delivery now uses a durable approval-only Resend outbox.
  Runtime delivery requires the existing RESEND_API_KEY to be supplied securely.

## Interview complete

All decisions and the WhatsApp input are resolved. The user explicitly confirmed
the final shared understanding and instructed implementation to resume. No
external email was sent during implementation or verification.

## Settled scope

The eleven finalized UI units remain authoritative. Multi-book integration,
measurement, source safety checks and final verification are implementation work,
not new owner decisions. Completion means verified implementation and deployment
readiness; production publication and external outreach remain outside the
existing authorization.
