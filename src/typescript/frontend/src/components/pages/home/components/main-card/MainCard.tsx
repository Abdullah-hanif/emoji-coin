"use client";

import "./module.css";

import type { HomePageProps } from "app/home/HomePage";
import { FormattedNumber } from "components/FormattedNumber";
import { PriceDelta } from "components/price-feed/inner";
import AptosIconBlack from "components/svg/icons/AptosBlack";
import { translationFunction } from "context/language-context";
import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "react-use";
import { ROUTES } from "router/routes";
import { emoji } from "utils";
import { Emoji } from "utils/emoji";
import { emojiNamesToPath } from "utils/pathname-helpers";

import { FlexGap } from "@/containers";
import { useUsdMarketCap } from "@/hooks/use-usd-market-cap";

import planetHome from "../../../../../../public/images/planet-home.png";

interface MainCardProps {
  featuredMarkets: HomePageProps["priceFeed"];
  page: HomePageProps["page"];
  sortBy: HomePageProps["sortBy"];
}

const FEATURED_MARKET_INTERVAL = 5 * 1000;
const MAX_NUM_FEATURED_MARKETS = 5;

const MainCard = (props: MainCardProps) => {
  const featuredMarkets = useMemo(() => {
    const sorted = _.orderBy(props.featuredMarkets, (i) => i.deltaPercentage, "desc");
    const positives = sorted.filter(({ deltaPercentage }) => deltaPercentage > 0);
    const notPositives = sorted.filter(({ deltaPercentage }) => deltaPercentage <= 0);
    return positives.length
      ? positives.slice(0, MAX_NUM_FEATURED_MARKETS)
      : notPositives.slice(0, MAX_NUM_FEATURED_MARKETS);
  }, [props.featuredMarkets]);

  const { t } = translationFunction();
  const globeImage = useRef<HTMLImageElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  useInterval(() => {
    setCurrentIndex((i) => (i + 1) % Math.min(featuredMarkets.length, MAX_NUM_FEATURED_MARKETS));
  }, FEATURED_MARKET_INTERVAL);

  const featured = useMemo(() => featuredMarkets.at(currentIndex), [featuredMarkets, currentIndex]);

  const { marketCap, dailyVolume, allTimeVolume, priceDelta } = useMemo(() => {
    return {
      marketCap: BigInt(featured?.state.instantaneousStats.marketCap ?? 0),
      dailyVolume: BigInt(featured?.dailyVolume ?? 0),
      allTimeVolume: BigInt(featured?.state.cumulativeStats.quoteVolume ?? 0),
      priceDelta: featured?.deltaPercentage ?? 0,
    };
  }, [featured]);

  const usdMarketCap = useUsdMarketCap(marketCap);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (globeImage.current) {
        const classlist = globeImage.current?.classList;
        if (!classlist.contains("hero-image-animation")) {
          classlist.add("hero-image-animation");
        }
      }
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className="flex flex-col w-full my-[20px] md:my-[70px] max-w-full">
      <div className="flex flex-col md:flex-row w-full max-w-full items-center justify-center">
        <Link
          className="flex relative items-center ml-[-8%]"
          href={
            featured
              ? `${ROUTES.market}/${emojiNamesToPath(featured.market.emojis.map((x) => x.name))}`
              : ROUTES.home
          }
        >
          <Image
            id="hero-image"
            alt="Planet"
            src={planetHome}
            ref={globeImage}
            placeholder="empty"
            className="z-10"
          />
          <AnimatePresence mode="popLayout">
            <div
              key={`${featured?.market.symbolData.symbol}-${currentIndex}`}
              className={`flex flex-row styled-emoji ${featured?.market.emojis.length === 1 ? "styled-single-emoji" : "styled-double-emoji"} z-[-1]`}
            >
              <motion.div
                className="flex relative items-center h-[120px]"
                initial={{
                  right: -300,
                  opacity: 0,
                }}
                animate={{
                  right: 0,
                  opacity: 1,
                }}
                exit={{
                  right: 300,
                  opacity: 0,
                }}
              >
                <Emoji emojis={featured?.market.emojis ?? emoji("black heart")} />
              </motion.div>
            </div>
          </AnimatePresence>
        </Link>
        <div className="flex flex-col max-w-full ellipses">
          <div className="flex flex-row items-center">
            <span className="text-medium-gray pixel-heading-text uppercase">Hot</span>
            <span>&nbsp;</span>
            <div>
              <Emoji className="pixel-heading-emoji" emojis={emoji("fire")} />
            </div>
            {priceDelta > 0 && (
              <PriceDelta className="pixel-heading-emoji ml-[0.5ch]" delta={priceDelta} />
            )}
          </div>
          <div
            className="display-font-text ellipses font-forma-bold uppercase"
            title={featured?.market.symbolData.name ?? "BLACK HEART"}
          >
            {featured?.market.symbolData.name ?? "BLACK HEART"}
          </div>

          <FlexGap gap="8px">
            {featured && (
              <>
                <div className="font-forma text-medium-gray market-data-text uppercase">
                  {t("Mkt. Cap:")}
                </div>
                <div className="font-forma text-white market-data-text uppercase">
                  <div className="flex flex-row items-center justify-center">
                    {usdMarketCap === undefined ? (
                      <FormattedNumber value={marketCap} nominalize scramble />
                    ) : (
                      <FormattedNumber value={usdMarketCap} scramble />
                    )}
                    &nbsp;
                    {usdMarketCap === undefined ? (
                      <AptosIconBlack className={"icon-inline mb-[0.3ch]"} />
                    ) : (
                      "$"
                    )}
                  </div>
                </div>
              </>
            )}
          </FlexGap>

          <FlexGap gap="8px">
            {featured && (
              <>
                <div className="uppercase">
                  <div className="font-forma text-medium-gray market-data-text uppercase">
                    {t("24 hour vol:")}
                  </div>
                </div>
                <div className="font-forma text-white market-data-text uppercase">
                  <div className="flex flex-row items-center justify-center">
                    <FormattedNumber value={dailyVolume} scramble nominalize />
                    &nbsp;
                    <AptosIconBlack className={"icon-inline mb-[0.3ch]"} />
                  </div>
                </div>
              </>
            )}
          </FlexGap>

          <FlexGap gap="8px">
            {featured && (
              <>
                <div className="font-forma text-medium-gray market-data-text uppercase">
                  {t("All-time vol:")}
                </div>
                <div className="font-forma text-white market-data-text uppercase">
                  <div className="flex flex-row items-center justify-center">
                    <FormattedNumber value={allTimeVolume} scramble nominalize />
                    &nbsp;
                    <AptosIconBlack className={"icon-inline mb-[0.3ch]"} />
                  </div>
                </div>
              </>
            )}
          </FlexGap>
        </div>
      </div>
    </div>
  );
};

export default MainCard;
