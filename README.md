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
| `build.mjs` | Fills the template from the content into `dist/` and prepares photos. |
| `static/` | Logo, fonts, and `uploads/` (photos added through the editor). Copied to the site root. |
| `admin/` | The Decap CMS editor and its field setup (`config.yml`). |

`build.mjs` checks the content first. A missing phone number, a phone number
that isn't 10 digits, a bad email or an empty service list fails the build, and
the live site stays on the last good version.

Every uploaded photo is re-encoded with `sharp` before publishing: rotated
upright, capped at 2400px, and stripped of all metadata, including the GPS
location phones embed (for a flooring job, that's the customer's home). The
originals in `static/uploads/` still contain it, so turn off camera location
tagging on the phone before taking job photos. Only JPEG, PNG and WebP are
published; anything else is skipped with a warning. On Netlify, pages then
serve photos through the Netlify Image CDN at the right size for each screen.

## Local build

```bash
npm install
node build.mjs
```

Then open `dist/index.html`. Local builds use the raw image files instead of the CDN.

The contact form posts to Formspree (`formspree.io/f/mdabbbop`).
