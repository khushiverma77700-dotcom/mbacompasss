// Shared JSON-LD helpers to satisfy Google Merchant Listings enhancement:
// every Offer with a price should carry shippingDetails + hasMerchantReturnPolicy.
// MBA Compass sells digital products/services — instant delivery, no returns.

export const DIGITAL_SHIPPING_DETAILS = {
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
  },
} as const;

export const DIGITAL_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IN",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
} as const;

/** Wrap an Offer object with the two Merchant-Listings-required fields. */
export function withMerchantOfferFields<T extends Record<string, unknown>>(offer: T): T & {
  shippingDetails: typeof DIGITAL_SHIPPING_DETAILS;
  hasMerchantReturnPolicy: typeof DIGITAL_RETURN_POLICY;
  itemCondition: string;
} {
  return {
    ...offer,
    itemCondition: "https://schema.org/NewCondition",
    shippingDetails: DIGITAL_SHIPPING_DETAILS,
    hasMerchantReturnPolicy: DIGITAL_RETURN_POLICY,
  };
}
