# Edugence – Request a Demo form

A small React project (Create React App, same setup as the Edugence website) with a single, self-contained **Request a Demo** form.

- Fields: full name, work email, school/organization, role, phone (optional), message (optional)
- Client-side validation with inline error messages
- Loading, success and error states
- Hidden honeypot field to block simple spam bots
- Responsive (two columns on desktop, one on mobile) and accessible (labels, `aria-invalid`, focus on first error)

## 1. Run it locally (VS Code)

Open this folder (the one with `package.json`) in VS Code, then in **Terminal → New Terminal**:

```bash
npm install
npm start
```

Your browser opens http://localhost:3000. Press Ctrl+C in the terminal to stop it.

> During `npm install` you'll see "deprecated" warnings. They're normal for Create React App and harmless.
> **Don't run `npm audit fix --force`**: it breaks react-scripts.

## 2. Choose where submissions go

Copy `.env.example` to `.env` and set `REACT_APP_FORM_ENDPOINT`:

```
REACT_APP_FORM_ENDPOINT=https://formspree.io/f/your-form-id
```

The form sends a JSON `POST` with these fields:

```json
{
  "name": "...",
  "email": "...",
  "organization": "...",
  "role": "...",
  "phone": "...",
  "message": "...",
  "submittedAt": "2026-11-20T08:30:00.000Z",
  "page": "https://your-site/..."
}
```

**Easiest option, no backend:** create a free form at [formspree.io](https://formspree.io), copy its endpoint URL into `.env`, and submissions arrive in your email.
You can also point it at your own API, a Google Apps Script web app, etc.

If `REACT_APP_FORM_ENDPOINT` is empty, the form simulates a successful submit and logs the data to the browser console, so you can build the page without a backend.

> Stop and re-run `npm start` after editing `.env`.

## 3. Deploy

```bash
npm run build       # outputs static files to build/
npx serve -s build  # optional: preview the production build locally
```

**Vercel:** import the repo → framework preset *Create React App* → add `REACT_APP_FORM_ENDPOINT` under *Environment Variables* → Deploy.

**Netlify:** build command `npm run build`, publish directory `build` → add `REACT_APP_FORM_ENDPOINT` under *Site configuration → Environment variables* → Deploy.

Any static host works (GitHub Pages, Cloudflare Pages, Firebase Hosting, cPanel). Just upload the contents of `build/`.

## Using the form in the Edugence website

Copy these two files into `edugweb/src/components/`:

```
src/components/RequestDemoForm.js
src/components/RequestDemoForm.css
```

Then use it in any page:

```jsx
import RequestDemoForm from "./RequestDemoForm";        // from another component
// or
import RequestDemoForm from "./components/RequestDemoForm"; // from App.js

<RequestDemoForm />
```

Add `REACT_APP_FORM_ENDPOINT` to that project's `.env` too. All CSS classes are prefixed with `rdf-`, so they won't clash with your existing styles.

## Customising

- **Brand colours:** edit the CSS variables at the top of `RequestDemoForm.css` (`--rdf-primary`, etc.).
- **Role options:** edit the `ROLES` array in `RequestDemoForm.js`.
- **Text:** heading, subtitle, success message and button label are plain JSX in `RequestDemoForm.js`.
- **Add a field:** add it to `INITIAL_VALUES`, add a `<Field>` block in the JSX, and (if required) a rule in `validate()`.

## Project structure

```
edugence-request-demo/
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── public/
│   └── index.html
└── src/
    ├── index.js
    ├── index.css
    ├── App.js
    ├── App.css
    └── components/
        ├── RequestDemoForm.js
        └── RequestDemoForm.css
```
