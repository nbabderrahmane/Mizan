import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
    /* config options here */
};

const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: false, // Enable PWA even in dev to test installation
});

export default withNextIntl(withPWA(nextConfig));
