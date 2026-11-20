---
name: modern-web-guidance
description: Look up browser support and implementation guidance when choosing a native control, focus behavior, browser API, or browser-sensitive layout.
---

From the project root, use the CLI pinned in the lockfile. Search for the browser behavior, then retrieve the matching guide by its returned ID.

```sh
DISABLE_TELEMETRY=1 yarn modern-web-guidance search "expand disclosure details"
DISABLE_TELEMETRY=1 yarn modern-web-guidance retrieve accordion
```

Apply the relevant guidance to browser-facing changes in the stats dashboard under `web/`. Verify the affected surface using the [browser verification playbook](../../../docs/agent-playbooks/verification.md).
