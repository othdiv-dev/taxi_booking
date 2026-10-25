"use client";

import Script from "next/script";

export function GoogleMapsScript({ apiKey, locale }: { apiKey: string; locale: string }) {
  return (
    <>
      {/* Fix z-index du dropdown Places Autocomplete */}
      <style>{`
        .pac-container {
          z-index: 9999 !important;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          margin-top: 4px;
          font-family: inherit;
        }
        .pac-item {
          padding: 8px 14px;
          font-size: 13px;
          cursor: pointer;
        }
        .pac-item:hover {
          background-color: #f1f5f9;
        }
        .pac-item-query {
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>

      <Script
        id="google-maps-js"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${locale}&loading=async`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event("google-maps-ready"));
        }}
      />
    </>
  );
}
