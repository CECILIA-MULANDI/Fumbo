"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

const rainbowTheme = {
  lightMode: lightTheme({
    accentColor: "oklch(0.42 0.055 195)",
    accentColorForeground: "oklch(0.975 0.003 90)",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  }),
  darkMode: darkTheme({
    accentColor: "oklch(0.67 0.055 195)",
    accentColorForeground: "oklch(0.18 0.014 190)",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  }),
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
