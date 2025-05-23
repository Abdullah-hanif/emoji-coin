import type { AssetBalance } from "lib/queries/aptos-indexer/fetch-emojicoin-balances";

import type { SymbolEmoji } from "@/sdk/emoji_data/types";
import type { AccountAddressString } from "@/sdk/emojicoin_dot_fun";
import type { DatabaseModels, MarketMetadataModel } from "@/sdk/indexer-v2/types";
import type { Types } from "@/sdk/types";
import type { SymbolString } from "@/store/event/types";

type DataProps = MarketMetadataModel & {
  symbol: SymbolString;
  swaps: Array<DatabaseModels["swap_events"]>;
  state: DatabaseModels["market_state"];
  marketView: Types["MarketView"];
  holders: AssetBalance[];
};

export interface EmojicoinProps {
  data: DataProps;
  isInMelee: boolean;
}

export interface MainInfoProps {
  data: Omit<DataProps, "swaps">;
}

export interface GridProps {
  data: DataProps;
}

export interface ChatProps {
  data: Omit<DataProps, "swaps">;
}
export interface SwapComponentProps {
  emojicoin: string;
  marketAddress: AccountAddressString;
  marketEmojis: SymbolEmoji[];
  initNumSwaps: number;
}
export interface TradeHistoryProps {
  data: DataProps;
}
