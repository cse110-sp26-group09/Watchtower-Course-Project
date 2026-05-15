# Hosted ShopDemo
This is the standalone, hostable variant of ShopDemo. It can be deployed as a static site for checking visits and traffic.

Link [here](https://courseproject-8qkfva2k4-akatsuki9.vercel.app/)

## Deploy

Deploy this folder (`src/prototype_1/hosted_demo/`) to any static host, such as GitHub Pages, Netlify, or Vercel. There is no build step.

All asset paths are relative, so the demo works from a domain root or from a subpath.

## Check Traffic

Use your hosting provider's traffic tools:

- GitHub Pages: repository traffic insights, if available for your repository
- Netlify: site analytics or function-free request logs, depending on your plan
- Vercel: deployment analytics and usage metrics

The demo does not need a backend for this first hosted preview.

## Local Preview

From `src/prototype_1/`:

```bash
npx serve hosted_demo
```

## Relationship to `demo/`

`demo/` is for local development against `server/server.js`. `hosted_demo/` is a separate public static demo with no SDK or backend connection. Treat them as siblings, not lockstep duplicates.
