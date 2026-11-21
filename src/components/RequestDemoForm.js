import { useEffect, useRef, useState } from "react";
import "./RequestDemoForm.css";

/**
 * Where submissions are sent: your Google Apps Script web app URL (ends with /exec).
 * Set REACT_APP_FORM_ENDPOINT in .env. If it's empty, the form only pretends to send
 * and logs the data to the browser console — handy while you're building the page.
 */
const ENDPOINT = process.env.REACT_APP_FORM_ENDPOINT;

/**
 * Optional bot check: set REACT_APP_TURNSTILE_SITE_KEY in .env to your Cloudflare
 * Turnstile site key. It stays invisible unless Cloudflare suspects a bot.
 */
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_ACTION = "request-demo"; // must match TURNSTILE_ACTION in Code.gs

const INPUT_FIELDS = [
  { name: "name", type: "text", placeholder: "Enter your name", autoComplete: "name", maxLength: 100 },
  { name: "email", type: "email", placeholder: "Enter your email", autoComplete: "email", maxLength: 254 },
  { name: "phone", type: "tel", placeholder: "Enter your phone", autoComplete: "tel", maxLength: 30 },
];
const MESSAGE_MAX_LENGTH = 2000;

const INITIAL_VALUES = {
  name: "",
  email: "",
  phone: "",
  message: "",
  _gotcha: "", // hidden honeypot field to catch spam bots
};

const ERROR_MESSAGES = {
  rate_limited: "We've already received several requests. Please try again later.",
  captcha: "We couldn't confirm you're not a bot. Please try again.",
  captcha_pending:
    "Just a moment, we're checking you're not a bot. Press Submit again in a few seconds. If this keeps happening, refresh the page.",
  invalid: "Please check your details and try again.",
  default: "Something went wrong sending your request. Please try again in a moment.",
};

function validate(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = "Please enter your name.";

  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (values.phone.trim() && !/^[+\d\s()-]{7,20}$/.test(values.phone.trim())) {
    errors.phone = "Please enter a valid phone number.";
  }

  return errors;
}

// Loads the Cloudflare Turnstile script once, the first time it's needed.
let turnstileLoader;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileLoader) {
    turnstileLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.onload = () =>
        window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable"));
      script.onerror = () => {
        turnstileLoader = undefined;
        script.remove();
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return turnstileLoader;
}

function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let widgetId;
    let active = true;
    onToken("");

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: TURNSTILE_ACTION,
          appearance: "interaction-only",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch((error) => console.error("[RequestDemoForm]", error));

    return () => {
      active = false;
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  return <div ref={containerRef} className="rdf-turnstile" />;
}

export default function RequestDemoForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorCode, setErrorCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function showError(code) {
    setErrorCode(code || "");
    setStatus("error");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move focus to the first field with a problem
      const firstInvalid = Object.keys(found)[0];
      document.getElementById(`rdf-${firstInvalid}`)?.focus();
      return;
    }

    // A bot filled the hidden field: pretend it worked, send nothing.
    if (values._gotcha) {
      setStatus("success");
      return;
    }

    if (TURNSTILE_SITE_KEY && ENDPOINT && !turnstileToken) {
      showError("captcha_pending");
      return;
    }

    setStatus("submitting");

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      message: values.message.trim(),
      _gotcha: values._gotcha,
      page: window.location.href,
      turnstileToken,
    };

    try {
      if (ENDPOINT) {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          // Sent as text/plain so the browser makes a "simple" request.
          // Google Apps Script can't answer the extra CORS check that application/json triggers.
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result || result.ok !== true) {
          const error = new Error("Request was not accepted");
          error.code = result && result.error;
          throw error;
        }
      } else {
        const { turnstileToken: _unused, ...preview } = payload;
        console.info("[RequestDemoForm] No REACT_APP_FORM_ENDPOINT set. Data:", preview);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setStatus("success");
      setValues(INITIAL_VALUES);
    } catch (error) {
      console.error("[RequestDemoForm]", error);
      showError(error.code);
      // Bot-check tokens can only be used once, so get a fresh one for the next try.
      if (TURNSTILE_SITE_KEY) setTurnstileKey((key) => key + 1);
    }
  }

  if (status === "success") {
    return (
      <section className="rdf-card rdf-success" aria-live="polite">
        <div className="rdf-success-icon" aria-hidden="true">✓</div>
        <h2 className="rdf-title">Thanks, we've got your request!</h2>
        <p className="rdf-subtitle">
          Someone from our team will contact you soon to schedule your demo.
        </p>
        <button
          type="button"
          className="rdf-button rdf-button--ghost"
          onClick={() => setStatus("idle")}
        >
          Submit another request
        </button>
      </section>
    );
  }

  const isSubmitting = status === "submitting";

  return (
    <section className="rdf-card" aria-labelledby="rdf-heading">
      <h2 id="rdf-heading" className="rdf-title">Request a demo</h2>

      <form className="rdf-form" onSubmit={handleSubmit} noValidate>
        {INPUT_FIELDS.map((field) => (
          <div
            key={field.name}
            className={`rdf-field${errors[field.name] ? " rdf-field--error" : ""}`}
          >
            <input
              id={`rdf-${field.name}`}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              aria-label={field.placeholder}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              className="rdf-input"
              value={values[field.name]}
              onChange={handleChange}
              aria-invalid={!!errors[field.name]}
              aria-describedby={errors[field.name] ? `rdf-${field.name}-error` : undefined}
              disabled={isSubmitting}
            />
            {errors[field.name] && (
              <p id={`rdf-${field.name}-error`} className="rdf-error" role="alert">
                {errors[field.name]}
              </p>
            )}
          </div>
        ))}

        <div className="rdf-field">
          <textarea
            id="rdf-message"
            name="message"
            rows={4}
            placeholder="Enter your message"
            aria-label="Enter your message"
            maxLength={MESSAGE_MAX_LENGTH}
            className="rdf-input rdf-textarea"
            value={values.message}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {/* Bot check: invisible unless Cloudflare needs the visitor to tick a box */}
          {TURNSTILE_SITE_KEY && ENDPOINT && (
            <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />
          )}
        </div>

        {/* Honeypot: hidden from people, bots tend to fill it in */}
        <input
          type="text"
          name="_gotcha"
          value={values._gotcha}
          onChange={handleChange}
          className="rdf-honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {status === "error" && (
          <p className="rdf-banner" role="alert">
            {ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default}
          </p>
        )}

        <button type="submit" className="rdf-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="rdf-spinner" aria-hidden="true" /> Sending…
            </>
          ) : (
            "Submit"
          )}
        </button>
      </form>
    </section>
  );
}