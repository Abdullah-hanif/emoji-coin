import Button from "components/button";
import { FormattedNumber } from "components/FormattedNumber";
import Popup from "components/popup";
import { Planet, TwitterOutlineIcon } from "components/svg";
import AptosIconBlack from "components/svg/icons/AptosBlack";
import { useEventStore } from "context/event-store-context";
import { translationFunction } from "context/language-context";
import { useAptos } from "context/wallet-context/AptosContextProvider";
import { motion } from "framer-motion";
import { DISCORD_METADATA_REQUEST_CHANNEL, LINKS } from "lib/env";
import { toExplorerLink } from "lib/utils/explorer-link";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import darkTheme from "theme/dark";
import type { Colors } from "theme/types";
import { Emoji } from "utils/emoji";

import { useMatchBreakpoints } from "@/hooks/index";
import { useUsdMarketCap, useUSDValue } from "@/hooks/use-usd-market-cap";
import TelegramOutlineIcon from "@/icons/TelegramOutlineIcon";
import { MarketProperties } from "@/move-modules";
import { isMarketStateModel } from "@/sdk/indexer-v2/types";

import { Switcher } from "../../../../switcher";
import type { MainInfoProps } from "../../types";
import BondingProgress from "./BondingProgress";

const statsTextClasses = "uppercase ellipses font-forma text-[24px]";

const LinkButton = ({
  name,
  link,
  icon,
}: {
  name: string;
  link: string | undefined;
  icon?: (color: keyof Colors) => React.ReactNode;
}) => {
  const button = (
    <Button
      scale="lg"
      fakeDisabled={!link && !!LINKS?.discord && !!DISCORD_METADATA_REQUEST_CHANNEL}
      disabled={!link && !LINKS?.discord && !DISCORD_METADATA_REQUEST_CHANNEL}
      icon={icon && icon(link ? "econiaBlue" : "darkGray")}
    >
      {name}
    </Button>
  );
  if (link) {
    return (
      <Link href={link} target="_blank">
        {button}
      </Link>
    );
  }
  if (LINKS?.discord && DISCORD_METADATA_REQUEST_CHANNEL) {
    return (
      <Popup
        className="w-[300px]"
        content={
          "Submit a request in the #" +
          DISCORD_METADATA_REQUEST_CHANNEL +
          " Discord channel to add links. (Click the button to join Discord.)"
        }
      >
        <Link href={LINKS?.discord} target="_blank">
          <div>{button}</div>
        </Link>
      </Popup>
    );
  }
  return button;
};

const MainInfo = ({ data }: MainInfoProps) => {
  const { t } = translationFunction();

  const marketEmojis = data.symbolEmojis;
  const stateEvents = useEventStore((s) => s.getMarket(marketEmojis)?.stateEvents ?? []);

  const [marketCap, setMarketCap] = useState(BigInt(data.state.state.instantaneousStats.marketCap));
  const [dailyVolume, setDailyVolume] = useState(BigInt(data.state.dailyVolume));
  const [allTimeVolume, setAllTimeVolume] = useState(
    BigInt(data.state.state.cumulativeStats.quoteVolume)
  );
  const [showUSD, setShowUSD] = useState<boolean>(false);

  useEffect(() => {
    if (stateEvents.length === 0) return;
    const event = stateEvents.at(0);
    if (event) {
      setMarketCap(event.state.instantaneousStats.marketCap);
      setAllTimeVolume(event.state.cumulativeStats.quoteVolume);
      if (isMarketStateModel(event)) {
        setDailyVolume(event.dailyVolume);
      }
    }
  }, [stateEvents]);

  const usdMarketCap = useUsdMarketCap(marketCap);
  const usdDailyVolume = useUSDValue(dailyVolume);
  const usdAllTimeVolume = useUSDValue(allTimeVolume);

  const { isMobile, isTablet } = useMatchBreakpoints();

  const explorerLink = toExplorerLink({
    linkType: "coin",
    value: `${data.marketView.metadata.marketAddress}::coin_factory::Emojicoin`,
  });

  const borderStyle = "border-solid border-[1px] border-dark-gray rounded-[3px] p-[1em]";

  const [marketProperties, setMarketProperties] = useState<Map<string, string>>();

  const { aptos } = useAptos();

  useEffect(() => {
    MarketProperties.view({
      aptos,
      market: data.marketAddress,
    })
      .then((r) => r.vec.at(0) ?? null)
      .then((r) => {
        if (r) {
          const newFields = new Map();
          (r as { data: { key: string; value: string }[] }).data.forEach(({ key, value }) => {
            newFields.set(key, value);
          });
          setMarketProperties(newFields);
        }
      })
      .catch((e) => console.error("Could not get market metadata.", e));
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [data.marketAddress]);

  const telegramButton = (
    <LinkButton
      name={"telegram"}
      link={marketProperties?.get("Telegram")}
      icon={(color) => (
        <TelegramOutlineIcon className="h-[1.5em] w-[1.5em] ml-[-8px]" color={color} />
      )}
    />
  );

  const twitterButton = (
    <LinkButton
      name={"twitter"}
      link={marketProperties?.get("X profile")}
      icon={(color) => (
        <TwitterOutlineIcon className="h-[1.2em] w-[1.2em] ml-[-8px]" color={color} />
      )}
    />
  );

  const websiteButton = (
    <LinkButton
      name={"website"}
      link={marketProperties?.get("Website")}
      icon={(color) => <Planet className="h-[.7em] w-[.7em] self-center mr-[8px]" color={color} />}
    />
  );

  const switcher = (
    <Switcher
      disabled={usdMarketCap === undefined}
      checked={showUSD}
      onChange={() => setShowUSD((v) => !v)}
    />
  );

  function aptOrUsd(value: bigint, valueUsd: number | undefined) {
    if (valueUsd !== undefined && showUSD) {
      return (
        <>
          <FormattedNumber value={valueUsd} scramble />
          {" $"}
        </>
      );
    } else {
      return (
        <>
          <FormattedNumber value={value} nominalize scramble />
          &nbsp;
          <AptosIconBlack className={"icon-inline mb-[0.3ch]"} />
        </>
      );
    }
  }

  return (
    <div
      className="flex justify-center mt-[10px]"
      style={{
        borderTop: `1px solid ${darkTheme.colors.darkGray}`,
      }}
    >
      <div
        className="mx-[2vw]"
        style={
          isMobile || isTablet
            ? {
                display: "flex",
                gap: "1em",
                flexDirection: "column",
                width: "100%",
                padding: "40px 0px",
              }
            : {
                display: "grid",
                gridTemplateColumns: "25fr 35fr 40fr",
                gap: "32px",
                width: "100%",
                maxWidth: "1362px",
                padding: "20px 0",
              }
        }
      >
        <div className={`grid place-items-center text-center ${borderStyle}`}>
          <Link href={explorerLink} target="_blank">
            <Emoji className="display-2" emojis={data.emojis} />
          </Link>
        </div>

        <div className={`flex flex-col justify-between ${borderStyle}`}>
          <div className="flex justify-between">
            <div className={statsTextClasses + " text-light-gray"}>
              {"APT "}
              <AptosIconBlack className={"icon-inline mb-[0.0ch]"} />
              {" / USD $:"}
            </div>
            <div className={statsTextClasses + " text-white"}>{switcher}</div>
          </div>
          <div className="flex justify-between">
            <div className={statsTextClasses + " text-light-gray"}>{t("Market Cap:")}</div>
            <div className={statsTextClasses + " text-white"}>
              <div className="flex flex-row justify-center items-center">
                {aptOrUsd(marketCap, usdMarketCap)}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <div className={statsTextClasses + " text-light-gray"}>{t("24 hour vol:")}</div>
            <div className={statsTextClasses + " text-white"}>
              <div className="flex flex-row justify-center items-center">
                {aptOrUsd(dailyVolume, usdDailyVolume)}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <div className={statsTextClasses + " text-light-gray"}>{t("All-time vol:")}</div>
            <div className={statsTextClasses + " text-white"}>
              <div className="flex flex-row justify-center items-center">
                {aptOrUsd(allTimeVolume, usdAllTimeVolume)}
              </div>
            </div>
          </div>
        </div>
        <div className={`flex flex-col gap-[1em] ${borderStyle}`}>
          <div className={`flex flex-row flex-wrap justify-between`} style={{ gap: "8px 0" }}>
            <motion.div
              onClick={() => {
                navigator.clipboard.writeText(data.marketView.metadata.marketAddress);
              }}
              whileTap={{ scaleX: 0.96, scaleY: 0.98 }}
              transition={{ ease: "linear", duration: 0.05 }}
            >
              <Button scale="lg">copy coin address</Button>
            </motion.div>

            {twitterButton}
            {telegramButton}
            {websiteButton}
          </div>
          <BondingProgress data={data} />
        </div>
      </div>
    </div>
  );
};

export default MainInfo;
