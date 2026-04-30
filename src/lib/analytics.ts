// Analytics helper — drop-in Google Analytics 4 support
// To activate: add your GA4 Measurement ID below

const GA_MEASUREMENT_ID = ""; // e.g. "G-XXXXXXXXXX"

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA_MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (!window.gtag) return;
  window.gtag("event", eventName, params);
}

// Pre-built events
export const analytics = {
  conversionStarted: (url: string) => trackEvent("conversion_started", { source_url: url }),
  downloadCompleted: (jobId: string) => trackEvent("download_completed", { job_id: jobId }),
  signUp: () => trackEvent("sign_up"),
  login: () => trackEvent("login"),
  pageView: (path: string) => trackEvent("page_view", { page_path: path }),
  previewModalViewed: (slug: string, name: string) =>
    trackEvent("preview_modal_viewed", { preview_slug: slug, preview_name: name }),
  previewModalSectionViewed: (slug: string, name: string, section: "nome" | "simulacao" | "cta") =>
    trackEvent("preview_modal_section_viewed", { preview_slug: slug, preview_name: name, section }),
  previewCreateAppClicked: (slug: string, name: string, location: "modal" | "page") =>
    trackEvent("preview_create_app_clicked", { preview_slug: slug, preview_name: name, location }),
  previewCopyLinkClicked: (slug: string, name: string, status: "clicked" | "success" | "error") =>
    trackEvent("preview_copy_link_clicked", { preview_slug: slug, preview_name: name, status }),
  authNextStepConfirmed: (mode: "login" | "signup", source?: string | null, previewSlug?: string | null, previewOrigin?: string | null) =>
    trackEvent("auth_next_step_confirmed", { mode, source: source || "direct", preview_slug: previewSlug, preview_origin: previewOrigin }),
};
