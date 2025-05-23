import { ExplorerLink } from "components/explorer-link/ExplorerLink";
import { EXTERNAL_LINK_PROPS } from "components/link/const";
import { ColoredPriceDisplay } from "components/misc/ColoredPriceDisplay";
import { PriceDelta } from "components/price-feed/inner";
import { useCallback, useMemo } from "react";
import { ROUTES } from "router/routes";

import type { DatabaseModels } from "@/sdk/indexer-v2/types";
import { calculateCirculatingSupply, calculateCurvePrice } from "@/sdk/markets";
import { toNominal, toNominalPrice } from "@/sdk/utils";

import { MiniBondingCurveProgress } from "./MiniBondingCurveProgress";

export enum Column {
  Price,
  AllTimeVolume,
  PriceDelta,
  DailyVolume,
  LastAvgExecutionPrice,
  Tvl,
  MarketCap,
}

export const TableData = <T extends DatabaseModels["price_feed"] | DatabaseModels["market_state"]>({
  data = [] as T[],
  k,
  reversed,
  priceDeltas,
}: {
  data?: T[];
  k: Column;
  reversed: boolean;
  priceDeltas: DatabaseModels["price_feed"][];
}) => {
  const getCN = useCallback(
    (col: Column) => (col === k ? " bg-opacity-[0.04] bg-ec-blue" : ""),
    [k]
  );
  const { cells, tableData } = useMemo(() => {
    const deltaByMarket = new Map(
      priceDeltas.map(({ deltaPercentage, market }) => [market.symbolData.symbol, deltaPercentage])
    );
    const bigNumberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
    const fmt = (n: number) => bigNumberFormatter.format(n);
    return {
      cells: {
        delta: (v: T) => deltaByMarket.get(v.market.symbolData.symbol),
        price: (v: T) => calculateCurvePrice(v.state).toNumber(),
        allTimeVolume: (v: T) => fmt(toNominal(v.state.cumulativeStats.quoteVolume)),
        dailyVolume: (v: T) => fmt(toNominal(v.dailyVolume)),
        tvl: (v: T) => fmt(toNominal(v.state.instantaneousStats.totalValueLocked)),
        lastAvgPrice: (v: T) => toNominalPrice(v.lastSwap.avgExecutionPriceQ64),
        marketCap: (v: T) => fmt(toNominal(v.state.instantaneousStats.marketCap)),
        getCirculatingSupply: (v: T) => fmt(toNominal(calculateCirculatingSupply(v.state))),
      },
      tableData: reversed ? data.toReversed() : data,
    };
  }, [reversed, priceDeltas, data]);

  return tableData.map((row, i) => (
    <tr
      key={`${k}-${i}`}
      className="text-lighter-gray text-sm font-forma p-3 hover:bg-ec-blue hover:bg-opacity-5"
    >
      <td>
        <a
          className="hover:underline"
          href={`${ROUTES.market}/${row.market.symbolData.symbol}`}
          {...EXTERNAL_LINK_PROPS}
        >
          {row.market.symbolData.symbol}
        </a>
      </td>
      <td className={getCN(Column.PriceDelta)}>
        {cells.delta(row) ? <PriceDelta delta={Number(cells.delta(row))} /> : "-"}
      </td>
      <td>{row.market.marketID.toString()}</td>
      <td className={getCN(Column.Price)}>
        <ColoredPriceDisplay price={cells.price(row)} />
      </td>
      <td className={getCN(Column.AllTimeVolume)}>{cells.allTimeVolume(row)}</td>
      <td className={getCN(Column.DailyVolume)}>{cells.dailyVolume(row)}</td>
      <td className={getCN(Column.Tvl)}>{cells.tvl(row)}</td>
      <td className={getCN(Column.LastAvgExecutionPrice)}>
        <ExplorerLink className="hover:underline" value={row.transaction.version} type="txn">
          <ColoredPriceDisplay price={cells.lastAvgPrice(row)} />
        </ExplorerLink>
      </td>
      <td className={getCN(Column.MarketCap)}>{cells.marketCap(row)}</td>
      <td>{cells.getCirculatingSupply(row)}</td>
      <td>
        <MiniBondingCurveProgress state={row.state} />
      </td>
    </tr>
  ));
};
