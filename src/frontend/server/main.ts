import { PumpFunClient } from "./pumpfun-client";
import { JitoBundleClient } from "./jito-bundle";
import { ApiServer } from "./api-server";

export async function startApiServer(): Promise<void> {
  const pumpFunClient = new PumpFunClient(
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // Pump.Fun program ID
    "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM" // Fee address
  );

  // Initialize Jito bundle client
  const jitoClient = new JitoBundleClient(
    "https://mainnet.block-engine.jito.wtf/api/v1/bundles"
  );

  // Create and start API server
  const apiServer = new ApiServer(pumpFunClient, jitoClient);
  apiServer.start(parseInt(process.env.PORT || "8080", 10));
}

if (require.main === module) {
  startApiServer().catch(console.error);
}
