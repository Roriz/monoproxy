# Screenshot critique and fix loop

Owner request (2026-10-14): capture the pages, ask a sub-agent with minimal context
for a critique, ask another sub-agent to fix critical issues, and repeat until
there are no critical issues or the same item regresses.

Each round uses fresh isolated review context. Reviewers see screenshots and a
short UX brief, without implementation history or repository investigation. A
critical issue blocks the primary task, makes essential controls/content unreadable,
or creates serious misleading hierarchy. Cosmetic preferences are non-critical.
A separate implementer gets the issue report plus relevant implementation/design
constraints, applies only critical fixes, and verifies them. The next capture
must demonstrate the fix and preserve the prior screenshots' core tasks.

Stop when an independent fresh reviewer reports zero critical issues, or a
previously fixed critical issue reappears. Record any regression without repeatedly
patching the same item. Screenshots stay in tmp/web-guide-ui/ and are not served.

## Round 1

Capture: tmp/web-guide-ui/round-01. Pages: reader gate, panel, profile, world,
timeline, mysteries, position picker and author acquisition; 360px and 1280px.
Completed. The isolated reviewer inspected the eight page/dialog types at both
widths. One conditional finding, UX-C01, concerned an invisible picker in the
initial print. Recapturing after its opening animation showed complete controls;
the reviewer withdrew the finding. The separate implementation agent independently
inspected both settled captures and agreed: **zero confirmed critical issues**.
No product UI code changed and no same-item regression occurred. Stop condition met.

Critique: `tmp/web-guide-ui/round-01/critique.md`.
Implementation verification: `tmp/web-guide-ui/round-01/fixes.md`.
Final prints: `tmp/web-guide-ui/round-01-settled/`.

Optional observations remain documented, not applied: earlier English-example
language disclosure and less whitespace between world groups. Source prose remains
English as approved; those observations do not block the primary reader/author tasks.

## Repeatable capture

```sh
WEB_GUIDE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node scripts/web-guide/capture-ui.mjs tmp/web-guide-ui/round-02
```

The capture helper starts an ephemeral local server with external notification
transport disabled, captures full pages and first viewports, waits for the picker
opening transition, checks horizontal overflow/browser errors, and exercises a
no-JS position commit. External resources are blocked for reproducible offline
captures, so screenshots use local fallback fonts. No production state changes.
Future rounds must give fresh critics only captures, primary tasks, severity
criteria and the intentional language boundary. Do not give them prior findings;
compare their fresh findings against stable prior IDs in the parent loop record.


## Desktop port — owner follow-up

The owner identified that the reader shell still felt phone-only on desktop.
The previous screenshot-only critical review did not catch that missing adaptation.
Implemented the desktop shell from U1 and expanded useful multi-column surfaces:
header text navigation above 1024px, no desktop bottom bar, centered 480px dialogs,
two-column gate/panel, two-column world and mystery cards, and a three-column footer.
Prose keeps a readable measure. Below 1024px, navigation stays at the bottom and
dialogs remain sheets. The same navigation DOM preserves URL state and event hooks.

Verification: existing 87 checks passed; an additional browser check passed at
360, 768, 1024, 1440 and 1920px, exercising nav bounds, panel columns, centered
modals, Escape/history, unchanged memory and positioned world navigation. Fresh
full/fold captures and no-JS checks passed. An isolated screenshot reviewer found
zero critical issues in desktop and mobile captures. Prints/review:
`tmp/web-guide-ui/desktop-port/`. No production deployment occurred.

## CSS-only responsiveness — owner follow-up

Owner clarified the affected page is the Frankenstein guide and requires viewport
media queries, without JavaScript choosing a layout type. Production CSS matched
the local desktop revision; the gap was the missing intermediate tablet treatment.

Responsive contract uses CSS viewport pixels:

- Below 768px: one column, bottom navigation, bottom sheets.
- 768–1023px: two-row header navigation, adaptive content grids, centered dialogs.
- From 1024px: single-row desktop header, wide panel/list grids, centered dialogs.

The HTML is shared across sizes. `data-page-type` identifies the route/content,
not a viewport mode. Removed visualViewport/resize handlers and inline dialog-height
CSS variables. Dialog height now uses `dvh`; viewport metadata allows supported
mobile browsers to resize content for the software keyboard. Focus/anchor offsets
follow header height through CSS custom properties. No user-agent/device detection.

All 88 checks passed, including script-disabled resize of the same document across
320, 375, 640, 767, 768, 1023, 1024, 1280 and 1920px. Navigation, panel/card layout,
modal placement, history, memory and overflow are covered. Production re-deployment
was requested as continuation of the authorized UI deployment; live verification
is recorded in the deployment log.
