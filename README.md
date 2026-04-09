# Co-op Arcade Date Night

A lightweight browser game made for mobile Chrome with four touch-friendly mini-games:

- Bakery Co-op
- Pizza Co-op
- Puzzle Co-op
- Racing Co-op

This build is offline-first and designed for shared-screen or pass-and-play co-op. Each phone can also open the same link and play its own local copy.

## Features

- Works as a simple static site
- Mobile-first layout for phones
- Offline support after the first load with a service worker
- Installable as a PWA on supported phones
- Saves best scores locally on each device

## Run locally

Because this uses a service worker, test it through a local web server instead of opening `index.html` directly.

### Python

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Share it as a direct link

Any static hosting service will work:

- GitHub Pages
- Netlify Drop
- Cloudflare Pages
- Vercel static hosting

Upload the contents of this folder and share the generated HTTPS link. After the first visit, the game can keep running offline on mobile Chrome.

### Fastest: Netlify Drop

1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag this whole project folder into the page
3. Netlify will give you a public link right away
4. Open that link once on each phone while online so the offline files can cache

### GitHub Pages

This project already includes a GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.

1. Create a GitHub repo
2. Upload these files to the repo root
3. Push to the `main` branch
4. In GitHub, open `Settings > Pages` and set `Source` to `GitHub Actions`
5. Wait for the deployment to finish, then share the Pages URL
