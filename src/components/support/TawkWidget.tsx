'use client'
import Script from 'next/script'

export default function TawkWidget({ propertyId, widgetId }: { propertyId?: string | null; widgetId?: string | null }) {
  const p = propertyId ?? process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
  const w = widgetId ?? process.env.NEXT_PUBLIC_TAWK_WIDGET_ID
  if (!p || !w || !/^[A-Za-z0-9]+$/.test(p) || !/^[A-Za-z0-9]+$/.test(w)) return null
  return (
    <Script id="tawk-to-widget" strategy="afterInteractive">
      {`
        var Tawk_API = Tawk_API || {};
        var Tawk_LoadStart = new Date();
        (function() {
          var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
          s1.async = true;
          s1.src = 'https://embed.tawk.to/${p}/${w}';
          s1.charset = 'UTF-8';
          s1.setAttribute('crossorigin', '*');
          s0.parentNode.insertBefore(s1, s0);
        })();
      `}
    </Script>
  )
}