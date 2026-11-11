# Actuarial Review Workspace

Desktop-first prototype for a Canadian life insurance valuation review. Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev -- --port 4174
```

Open [localhost:4174](http://localhost:4174). The Vite server hosts the frontend and the local mock API. All files, Batch logs, checks, and AI responses are synthetic; no AXIS installation, account, or AI service is needed.

1. Open the October 2026 life reserve valuation (Batch 014). September is the comparison baseline and is already signed off.
2. On **Inputs**, run the checks. Select the seeded **v8** assumptions file and rerun.
3. From **Overview**, open **Reserve roll-forward**. Compare the $105.0M expected closing reserve with the $106.2M AXIS output. Open the sources, then use **Break down by product** and **AI** to see the same $0.9M Term Life and $0.3M Whole Life differences.
4. On **Outputs**, associate the corrected closing reserve file and rerun. Use **Attempt history** to reopen the original failure and its investigation. To exercise the missing-file case, associate **No file associated** for Renewal output, run checks, and then restore the renewal file and rerun before submitting.
5. Submit for review. Switch the demo role to **Reviewer**, open October from **My reviews**, and inspect the fixed version. Sign off, or enter a note and request changes. To resubmit after changes are requested, switch to **Preparer**, open the working run, and submit a new version.

To create a separate draft, switch to **Preparer** and choose **New valuation run** on **Valuation runs**. Pick a synthetic period and enter a unique AXIS Batch ID. The draft inherits that period’s seeded files and starts with no check attempts.

The browser saves work and the active role in local storage. Use a fresh browser profile or clear this site's data to reset the demo.

```sh
npm test           # mock service checks
npm run test:e2e   # browser walkthrough; requires Google Chrome
npm run build      # production bundle
npm run preview    # serves the bundle with the mock API
```
