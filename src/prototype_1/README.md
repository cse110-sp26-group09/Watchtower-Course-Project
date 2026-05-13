# WatchTower Prototype 1

A lightweight vanilla JavaScript implementation demonstrating core WatchTower observability features.

## Overview

This prototype showcases the fundamental capabilities of WatchTower:

- **Frontend Error Tracking** – Capture and log unhandled JavaScript errors
- **Performance Monitoring** – Track page load times and route-specific latency
- **User Interaction Capture** – Record user actions (clicks, form submissions, navigation)
- **Backend Event API** – Receive, store, and retrieve events
- **Real-Time Dashboard** – Display error feeds, latency metrics, and active user counts

## Project Structure

```
prototype_1/
├── dashboard/           # Real-time monitoring interface
│   ├── app.js          # Dashboard logic
│   ├── index.html      # UI markup
│   └── style.css       # Styling
├── demo/               # Interactive demo page
│   ├── app.js          # Demo app logic
│   ├── index.html      # Demo page with test events
│   └── style.css       # Demo styling
├── sdk/                # JavaScript monitoring SDK
│   └── watchtower.js   # Core SDK for error/event capture
├── server/             # Backend API
│   └── server.js       # Node.js event handler
└── package.json        # Dependencies and scripts
```

## Setup & Installation

### Prerequisites
- Node.js and npm
- A modern web browser

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server:**
   ```bash
   npm start
   ```
   The server runs on `http://localhost:3000`

3. **Open the dashboard:**
   - Navigate to `http://localhost:3000/dashboard`

4. **Trigger events:**
   - Open the demo page: `http://localhost:3000/demo`
   - Interact with the page to generate events
   - Watch them appear in the dashboard in real time

## Components

### SDK (`sdk/watchtower.js`)

The core monitoring library included on client pages.

**Features:**
- Automatic error capture
- Performance API integration
- Event tracking and reporting
- Configurable event forwarding

**Usage:**
```html
<script src="/sdk/watchtower.js"></script>
<script>
  WatchTower.init({
    apiEndpoint: 'http://localhost:3000/api/events'
  });
</script>
```

### Dashboard (`dashboard/`)

Real-time visualization of monitored events.

**Displays:**
- Error feed with timestamps and stack traces
- Latency chart showing performance over time
- Active user count

### Server (`server/server.js`)

Simple Node.js backend that receives events and serves the dashboard.

**Endpoints:**
- `POST /api/events` – Receive events from clients
- `GET /api/events` – Retrieve stored events
- `GET /dashboard` – Serve dashboard UI
- `GET /demo` – Serve demo page

## Running the Demo

1. Start the server: `npm start`
2. Open `http://localhost:3000/demo` in your browser
3. Interact with the demo page (trigger errors, navigate, etc.)
4. Switch to the dashboard tab to see real-time updates

## Testing

To validate the SDK and server:

1. Open the demo page
2. Check the browser console for SDK logs
3. Verify events appear in the dashboard
4. Check network tab to see API calls

## Limitations & Future Improvements

This prototype uses mock/test data in many places. For production:

- Add persistent database (currently in-memory)
- Implement user session tracking
- Add deployment version detection
- Enhance error categorization and pattern detection
- Add alerting for critical errors or performance issues
- Implement data retention and cleanup policies

## Development Notes

- This prototype prioritizes simplicity and speed over scalability
- All code is vanilla JavaScript with no external frameworks
- The backend is intentionally simple to demonstrate the concept
- See [docs/adr/](../../docs/adr/) for architectural decisions

## Contributing

Before making changes:

1. Review [workflow guidelines](../../docs/process/workflow.md)
2. Check the [git workflow](../../docs/process/git-workflow.md)
3. Follow the [documentation standards](../../docs/README.md)

## Related Documentation

- [Project Overview](../../README.md)
- [Architecture Decisions](../../docs/adr/)
- [Requirements](../../docs/product/requirements.md)
- [Design](../../docs/design/)