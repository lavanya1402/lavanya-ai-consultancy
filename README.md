# Lavanya AI Consultancy website

Static website (16 pages) for Lavanya AI Consultancy: practical AI learning and solutions for schools, colleges, universities and educators.

## Structure
- `pages/` – the content of each page (edit these)
- `build.py` – adds the shared header, menu and footer and writes `site/`
- `site/` – the finished website that Vercel serves (`site/vercel.json` turns on clean URLs)
- `automation/` – Google Apps Script (`Code.gs`) that stores enquiries in a Google Sheet and sends emails

## Change a page
1. Edit the file in `pages/`.
2. Run `python3 build.py`.
3. Commit and push. Vercel redeploys automatically.

## Turn on the enquiry form
1. Deploy `automation/Code.gs` as a Google Apps Script web app (Execute as: me, Access: anyone).
2. Paste the web app URL into `ENDPOINT` in `site/js/enquiry-form.js`.
3. Until then, the form tells visitors to email lavanya.sriva@gmail.com instead.

## Vercel settings
Root directory: `site` · Framework preset: Other · No build command.
