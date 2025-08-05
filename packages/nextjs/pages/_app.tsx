import type { AppProps } from "next/app";
import { StarknetConfig, starkscan } from "@starknet-react/core";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { appChains, connectors } from "~~/services/web3/connectors";
import provider from "~~/services/web3/provider";
import { ProgressBar } from "~~/components/scaffold-stark/ProgressBar";
import "~~/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider enableSystem>
      <StarknetConfig
        chains={appChains}
        provider={provider}
        connectors={connectors}
        explorer={starkscan}
      >
        <ProgressBar />
        <Component {...pageProps} />
      </StarknetConfig>
    </ThemeProvider>
  );
}
