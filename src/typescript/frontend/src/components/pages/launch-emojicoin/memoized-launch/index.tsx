import { MarketValidityIndicator } from "components/emoji-picker/ColoredBytesIndicator";
import EmojiPickerWithInput from "components/emoji-picker/EmojiPickerWithInput";
import Info from "components/info";
import { useEmojiPicker } from "context/emoji-picker-context";
import { translationFunction } from "context/language-context";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { AnimatePresence, motion } from "framer-motion";
import { useAccountSequenceNumber } from "lib/hooks/use-account-sequence-number";
import { toCoinDecimalString } from "lib/utils/decimals";
import React, { useEffect, useMemo } from "react";
import { useScramble } from "use-scramble";
import { emoji } from "utils";
import { Emoji } from "utils/emoji";

import { MARKET_REGISTRATION_DEPOSIT, ONE_APT_BIGINT } from "@/sdk/const";
import { SYMBOL_EMOJI_DATA } from "@/sdk/emoji_data";
import { sumBytes } from "@/sdk/utils/sum-emoji-bytes";

import { useIsMarketRegistered } from "../hooks/use-is-market-registered";
import { useRegisterMarket } from "../hooks/use-register-market";
import LaunchButtonOrGoToMarketLink from "./components/launch-or-goto";

const labelClassName = "whitespace-nowrap body-sm md:body-lg text-light-gray uppercase font-forma";

export const MemoizedLaunchAnimation = ({ loading }: { loading: boolean }) => {
  const { t } = translationFunction();
  const emojis = useEmojiPicker((state) => state.emojis);
  const setIsLoadingRegisteredMarket = useEmojiPicker(
    (state) => state.setIsLoadingRegisteredMarket
  );
  const { aptBalance, refetchBalance, aptos, account } = useAptos();
  const { sequenceNumber } = useAccountSequenceNumber(aptos, account);

  const { registerMarket, cost } = useRegisterMarket(sequenceNumber);
  const { invalid, registered } = useIsMarketRegistered();

  useEffect(() => {
    return () => setIsLoadingRegisteredMarket(false);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const totalCost = useMemo(
    () => (cost ? cost + Number(MARKET_REGISTRATION_DEPOSIT) : undefined),
    [cost]
  );

  const sufficientBalance = useMemo(
    () => (totalCost ? aptBalance >= totalCost : undefined),
    [aptBalance, totalCost]
  );

  const displayCost = toCoinDecimalString(cost, 2);
  const displayDeposit = toCoinDecimalString(MARKET_REGISTRATION_DEPOSIT, 2);
  const numBytes = useMemo(() => {
    return sumBytes(emojis);
  }, [emojis]);

  useEffect(() => {
    refetchBalance("apt");
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [emojis]);

  const handleClick = async () => {
    if (!invalid && !registered) {
      await registerMarket();
    }
  };

  const { ref } = useScramble({
    text: "Building your emojicoin...",
    overdrive: false,
    overflow: true,
    playOnMount: true,
    scramble: 10,
    tick: 9,
  });

  return (
    <AnimatePresence initial={false} mode="wait">
      {/* Input */}
      {!loading ? (
        <motion.div
          key={"register-market-input"}
          className="flex flex-col w-full"
          exit={{
            opacity: 0,
          }}
        >
          <div className="flex relative mb-1">
            <div className="flex flex-col grow relative w-full">
              <EmojiPickerWithInput
                handleClick={handleClick}
                inputClassName="!border !border-solid !border-light-gray rounded-md !flex-row-reverse pl-3 pr-1.5"
                inputGroupProps={{ label: "Select Emojis", scale: "xm" }}
              />
            </div>
          </div>
          <MarketValidityIndicator
            className={
              emojis.length !== 0 &&
              numBytes <= 10 &&
              (registered || typeof registered === "undefined")
                ? "opacity-[0.65]"
                : ""
            }
            registered={registered}
          />
          <div className="flex">
            <div className={labelClassName}>{t("Emojicoin Name:")}</div>
            <div className="body-sm md:body-lg uppercase ellipses text-white font-forma ml-[0.5ch]">
              {emojis.map((e) => SYMBOL_EMOJI_DATA.byEmoji(e)?.name).join(", ")}
            </div>
          </div>

          <div className="flex">
            <div className={labelClassName}>{t("Emojicoin Symbol:")}</div>
            <Emoji
              className={
                "body-sm md:body-lg uppercase whitespace-normal text-ellipsis text-white font-forma " +
                "ml-[0.5ch] leading-6 "
              }
              emojis={emojis.join("")}
            />
          </div>
          <div className="flex flex-col justify-center m-auto pt-2 pixel-heading-4 uppercase">
            <div className="flex flex-col text-dark-gray">
              <div className="flex flex-row justify-between">
                <div className="flex flex-row items-center justify-left mr-[4ch]">
                  <span>{t("Cost to deploy")}</span>
                  <div className="mx-[5px]">
                    <Info imageClassName={"w-[13px] mt-[1px]"}>{`
                      The cost to deploy a market is ${displayCost} APT plus
                      a ${displayDeposit} APT deposit that will automatically
                      be refunded when the market exits the bonding curve.
                    `}</Info>
                  </div>
                </div>
                <div>
                  <span className="">{displayCost}</span>&nbsp;APT (+{" "}
                  <span className="">{displayDeposit}</span>&nbsp;APT)
                </div>
              </div>
              <div className="flex flex-row justify-between">
                <div className="flex flex-row">
                  <span>{t("Your balance")}</span>
                  <div className={"flex flex-row absolute mt-[2px]"}>
                    <span className="opacity-0 select-none">{t("Your balance")}</span>
                    <Emoji
                      className="ml-[3px] text-[12px]"
                      emojis={sufficientBalance ? emoji("check mark button") : emoji("cross mark")}
                    />
                  </div>
                </div>
                <div>
                  <span
                    className={
                      sufficientBalance ? "text-green" : "text-error brightness-[1.1] saturate-150"
                    }
                  >
                    {Number(
                      toCoinDecimalString(aptBalance, aptBalance / ONE_APT_BIGINT < 1 ? 6 : 4)
                    )}
                  </span>
                  &nbsp;APT
                </div>
              </div>
              <div className="flex flex-row justify-between">
                <div className="flex flex-row items-center justify-left mr-[4ch]">
                  <span>{t("Grace period")}</span>
                  <div className="mx-[5px]">
                    <Info imageClassName={"w-[13px] mt-[1px]"}>
                      After a market is launched, there will be a grace period during which only the
                      account that launched the market can trade. The grace period ends after 5
                      minutes or after the first trade, whichever comes first.
                    </Info>
                  </div>
                </div>
                <div>5 minutes</div>
              </div>
            </div>
          </div>
          <motion.div
            className={"flex flex-col justify-center m-auto mt-[1ch]"}
            initial={{ opacity: 0.4 }}
            animate={{
              opacity: emojis.length === 0 || numBytes > 10 ? 0.4 : 1,
            }}
          >
            <LaunchButtonOrGoToMarketLink
              invalid={invalid}
              insufficientBalance={!sufficientBalance}
              registered={registered}
              onWalletButtonClick={() => {
                registerMarket();
              }}
            />
          </motion.div>

          <div className="h-[1ch] opacity-0">{"placeholder"}</div>
        </motion.div>
      ) : (
        // Status indicator.
        <motion.div
          key={"status-indicator"}
          animate={{ opacity: 1 }}
          className="absolute flex flex-col justify-center items-center w-full h-full gap-6"
        >
          <span ref={ref} className="pixel-heading-3 text-ec-blue uppercase">
            Building your emojicoin...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(MemoizedLaunchAnimation);
