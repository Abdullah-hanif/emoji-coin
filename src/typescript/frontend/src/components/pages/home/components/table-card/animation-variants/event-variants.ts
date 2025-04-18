import { ECONIA_BLUE, GREEN, PINK, WHITE } from "theme/colors";

import { Trigger } from "@/sdk/const";
import {
  type ChatEventModel,
  isChatEventModel,
  isLiquidityEventModel,
  isMarketLatestStateEventModel,
  isMarketRegistrationEventModel,
  isSwapEventModel,
  type LiquidityEventModel,
  type MarketLatestStateEventModel,
  type MarketRegistrationEventModel,
  type SwapEventModel,
} from "@/sdk/indexer-v2/types";

const transitionIn = {
  duration: 0,
};

const transitionOut = {
  duration: 1.5,
};

type AnyNonGridTableCardVariant =
  | TableCardGlowVariants
  | TableCardTextVariants
  | TableCardBorderVariants;
type TableCardGlowVariants = keyof typeof glowVariants;

export const glowVariants = {
  initial: {
    boxShadow: "0 0 0px 0px #00000000",
    filter: "drop-shadow(0 0 0 #00000000)",
    transition: transitionOut,
  },
  chats: {
    boxShadow: `0 0 14px 11px ${ECONIA_BLUE}AA`,
    filter: `drop-shadow(0 0 21px ${ECONIA_BLUE}AA)`,
    transition: transitionIn,
  },
  buy: {
    boxShadow: `0 0 14px 11px ${GREEN}AA`,
    filter: `drop-shadow(0 0 21px ${GREEN}AA)`,
    transition: transitionIn,
  },
  sell: {
    boxShadow: `0 0 14px 11px ${PINK}CC`,
    filter: `drop-shadow(0 0 21px ${PINK}CC)`,
    transition: transitionIn,
  },
  register: {
    boxShadow: `0 0 14px 11px ${WHITE}AA`,
    filter: `drop-shadow(0 0 21px ${WHITE}AA)`,
    transition: transitionIn,
  },
};

type TableCardTextVariants = keyof typeof textVariants;

export const textVariants = {
  initial: {
    color: "#FFFFFFFF",
    filter: "brightness(1) contrast(1)",
    transition: transitionOut,
  },
  buy: {
    color: `${GREEN}FF`,
    filter: "brightness(1.1) contrast(1.1)",
    transition: transitionIn,
  },
  sell: {
    color: `${PINK}FF`,
    filter: "brightness(1.1) contrast(1.1)",
    transition: transitionIn,
  },
};

type TableCardBorderVariants = keyof typeof borderVariants;

export const borderVariants = {
  initial: {
    borderColor: "#000000",
    transition: transitionOut,
  },
  buy: {
    borderColor: GREEN,
    transition: transitionIn,
  },
  sell: {
    borderColor: PINK,
    transition: transitionIn,
  },
  chats: {
    borderColor: ECONIA_BLUE,
    transition: transitionIn,
  },
  hover: {
    borderColor: ECONIA_BLUE,
    transition: transitionIn,
  },
  register: {
    borderColor: WHITE,
    transition: transitionIn,
  },
};

export const onlyHoverVariant = {
  initial: {
    borderColor: "#00000000",
    transition: transitionOut,
  },
  hover: {
    borderColor: ECONIA_BLUE,
    transition: transitionIn,
  },
};

export const eventToVariant = (
  event?:
    | ChatEventModel
    | MarketLatestStateEventModel
    | SwapEventModel
    | LiquidityEventModel
    | MarketRegistrationEventModel
): AnyNonGridTableCardVariant => {
  if (typeof event === "undefined") return "initial";
  if (isMarketLatestStateEventModel(event)) return stateEventToVariant(event);
  if (isChatEventModel(event)) return "chats";
  if (isSwapEventModel(event)) return event.swap.isSell ? "sell" : "buy";
  if (isLiquidityEventModel(event)) return event.liquidity.liquidityProvided ? "buy" : "sell";
  if (isMarketRegistrationEventModel(event)) return "register";
  throw new Error("Unknown event type");
};

function stateEventToVariant(event: MarketLatestStateEventModel): AnyNonGridTableCardVariant {
  if (event.market.trigger === Trigger.MarketRegistration) return "register";
  if (event.market.trigger === Trigger.RemoveLiquidity) return "sell";
  if (event.market.trigger === Trigger.ProvideLiquidity) return "buy";
  if (event.market.trigger === Trigger.SwapBuy) return "buy";
  if (event.market.trigger === Trigger.SwapSell) return "sell";
  if (event.market.trigger === Trigger.Chat) return "chats";
  throw new Error("Unknown state event type");
}
