# Verstka SDK Demo

Simple Express application demonstrating how to work with Verstka Node.js SDK.

## Running

1. Install dependencies:
```bash
cd example
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit the .env file with your Verstka API keys
```

3. Start the server:

```bash
# Run with verstka-demo.loca.lt tunnel
npm start

# Development with auto-reload and tunnel
npm run dev
```

4. Open in browser:
```
http://localhost:3000
```

## 🌐 Working with tunnel

**By default** all commands use tunnel with subdomain `verstka-demo.loca.lt`:

- **`npm run dev`** - automatically creates tunnel `https://verstka-demo.loca.lt`
- **Custom subdomain**: can be changed in `.env` file via `TUNNEL_SUBDOMAIN`
- **Disable tunnel**: comment out the `import localtunnel` line in `server.js`

## 🔍 Debug logging

To enable detailed logs set in `.env`:
```
VERSTKA_DEBUG=true
```

### With debug=true:
```
[Verstka] 📝 Processing callback for material: demo-article
[Verstka] 🔍 Download URL: https://verstka.org/download/...
[Verstka] 🔍 Using temporary directory: /tmp/verstka-demo-article-...
[Verstka] 🔍 Found 15 files: ['index.html', 'style.css', ...]
[Verstka] 🔍 Starting parallel download with 10 concurrent streams...
[Verstka] 🔍 [index.html] Starting download...
[Verstka] 🔍 [style.css] Starting download...
[Verstka] 🔍 [index.html] Saved: 45KB in 234ms
[Verstka] 📝 Download completed: 15/15 files successful
[Verstka] 📝 SaveHandler completed for material: demo-article
```

### With debug=false (default):
```
[Verstka] 📝 Processing callback for material: demo-article
[Verstka] 📝 Download completed: 15/15 files successful
[Verstka] 📝 SaveHandler completed for material: demo-article
```

## What it demonstrates

- ✅ Verstka SDK integration in Express application
- ✅ Opening editor for Desktop and Mobile versions
- ✅ Automatic editor opening in new tab
- ✅ Handling callbacks from Verstka on save
- ✅ Signature verification for security
- ✅ **Automatic downloading and saving of images**
- ✅ **Public access via tunnel for callbacks**
- ✅ **Debug logging for troubleshooting**
- ✅ Showing results on page

## Structure

```
example/
├── server.js             # 🚀 Express server with automatic tunnel
├── public/
│   ├── index.html        # Main page
│   └── script.js         # Button logic
├── uploads/              # 📁 Saved files from Verstka
│   ├── demo-article-desktop/  # Desktop version files
│   └── demo-article-mobile/   # Mobile version files
└── package.json          # Dependencies
```

## 🚀 Quick start

```bash
cd example
npm install
cp .env.example .env
# Fill in API keys in .env
npm run dev
```

Done! Now your local server is available at `https://verstka-demo.loca.lt`. 