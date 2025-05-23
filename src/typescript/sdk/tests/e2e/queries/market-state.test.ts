import { SwapWithRewards } from "@/move-modules/emojicoin-dot-fun";

import type { SymbolEmoji } from "../../../src";
import { getEventsAsProcessorModelsFromResponse } from "../../../src/indexer-v2/mini-processor";
import { fetchMarketState } from "../../../src/indexer-v2/queries";
import { waitForEmojicoinIndexer } from "../../../src/indexer-v2/queries/utils";
import type { MarketStateModel } from "../../../src/indexer-v2/types";
import type { JsonValue } from "../../../src/types/json-types";
import { getAptosClient } from "../../utils";
import { registerMarketHelper } from "../../utils/helpers";
import { getFundedAccount } from "../../utils/test-accounts";

jest.setTimeout(20000);

describe("queries a market by market state", () => {
  const aptos = getAptosClient();
  const registrant = getFundedAccount("037");

  it("fetches the market state for a market based on an emoji symbols array", async () => {
    const emojis: SymbolEmoji[] = ["🧐", "🧐"];
    const { registerResponse, marketAddress, emojicoin, emojicoinLP } = await registerMarketHelper({
      registrant,
      emojis,
    });
    const { version } = registerResponse;
    await waitForEmojicoinIndexer(version);
    const res = (await fetchMarketState({
      searchEmojis: emojis,
    }))!;
    expect(res).not.toBeNull();
    expect(res).toBeDefined();
    expect(res.dailyVolume).toEqual(0n);

    const inputAmount = 1234n;
    const swapResponse = await SwapWithRewards.submit({
      aptosConfig: aptos.config,
      swapper: registrant,
      inputAmount,
      marketAddress,
      isSell: false,
      minOutputAmount: 1n,
      typeTags: [emojicoin, emojicoinLP],
    });
    const miniProcessorResult = getEventsAsProcessorModelsFromResponse(swapResponse);
    const stateFromMiniProcessor = miniProcessorResult.marketLatestStateEvents.at(0)!;
    expect(stateFromMiniProcessor).toBeDefined();
    await waitForEmojicoinIndexer(swapResponse.version);
    const stateFromIndexerProcessor = (await fetchMarketState({ searchEmojis: emojis }))!;

    // Copy over the daily volume because we can't get that field from the mini processor.
    (stateFromMiniProcessor as MarketStateModel).dailyVolume =
      stateFromIndexerProcessor.dailyVolume;
    // Copy over the daily base volume because we can't get that field from the mini processor.
    (stateFromMiniProcessor as MarketStateModel).dailyBaseVolume =
      stateFromIndexerProcessor!.dailyBaseVolume;
    // Copy over the `insertedAt` field because it's inserted at insertion time in postgres.
    (stateFromMiniProcessor as MarketStateModel).transaction.insertedAt =
      stateFromIndexerProcessor.transaction.insertedAt;

    const replacer = (_: string, v: JsonValue) => (typeof v === "bigint" ? v.toString() : v);
    const res1 = JSON.stringify(stateFromMiniProcessor, replacer);
    const res2 = JSON.stringify(stateFromIndexerProcessor, replacer);
    expect(res1).toEqual(res2);
  });
});
