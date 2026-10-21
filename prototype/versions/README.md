# UI versions

Versioning applies only to **Workflow Setup** (the landing page with the Workflows table). Agents and Templates are shared Version 0 UI with no version switcher.

| Version | Path | Create experience |
| --- | --- | --- |
| **Version 0** | `versions/v0/landing/` | Page flow: Describe → Generate → Review |
| **Version 1** | `versions/v1/landing/` | Modal: Describe → Blueprint |
| **Version 3** | Live `landing/` | Full-screen sidebar steps |

## Shared pages (no versioning)

- `/agents/` — Version 0 Workflow Agents UI
- `/templates/` — Version 0 Workflow Templates UI

Side nav from any Setup version links to these shared pages. **Workflow Setup** returns to the last selected version (stored in `sessionStorage`).

## Switching

The Setup bar **Version** dropdown appears only on Workflow Setup. It always navigates between landing pages (`shared/versions.js` + `shared/version-switcher.js`).
