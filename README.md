# Portfolio scaffold

This is a minimal static portfolio site scaffold inspired by the referenced design.

Files added:
- `index.html`
- `styles.css`
- `script.js`
- `data/projects.json` (project data)
- `project.html` (single project template)
- `project1.html`, `project2.html`, `project3.html` (old static case studies — removed)
- `assets/*` (placeholder images)
- `admin.html`, `admin.js` (in-browser editor/export)
- `serve.ps1` (PowerShell static server for Windows)

To run locally (Windows PowerShell):

```powershell
# Start the built-in PowerShell static server (already included):
powershell -NoExit -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8000
# then open http://localhost:8000 in your browser
```

Or run with Python if available:

```powershell
python -m http.server 8000
# open http://localhost:8000
```

Admin editor:
- Open `admin.html` to edit project entries in the browser. The editor can't write files on disk from a static site, so use the **Export JSON** button to download an updated `projects.json` then replace `data/projects.json` in the repo.

Deployment suggestions:
- GitHub Pages: push to a repository and enable Pages for the `main` branch (or serve from `docs/`).
- Netlify / Vercel: drag-and-drop the folder or connect the repo; both support continuous deploys from Git.
- For serverless forms: use Formspree, Netlify Forms, or a small serverless function to accept contact form submissions.

Next steps:
- Replace placeholder images in `assets/` with real screenshots (keep paths in `data/projects.json`).
- (Optional) I can add an image upload flow that stores images in `assets/` and rewrites `projects.json` for you to download.
