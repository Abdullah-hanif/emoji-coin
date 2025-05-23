import "server-only";

import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

import { RegistryView } from "../../../emojicoin_dot_fun/move-modules/emojicoin-dot-fun";
import { toRegistryView } from "../../../types";
import { getAptosClient } from "../../../utils/aptos-client";
import { LIMIT, ORDER_BY, toOrderBy } from "../../const";
import { DatabaseTypeConverter } from "../../types";
import { DEFAULT_SORT_BY, type MarketStateQueryArgs } from "../../types/common";
import { type DatabaseJsonType, TableName } from "../../types/json-types";
import { postgrest, toQueryArray } from "../client";
import { sortByWithFallback } from "../query-params";
import { getLatestProcessedEmojicoinVersion, queryHelper, queryHelperWithCount } from "../utils";

// A helper function to abstract the logic for fetching rows that contain market state.
const selectMarketHelper = <T extends TableName.MarketState | TableName.PriceFeed>({
  tableName,
  page = 1,
  pageSize = LIMIT,
  orderBy = ORDER_BY.DESC,
  searchEmojis,
  sortBy = DEFAULT_SORT_BY,
  inBondingCurve,
  count,
  /* eslint-disable @typescript-eslint/no-explicit-any */
}: MarketStateQueryArgs & { tableName: T }): PostgrestFilterBuilder<
  any,
  any,
  any[],
  TableName,
  T
> => {
  let query: any = postgrest.from(tableName);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (count === true) {
    query = query.select("*", { count: "exact" });
  } else {
    query = query.select("*");
  }

  query = query
    .order(sortByWithFallback(sortBy), orderBy)
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (searchEmojis && searchEmojis.length) {
    query = query.contains("symbol_emojis", toQueryArray(searchEmojis));
  }

  if (typeof inBondingCurve === "boolean") {
    query = query.eq("in_bonding_curve", inBondingCurve);
  }

  return query;
};

const selectMarketStates = (args: MarketStateQueryArgs) =>
  selectMarketHelper({ ...args, tableName: TableName.MarketState });

const selectMarketsFromPriceFeed = ({ ...args }: MarketStateQueryArgs) =>
  selectMarketHelper({
    ...args,
    tableName: TableName.PriceFeed,
  });

export const fetchMarkets = queryHelper(
  selectMarketStates,
  DatabaseTypeConverter[TableName.MarketState]
);

export const fetchMarketsWithCount = queryHelperWithCount(
  selectMarketStates,
  DatabaseTypeConverter[TableName.MarketState]
);

/**
 * A manual query to get the largest market ID and thus the total number of markets registered
 * on-chain, according to the indexer thus far.
 *
 * This is necessary to use because for some reason, { count: "exact", head: "true" } in the
 * postgrest-js API doesn't work when there are no rows returned and it's only counting the total
 * number of rows.
 *
 * This is used instead of the market registration events table because `market_latest_state_event`
 * has an index on `market_id`.
 *
 * @returns the largest market ID, aka the total number of markets registered
 */
export const fetchLargestMarketID = async () => {
  return await postgrest
    .from(TableName.MarketLatestStateEvent)
    .select("market_id")
    .order("market_id", toOrderBy("desc"))
    .limit(1)
    .single()
    .then((r) => Number(r.data?.market_id) ?? 0);
};

/**
 * Retrieves the number of markets by querying the view function in the registry module on-chain.
 * The ledger (transaction) version is specified in order to reflect the exact total number of
 * unique markets the `emojicoin-dot-fun` processor will have processed up to that version.
 *
 * @returns The number of registered markets at the latest processed transaction version
 */
export const fetchNumRegisteredMarkets = async () => {
  const aptos = getAptosClient();
  let latestVersion: bigint;
  try {
    latestVersion = await getLatestProcessedEmojicoinVersion();
  } catch (e) {
    console.error("Couldn't get the latest processed version.", e);
    throw e;
  }
  try {
    const numRegisteredMarkets = await RegistryView.view({
      aptos,
      options: {
        ledgerVersion: latestVersion,
      },
    }).then((r) => toRegistryView(r).numMarkets);
    return Number(numRegisteredMarkets);
  } catch (e: unknown) {
    // If the view function fails for some reason, find the largest market id in the database for a
    // cheap fetch of the number of registered markets. Also because `count: exact` does not work.
    return await fetchLargestMarketID();
  }
};

// Note the no-op conversion function- this is simply to satisfy the `queryHelper` params and
// indicate with generics that we don't convert the type here.
// We don't do it because of the issues with serialization/deserialization in `unstable_cache`.
// It's easier to use the conversion function later (after the response is returned from
// `unstable_cache`) rather than deal with the headache of doing it before.
// Otherwise things like `Date` objects aren't properly created upon retrieval from the
// `unstable_cache` query.
export const fetchPriceFeedWithMarketState = queryHelper(
  selectMarketsFromPriceFeed,
  (v): DatabaseJsonType["price_feed"] => v
);
