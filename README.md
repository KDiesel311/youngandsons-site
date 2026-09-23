# Young & Sons Hardwood Flooring

Source for https://youngandsonshardwood.com, hosted on Netlify.

## Editing content

Go to https://youngandsonshardwood.com/admin and sign in with GitHub. Your GitHub
account needs write access to this repo. Saving commits to `main`, and Netlify
rebuilds and publishes in about a minute.

## How it's put together

| Path | What it is |
|---|---|
| `content/site.json` | All editable text, contact info and photo lists. The editor writes here. |
| `src/template.html` | The page design, with `{{PLACEHOLDERS}}` for the content. |
| `build.mjs` | Fills the template from the content into `dist/`. No dependencies. |
| `static/` | Logo, fonts, and `uploads/` (photos added through the editor). Copied to the site root. |
| `admin/` | The Decap CMS editor and its field setup (`config.yml`). |

`build.mjs` checks the content first. A missing phone number, a phone number
that isn't 10 digits, a bad email or an empty service list fails the build, and
the live site stays on the last good version. On Netlify, images are served
through the Netlify Image CDN, so phone photos get resized automatically.

## Local build

```bash
node build.mjs
```

Then open `dist/index.html`. Local builds use the raw image files instead of the CDN.

The contact form posts to Formspree (`formspree.io/f/mdabbbop`).
