import { PostgrestClient } from "@supabase/postgrest-js";
import {
  INBOX_URL,
  ONE_APT,
  ONE_APTN,
  deriveEmojicoinPublisherAddress,
  getRegistryAddress,
  sleep,
} from "../../src";
import { getTestHelpers } from "../utils";
import { MOCK_DATA_MARKETS_EMOJIS, generateMockData } from "../utils/generate-mock-data";
import { getMarketResource } from "../../src/types/contract";

jest.setTimeout(10000000);

describe("tests a simple faucet fund account request", () => {
  const { aptos, publisher } = getTestHelpers();

  beforeAll(async () => {
    await aptos.fundAccount({
      accountAddress: publisher.accountAddress,
      amount: 1000000 * ONE_APT,
    });
  });

  it("should have things", async () => {
    await generateMockData(aptos, publisher);

    const registryAddress = await getRegistryAddress({
      aptos,
      moduleAddress: publisher.accountAddress,
    });
    const derivedNamedObjectAddress = deriveEmojicoinPublisherAddress({
      registryAddress,
      emojis: MOCK_DATA_MARKETS_EMOJIS[0],
    });

    const marketObjectMarketResource = await getMarketResource({
      aptos,
      moduleAddress: publisher.accountAddress,
      objectAddress: derivedNamedObjectAddress,
    });

    const postgrest = new PostgrestClient(INBOX_URL);

    // Wait to make sure events were processed and saved by Inbox.
    await sleep(1000);

    // Get swaps on one market.
    const swaps = await postgrest
      .from("inbox_events")
      .select("*")
      .like("indexed_type", "%::emojicoin_dot_fun::Swap")
      .eq("data->>is_sell", false)
      .eq("data->>market_id", `${marketObjectMarketResource.metadata.marketID}`);

    expect(swaps.data).toBeDefined();

    const data = swaps.data!;

    expect(data.length).toBe(104);

    let expectedSum = 0n;
    for (let i = 1n; i <= 100n; i += 1n) {
      expectedSum += i;
    }
    expectedSum *= ONE_APTN * 100n;
    expectedSum += ONE_APTN;
    expectedSum += ONE_APTN * 50000n;
    expectedSum += ONE_APTN * 200000n;
    expectedSum += ONE_APTN * 100n;
    const sum = data.reduce((prev, curr) => prev + BigInt(curr.data.quote_volume), 0n);
    expect(sum).toBe(expectedSum);
  });
});
