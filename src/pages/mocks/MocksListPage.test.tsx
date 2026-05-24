import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Stub MockCheckoutDialog so we can detect when it's opened without
// loading Stripe.
const dialogCalls: any[] = [];
vi.mock("@/components/mock/MockCheckoutDialog", () => ({
  MockCheckoutDialog: (props: any) => {
    dialogCalls.push(props);
    return props.open ? (
      <div data-testid="checkout-dialog">
        Checkout open for {props.testId} @ ₹{props.priceInr}
      </div>
    ) : null;
  },
}));

vi.mock("@/lib/metaPixel", () => ({
  initMetaPixel: vi.fn(),
  pixelTrack: vi.fn(),
}));

vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/mock/SampleAIReport", () => ({ SampleAIReport: () => null }));
vi.mock("@/components/mock/AutoTestimonialMarquee", () => ({ AutoTestimonialMarquee: () => null }));
vi.mock("@/components/mock/DualFeedbackMarquees", () => ({ DualFeedbackMarquees: () => null }));
vi.mock("@/components/mock/DayPlannerShowcase", () => ({ default: () => null }));
vi.mock("@/components/mock/CoursesCTABand", () => ({ default: () => null }));

// A FREE test — this is the regression case. Before the fix, clicking Buy
// Now would navigate to /mocks/<slug> and start a mock attempt instead of
// opening the paid checkout dialog.
const freeTest = {
  id: "test-123",
  slug: "free-mock",
  name: "Distribution & Selection Puzzles 1",
  price_inr: 0,
  pricing_type: "free",
};

const settings = {
  hero_eyebrow: "Mock Test Series",
  hero_headline: "Crack CAT 2025",
  hero_subheadline: "Subtitle",
  hero_cta_label: "Get Instant Access",
  hero_image_url: null,
  price_current: 999,
  price_original: 1999,
  price_discount_label: "50% OFF",
  offer_urgency: "Ends soon",
  offer_ends_at: null,
  bundle_title: "Complete CAT Mock Bundle",
  bundle_subtitle: "10 full-length mocks",
  cta_target_test_id: freeTest.id,
  trust_students: "12,000+",
  trust_avg_improvement: "+18",
  trust_rating: "4.8",
  benefits: [],
  whats_included: [],
  comparison: [],
  testimonials: [],
  faqs: [],
  meta_pixel_id: null,
  meta_title: "",
  meta_description: "",
  why_us_title: "Why aspirants choose us",
  why_us_subtitle: "Everything you need",
  why_us_points: [],
  auto_testimonials: [],
  student_analyses: [],
  student_feedback_text: [],
  student_feedback_images: [],
  expert_feedback: [],
  platform_features: [],
  ai_report_title: "",
  ai_report_subtitle: "",
  day_planner_block: null,
  courses_cta_block: null,
};

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({ data: table === "mock_tests" ? [freeTest] : [], error: null }),
      maybeSingle: () => Promise.resolve({ data: table === "mocks_landing_settings" ? settings : null, error: null }),
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

// --- Tests ---------------------------------------------------------------

import MocksListPage from "./MocksListPage";

beforeEach(() => {
  navigateMock.mockReset();
  dialogCalls.length = 0;
  // Stub scrollIntoView (jsdom doesn't implement it)
  Element.prototype.scrollIntoView = vi.fn();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MocksListPage />
    </MemoryRouter>
  );

describe("MocksListPage — Buy Now regression", () => {
  it("opens the checkout dialog and does NOT start a mock attempt, even for a free underlying test", async () => {
    renderPage();

    // Wait for hero to render after settings load
    const buyNowButtons = await screen.findAllByRole("button", { name: /Buy Now/i });
    expect(buyNowButtons.length).toBeGreaterThan(0);

    // Click the hero "Buy Now ₹999" — wired to startCheckout
    const heroBuy = buyNowButtons.find((b) => /₹\s*999/.test(b.textContent || ""));
    expect(heroBuy).toBeTruthy();
    fireEvent.click(heroBuy!);

    await waitFor(() => {
      expect(screen.getByTestId("checkout-dialog")).toBeInTheDocument();
    });

    // Must never navigate to /mocks/<slug> (which would start an attempt)
    const badNav = navigateMock.mock.calls.find(([arg]) =>
      typeof arg === "string" && arg.startsWith(`/mocks/${freeTest.slug}`)
    );
    expect(badNav).toBeUndefined();
  });

  it("passes the bundle title (not the underlying mock name) to the checkout dialog", async () => {
    renderPage();
    const buyNowButtons = await screen.findAllByRole("button", { name: /Buy Now/i });
    const heroBuy = buyNowButtons.find((b) => /₹\s*999/.test(b.textContent || ""));
    fireEvent.click(heroBuy!);

    await waitFor(() => {
      expect(screen.getByTestId("checkout-dialog")).toBeInTheDocument();
    });

    const lastOpen = [...dialogCalls].reverse().find((p) => p.open);
    expect(lastOpen.testName).toBe(settings.bundle_title);
    expect(lastOpen.priceInr).toBe(settings.price_current);
    expect(lastOpen.testId).toBe(freeTest.id);
  });
});
