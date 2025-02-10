import ClientEmojicoinPage from "components/pages/emojicoin/ClientEmojicoinPage";
import EmojiNotFoundPage from "./not-found";
import { wrappedCachedContractMarketView } from "lib/queries/aptos-client/market-view";
import { SYMBOL_EMOJI_DATA } from "@sdk/emoji_data";
import { pathToEmojiNames } from "utils/pathname-helpers";
import { fetchChatEvents, fetchMarketState, fetchSwapEvents } from "@/queries/market";
import { type Metadata } from "next";
import { getAptPrice } from "lib/queries/get-apt-price";
import { AptPriceContextProvider } from "context/AptPrice";
import { fetchCachedTopHolders } from "lib/queries/aptos-indexer/fetch-top-holders";
import { getMarketAddress } from "@sdk/emojicoin_dot_fun";
import { fetchMelee } from "@/queries/arena";

export const revalidate = 2;

/**
 * Our queries work with the marketID, but the URL uses the emoji bytes with a URL encoding.
 * That is, if you paste the emoji 💅🏾 into the URL, it becomes %F0%9F%92%85%F0%9F%8F%BE.
 * Whereas the actual emoji bytes are: 0xf09f9285f09f8fbe.
 */
type StaticParams = {
  market: string;
};

interface EmojicoinPageProps {
  params: StaticParams;
  searchParams: {};
}

const EVENTS_ON_PAGE_LOAD = 25;

export async function generateMetadata({ params }: EmojicoinPageProps): Promise<Metadata> {
  const { market: marketSlug } = params;
  const names = pathToEmojiNames(marketSlug);
  const emojis = names.map((n) => {
    const res = SYMBOL_EMOJI_DATA.byName(n)?.emoji;
    if (!res) {
      throw new Error(`Cannot parse invalid emoji input: ${marketSlug}, names: ${names}`);
    }
    return res;
  });

  const title = `${emojis.join("")}`;
  const description = `Trade ${emojis.join("")} on emojicoin.fun !`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

/**
 * Note that our queries work with the marketID, but the URL uses the emoji bytes with a URL encoding.
 * That is, if you paste the emoji 💅🏾 into the URL, it becomes %F0%9F%92%85%F0%9F%8F%BE.
 * Whereas the actual emoji bytes are: 0xf09f9285f09f8fbe.
 */
const EmojicoinPage = async (params: EmojicoinPageProps) => {
  const { market: marketSlug } = params.params;
  const names = pathToEmojiNames(marketSlug);
  const emojis = names.map((n) => {
    const res = SYMBOL_EMOJI_DATA.byName(n)?.emoji;
    if (!res) {
      throw new Error(`Cannot parse invalid emoji input: ${marketSlug}, names: ${names}`);
    }
    return res;
  });

  const state = await fetchMarketState({ searchEmojis: emojis });

  if (state) {
    const { marketID } = state.market;
    const marketAddress = getMarketAddress(emojis).toString();

    const [chats, swaps, marketView, aptPrice, holders, melee] = await Promise.all([
      fetchChatEvents({ marketID, pageSize: EVENTS_ON_PAGE_LOAD }),
      fetchSwapEvents({ marketID, pageSize: EVENTS_ON_PAGE_LOAD }),
      wrappedCachedContractMarketView(marketAddress),
      getAptPrice(),
      fetchCachedTopHolders(marketAddress),
      fetchMelee({}).then((res) => (res ? res.melee : null)),
    ]);

    const isInMelee =
      !!melee &&
      (melee.emojicoin0MarketAddress === state.market.marketAddress ||
        melee.emojicoin1MarketAddress === state.market.marketAddress);

    return (
      <AptPriceContextProvider aptPrice={aptPrice}>
        <ClientEmojicoinPage
          data={{
            symbol: state.market.symbolData.symbol,
            swaps,
            chats,
            state,
            marketView,
            holders,
            ...state.market,
          }}
          isInMelee={isInMelee}
        />
      </AptPriceContextProvider>
    );
  }

  return <EmojiNotFoundPage />;
};

export default EmojicoinPage;
