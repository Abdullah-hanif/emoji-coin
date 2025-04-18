"use client";

import { EmojiPill } from "components/EmojiPill";
import { FormattedNumber } from "components/FormattedNumber";
import { InputNumeric } from "components/inputs";
import { Column, Row } from "components/layout/components/FlexContainers";
import type { SwapComponentProps } from "components/pages/emojicoin/types";
import { getTooltipStyles } from "components/selects/theme";
import { TradeOptions } from "components/selects/trade-options";
import { useEventStore } from "context/event-store-context";
import { translationFunction } from "context/language-context";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_SWAP_GAS_COST, useGetGasWithDefault } from "lib/hooks/queries/use-get-swap-gas";
import { useCalculateSwapPrice } from "lib/hooks/use-calculate-swap-price";
import { toActualCoinDecimals, toDisplayCoinDecimals } from "lib/utils/decimals";
import { useSearchParams } from "next/navigation";
import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import darkTheme from "theme/dark";
import { emoji } from "utils";
import { Emoji } from "utils/emoji";
import { getMaxSlippageSettings } from "utils/slippage";

import { Flex, FlexGap } from "@/containers";
import { useTooltip } from "@/hooks/index";
import { toEmojicoinTypes } from "@/sdk/markets/utils";

import FlipInputsArrow from "./FlipInputsArrow";
import { AptosInputLabel, EmojiInputLabel } from "./InputLabels";
import { SwapButton } from "./SwapButton";

const SimulateInputsWrapper = ({ children }: PropsWithChildren) => (
  <div className="flex flex-col relative gap-[19px]">{children}</div>
);

const InnerWrapper = ({ children }: PropsWithChildren) => (
  <div
    className={
      `flex justify-between border border-solid border-dark-gray ` +
      `radii-xs px-[18px] py-[7px] items-center h-[55px] md:items-stretch`
    }
  >
    {children}
  </div>
);

const grayLabel = `
  pixel-heading-4 mb-[-6px] text-light-gray !leading-5 uppercase
`;

const inputAndOutputStyles = `
  block text-[16px] font-normal h-[32px] outline-none w-full
  font-forma
  border-transparent !p-0 text-white
`;

const OUTPUT_DISPLAY_DECIMALS = 4;

export default function SwapComponent({
  emojicoin,
  marketAddress,
  marketEmojis,
  initNumSwaps,
}: SwapComponentProps) {
  const { t } = translationFunction();
  const searchParams = useSearchParams();

  const presetInputAmount =
    searchParams.get("buy") !== null ? searchParams.get("buy") : searchParams.get("sell");
  const presetInputAmountIsValid =
    presetInputAmount !== null &&
    presetInputAmount !== "" &&
    !Number.isNaN(Number(presetInputAmount));
  const [inputAmount, setInputAmount] = useState(
    toActualCoinDecimals({ num: presetInputAmountIsValid ? presetInputAmount! : "1" })
  );
  const [outputAmount, setOutputAmount] = useState(0n);
  const [previous, setPrevious] = useState(inputAmount);
  const [isLoading, setIsLoading] = useState(false);
  const [isSell, setIsSell] = useState(!(searchParams.get("sell") === null));
  const [submit, setSubmit] = useState<(() => Promise<void>) | null>(null);
  const { aptBalance, emojicoinBalance, account, setEmojicoinType } = useAptos();

  const [maxSlippage, setMaxSlippage] = useState(getMaxSlippageSettings().maxSlippage);

  const minOutputAmount =
    outputAmount - (outputAmount * maxSlippage) / 10000n > 0n
      ? outputAmount - (outputAmount * maxSlippage) / 10000n
      : 1n;

  const numSwaps = useEventStore(
    (s) => s.getMarket(marketEmojis)?.swapEvents.length ?? initNumSwaps
  );

  const latestMarketState = useEventStore((s) => s.getMarket(marketEmojis)?.stateEvents?.at(0));

  const gasCost = useGetGasWithDefault({ marketAddress, inputAmount, isSell, numSwaps });

  const { netProceeds, error } = useCalculateSwapPrice({
    latestMarketState,
    isSell,
    inputAmount,
    userEmojicoinBalance: emojicoinBalance,
  });

  useEffect(() => {
    const emojicoinType = toEmojicoinTypes(marketAddress).emojicoin.toString();
    setEmojicoinType(emojicoinType);
  }, [marketAddress, setEmojicoinType]);

  const availableAptBalance = useMemo(
    () => (aptBalance - gasCost > 0 ? aptBalance - gasCost : 0n),
    [gasCost, aptBalance]
  );

  useEffect(() => {
    if (netProceeds === 0n || error) {
      setIsLoading(true);
      return;
    }
    setPrevious(netProceeds);
    setOutputAmount(netProceeds);
    setIsLoading(false);
  }, [netProceeds, isSell, error]);

  const sufficientBalance = useMemo(() => {
    if (!account || (isSell && !emojicoinBalance) || (!isSell && !aptBalance)) return false;
    if (account) {
      if (isSell) {
        return emojicoinBalance >= inputAmount;
      }
      return aptBalance >= inputAmount;
    }
  }, [account, aptBalance, emojicoinBalance, isSell, inputAmount]);

  const balanceLabel = useMemo(() => {
    const label = ` (${t("Balance")}: `;
    const coinBalance = isSell ? emojicoinBalance : aptBalance;
    const balance = toDisplayCoinDecimals({
      num: coinBalance,
      decimals: 4,
    });
    return (
      <AnimatePresence>
        {account && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {label}
            <span className={sufficientBalance ? "text-green" : "text-error"}>{balance}</span>
            {")"}
          </motion.span>
        )}
      </AnimatePresence>
    );
  }, [t, account, isSell, aptBalance, emojicoinBalance, sufficientBalance]);

  const { targetRef, tooltip: gearTooltip } = useTooltip(
    <TradeOptions
      onMaxSlippageUpdate={() => setMaxSlippage(getMaxSlippageSettings().maxSlippage)}
    />,
    {
      placement: "bottom",
      customStyles: getTooltipStyles(darkTheme),
      trigger: "click",
      tooltipOffset: [100, 10],
    }
  );

  return (
    <Column className="relative w-full max-w-[414px] justify-center">
      <Flex
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        className="mb-[.4em]"
      >
        <div ref={targetRef}>
          <Emoji className="cursor-pointer" emojis={emoji("gear")} />
        </div>
        {gearTooltip}
        <FlexGap flexDirection="row" gap="5px">
          {isSell ? (
            <>
              <EmojiPill
                emoji="nauseated face"
                description="Sell 50%"
                onClick={() => {
                  setInputAmount(emojicoinBalance / 2n);
                }}
              />
              <EmojiPill
                emoji="face vomiting"
                description="Sell 100%"
                onClick={() => {
                  setInputAmount(emojicoinBalance);
                }}
              />
            </>
          ) : (
            <>
              <EmojiPill
                emoji={"waxing crescent moon"}
                description="Buy 25%"
                onClick={() => {
                  setInputAmount(availableAptBalance / 4n);
                }}
              />
              <EmojiPill
                emoji={"first quarter moon"}
                description="Buy 50%"
                onClick={() => {
                  setInputAmount(availableAptBalance / 2n);
                }}
              />
              <EmojiPill
                emoji={"full moon"}
                description="Buy 100%"
                onClick={() => {
                  setInputAmount(availableAptBalance);
                }}
              />
            </>
          )}
        </FlexGap>
      </Flex>

      <SimulateInputsWrapper>
        <InnerWrapper>
          <Column>
            <div className={grayLabel}>
              {isSell ? t("You sell") : t("You pay")}
              {balanceLabel}
            </div>
            <InputNumeric
              className={inputAndOutputStyles + " bg-transparent leading-[32px]"}
              value={inputAmount}
              onUserInput={(v) => setInputAmount(v)}
              onSubmit={() => (submit ? submit() : {})}
              decimals={8}
            />
          </Column>
          {isSell ? <EmojiInputLabel emoji={emojicoin} /> : <AptosInputLabel />}
        </InnerWrapper>

        <FlipInputsArrow
          onClick={() => {
            setInputAmount(outputAmount);
            setOutputAmount(inputAmount);
            setPrevious(inputAmount);
            setIsSell((v) => !v);
          }}
        />

        <InnerWrapper>
          <Column>
            <div className={grayLabel}>{t("You receive")}</div>
            <div className="h-[22px] w-full">
              <div
                onClick={() => setIsSell((v) => !v)}
                className={inputAndOutputStyles + " mt-[8px] ml-[1px] cursor-pointer"}
                style={{ opacity: isLoading ? 0.6 : 1 }}
              >
                {/* Scrambled swap result output below. */}
                <FormattedNumber
                  value={isLoading ? previous : outputAmount}
                  nominalize
                  scramble
                  decimals={OUTPUT_DISPLAY_DECIMALS}
                />
              </div>
            </div>
          </Column>
          {isSell ? <AptosInputLabel /> : <EmojiInputLabel emoji={emojicoin} />}
        </InnerWrapper>
      </SimulateInputsWrapper>
      <div className="flex flex-row justify-between py-[10px]">
        <div></div>
        <div className="text-dark-gray">
          <span className="text-xl leading-[0]">
            {gasCost === DEFAULT_SWAP_GAS_COST ? "~" : ""}
            {toDisplayCoinDecimals({
              num: gasCost,
              decimals: 4,
            })}{" "}
            APT
          </span>{" "}
          <Emoji emojis={emoji("fuel pump")} />
        </div>
      </div>

      <Row className="justify-center mt-[14px]">
        <SwapButton
          inputAmount={inputAmount}
          marketAddress={marketAddress}
          isSell={isSell}
          setSubmit={setSubmit}
          // Disable the button if and only if the balance has been fetched and isn't sufficient *and*
          // the user is connected.
          disabled={!sufficientBalance && !isLoading && !!account}
          symbol={emojicoin}
          minOutputAmount={minOutputAmount}
        />
      </Row>
    </Column>
  );
}
