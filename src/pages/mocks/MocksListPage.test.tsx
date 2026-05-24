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

const paidTest = {
  id: "test-paid",
  slug: "paid-mock",
  name: "Distribution & Selection Puzzles 1",
  price_inr: 999,
  pricing_type: "paid",
};

const freeTest = {
  id: "test-free",
  slug: "free-mock",
  name: "Free Sample Mock",
  price_inr: 0,
  pricing_type: "free",
};

const baseSettings: any = {
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
  cta_target_test_id: paidTest.id,
  trust_students: "12,000+",
  trust_avg_improvement: "+18",
  trust_rating: "4.8",
  benefits: [], whats_included: [], comparison: [], testimonials: [], faqs: [],
  meta_pixel_id: null, meta_title: "", meta_description: "",
  why_us_title: "Why aspirants choose us", why_us_subtitle: "Everything you need",
  why_us_points: [], auto_testimonials: [], student_analyses: [],
  student_feedback_text: [], student_feedback_images: [], expert_feedback: [],
  platform_features: [], ai_report_title: "", ai_report_subtitle: "",
  day_planner_block: null, courses_cta_block: null,
};

// Mutable per-test fixtures
let currentTests = [paidTest];
let currentSettings: any = baseSettings;

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => Promise.resolve({
        data: table === "mock_tests" ? currentTests : [],
        error: null,
      }),
      maybeSingle: () => Promise.resolve({
        data: table === "mocks_landing_settings" ? currentSettings : null,
        error: null,
      }),
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
  Element.prototype.scrollIntoView = vi.fn();
  currentTests = [paidTest];
  currentSettings = { ...baseSettings, cta_target_test_id: paidTest.id };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MocksListPage />
    </MemoryRouter>
  );

const clickHeroBuyNow = async () => {
  const buttons = await screen.findAllByRole("button", { name: /Buy Now/i });
  const heroBuy = buttons.find((b) => /₹\s*999/.test(b.textContent || ""));
  expect(heroBuy).toBeTruthy();
  fireEvent.click(heroBuy!);
};

describe("MocksListPage — Buy Now behavior", () => {
  it("paid bundle: opens checkout dialog with bundle title, does not navigate to attempt", async () => {
    renderPage();
    await clickHeroBuyNow();

    await waitFor(() => {
      expect(screen.getByTestId("checkout-dialog")).toBeInTheDocument();
    });

    const lastOpen = [...dialogCalls].reverse().find((p) => p.open);
    expect(lastOpen.testName).toBe(baseSettings.bundle_title);
    expect(lastOpen.priceInr).toBe(baseSettings.price_current);
    expect(lastOpen.testId).toBe(paidTest.id);

    // Never auto-navigate to mock route
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("free underlying test: routes to mock intro page (no dialog, no auto-start)", async () => {
    currentTests = [freeTest];
    currentSettings = { ...baseSettings, cta_target_test_id: freeTest.id };

    renderPage();
    await clickHeroBuyNow();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(`/mocks/${freeTest.slug}`);
    });

    // No paid checkout dialog should appear
    expect(screen.queryByTestId("checkout-dialog")).toBeNull();
    expect(dialogCalls.every((p) => !p.open)).toBe(true);

    // Must NOT navigate to the runner/attempt path
    const startedAttempt = navigateMock.mock.calls.find(([arg]) =>
      typeof arg === "string" && /\/attempt\//.test(arg)
    );
    expect(startedAttempt).toBeUndefined();
  });

  it("zero bundle price: routes to mock intro (no charge attempted)", async () => {
    currentTests = [paidTest];
    currentSettings = { ...baseSettings, price_current: 0, cta_target_test_id: paidTest.id };

    renderPage();
    const buttons = await screen.findAllByRole("button", { name: /Buy Now/i });
    // Price label uses ₹0 here
    const heroBuy = buttons.find((b) => /₹\s*0/.test(b.textContent || ""));
    expect(heroBuy).toBeTruthy();
    fireEvent.click(heroBuy!);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(`/mocks/${paidTest.slug}`);
    });
    expect(screen.queryByTestId("checkout-dialog")).toBeNull();
  });
});
