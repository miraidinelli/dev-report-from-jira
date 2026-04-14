# Dev Report from Jira

A team KPI performance dashboard built with Next.js that pulls data from Jira to track developer productivity, bug fixes, sprint progress, and development metrics in real-time.

## Features

- **Bug & Hotfix Tracking** — displays bugs fixed per developer with time spent and average resolution time, filtered by date range
- **Development Cards Tracking** — monitors feature development work and time spent per developer
- **Open Bugs Dashboard** — shows bugs currently in progress and how long each has been open, helping identify bottlenecks
- **Sprint Management** — tracks active sprint progress, scope growth over time, and visualizes scope creep with charts
- **Presentation Mode** — auto-playing slideshow (25s per slide) of all KPI data, useful for team meetings, with keyboard navigation

## Tech Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Recharts** for data visualization
- **Jira REST API v3** for data source

## Getting Started

### 1. Set up environment variables

Create a `.env.local` file in the project root:

```env
JIRA_SITE=https://your-org.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
```

To generate a Jira API token, go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

### 2. Install dependencies

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/app/
├── api/
│   ├── jira-bugs/        # Completed bug fix metrics
│   ├── jira-dev/         # Feature development metrics
│   ├── jira-open-bugs/   # In-progress bug metrics
│   └── jira-sprint/      # Active sprint data & scope history
├── presentation/         # Slideshow presentation mode
├── sprint/               # Sprint detail page
├── page.tsx              # Main dashboard
└── layout.tsx            # Root layout
```

## Pages

| Route | Description |
|---|---|
| `/` | Main dashboard with bug/dev tabs and date range filter |
| `/sprint` | Sprint progress, scope growth chart, and timeline |
| `/presentation` | Auto-playing KPI slideshow for team meetings |

## Presentation Mode Controls

| Key | Action |
|---|---|
| `Space` / `→` | Next slide |
| `←` | Previous slide |
| `P` | Pause / Resume |
| `ESC` | Close |
