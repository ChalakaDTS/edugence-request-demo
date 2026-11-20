import { useState } from "react";
import "./RequestDemoForm.css";

/**
 * Where submissions are sent.
 * Set REACT_APP_FORM_ENDPOINT in a .env file (see .env.example).
 * If it's not set, the form simulates a successful submit and logs the data
 * to the browser console — handy while you're building the page.
 */
const ENDPOINT = process.env.REACT_APP_FORM_ENDPOINT;

const INPUT_FIELDS = [
  { name: "name", type: "text", placeholder: "Enter your name", autoComplete: "name" },
  { name: "email", type: "email", placeholder: "Enter your email", autoComplete: "email" },
  { name: "phone", type: "tel", placeholder: "Enter your phone", autoComplete: "tel" },
];

const INITIAL_VALUES = {
  name: "",
  email: "",
  phone: "",
  message: "",
  _gotcha: "", // hidden honeypot field to catch spam bots
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

export default function RequestDemoForm() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
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

    setStatus("submitting");

    const { _gotcha, ...payload } = values;
    const data = {
      ...payload,
      submittedAt: new Date().toISOString(),
      page: window.location.href,
    };

    try {
      if (ENDPOINT) {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      } else {
        console.info("[RequestDemoForm] No REACT_APP_FORM_ENDPOINT set. Data:", data);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      setStatus("success");
      setValues(INITIAL_VALUES);
    } catch (error) {
      console.error("[RequestDemoForm]", error);
      setStatus("error");
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
            className="rdf-input rdf-textarea"
            value={values.message}
            onChange={handleChange}
            disabled={isSubmitting}
          />
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
            Something went wrong sending your request. Please try again in a
            moment.
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