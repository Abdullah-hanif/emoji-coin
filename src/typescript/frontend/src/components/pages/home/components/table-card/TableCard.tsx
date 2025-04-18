"use client";

import { FormattedNumber } from "components/FormattedNumber";
import { Arrow } from "components/svg";
import Text from "components/text";
import { useEventStore, useUserSettings } from "context/event-store-context";
import { translationFunction } from "context/language-context";
import { motion, type MotionProps, useAnimationControls } from "framer-motion";
import { emojisToName } from "lib/utils/emojis-to-name-or-symbol";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Emoji } from "utils/emoji";

import { Column, Flex } from "@/containers";
import { useUsdMarketCap } from "@/hooks/use-usd-market-cap";
import { SortMarketsBy } from "@/sdk/indexer-v2/types/common";

import {
  borderVariants,
  eventToVariant as toVariant,
  glowVariants,
  onlyHoverVariant,
  textVariants,
} from "./animation-variants/event-variants";
import {
  calculateGridData,
  determineGridAnimationVariant,
  type EmojicoinAnimationEvents,
  LAYOUT_DURATION,
  tableCardVariants,
} from "./animation-variants/grid-variants";
import EmojiMarketPageLink from "./LinkOrAnimationTrigger";
import type { GridLayoutInformation, TableCardProps } from "./types";

const TableCard = ({
  index,
  marketID,
  emojis,
  staticMarketCap,
  staticVolume24H,
  rowLength,
  prevIndex,
  pageOffset,
  runInitialAnimation,
  sortBy,
  ...props
}: TableCardProps & GridLayoutInformation & MotionProps) => {
  const { t } = translationFunction();
  const isMounted = useRef(true);
  const controls = useAnimationControls();
  const animationsOn = useUserSettings((s) => s.animate);

  const stateEvents = useEventStore(
    (s) => s.getMarket(emojis.map((e) => e.emoji))?.stateEvents ?? []
  );
  const animationEvent = stateEvents.at(0);

  const { secondaryLabel, secondaryMetric, marketCap } = useMemo(() => {
    const { allTimeVolume, lastSwapVolume, marketCap } = animationEvent
      ? {
          allTimeVolume: animationEvent.state.cumulativeStats.quoteVolume,
          lastSwapVolume: animationEvent.lastSwap.quoteVolume,
          marketCap: animationEvent.state.instantaneousStats.marketCap,
        }
      : {
          allTimeVolume: 0n,
          lastSwapVolume: 0n,
          marketCap: staticMarketCap,
        };
    const [secondaryLabel, secondaryMetric] =
      sortBy === SortMarketsBy.BumpOrder
        ? ["Last Swap", lastSwapVolume]
        : sortBy === SortMarketsBy.AllTimeVolume
          ? ["All Time Vol", allTimeVolume]
          : ["24h Volume", staticVolume24H];
    return {
      secondaryLabel,
      secondaryMetric,
      marketCap,
    };
  }, [sortBy, animationEvent, staticVolume24H, staticMarketCap]);

  const usdMarketCap = useUsdMarketCap(marketCap);

  // Keep track of whether or not the component is mounted to avoid animating an unmounted component.
  useLayoutEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  const runAnimationSequence = useCallback(
    (event: EmojicoinAnimationEvents) => {
      const [nowMs, eventMs] = [new Date().getTime(), event.transaction.timestamp.getTime()];
      // Only animate the event if it occurred within the last 5 seconds.
      if (nowMs - eventMs < 5000) {
        const variant = toVariant(event);
        controls.stop();
        if (isMounted.current) {
          controls.start(variant).then(() => {
            if (isMounted.current) {
              controls.start("initial");
            }
          });
        }
      }
    },
    [controls]
  );

  useEffect(() => {
    if (animationEvent) {
      runAnimationSequence(animationEvent);
    }
  }, [animationEvent, runAnimationSequence, sortBy]);

  const { curr, prev, variant, displayIndex, layoutDelay } = useMemo(() => {
    const { curr, prev } = calculateGridData({
      index,
      prevIndex,
      rowLength,
    });
    const { variant, layoutDelay } = determineGridAnimationVariant({
      curr,
      prev,
      rowLength,
      runInitialAnimation,
    });
    const displayIndex = index + pageOffset + 1;
    return {
      variant,
      curr,
      prev,
      displayIndex,
      layoutDelay,
    };
  }, [prevIndex, index, rowLength, pageOffset, runInitialAnimation]);

  return (
    <motion.div
      layout
      layoutId={`${sortBy}-${marketID}`}
      initial={
        variant === "initial"
          ? {
              opacity: 0,
            }
          : variant === "unshift"
            ? {
                opacity: 0,
                scale: 0,
              }
            : undefined
      }
      className="grid-emoji-card group cursor-pointer border-solid bg-black border border-dark-gray hover:z-10 hover:border-ec-blue"
      variants={tableCardVariants}
      animate={variant}
      custom={{ curr, prev, layoutDelay }}
      // Unfortunately, the transition for a layout animation is separate from a variant, hence why we have
      // to fill this with conditionals.
      transition={{
        type: variant === "initial" || variant === "portal-backwards" ? "just" : "spring",
        delay: variant === "initial" ? 0 : layoutDelay,
        duration:
          variant === "initial"
            ? 0
            : variant === "portal-backwards"
              ? LAYOUT_DURATION * 0.25
              : LAYOUT_DURATION,
      }}
      whileHover={{
        filter: "brightness(1.05) saturate(1.1)",
        boxShadow: "0 0 9px 7px rgba(8, 108, 217, 0.2)",
        transition: {
          filter: { duration: 0.05 },
          boxShadow: { duration: 0.05 },
        },
      }}
      {...props}
    >
      <EmojiMarketPageLink emojis={emojis}>
        <motion.div animate={controls} variants={animationsOn ? glowVariants : {}}>
          <motion.div
            className="flex flex-col relative grid-emoji-card w-full h-full py-[10px] px-[19px] overflow-hidden"
            whileHover="hover"
            animate={controls}
            variants={animationsOn ? borderVariants : onlyHoverVariant}
          >
            <Flex justifyContent="space-between" mb="7px">
              <span className="pixel-heading-2 text-dark-gray group-hover:text-ec-blue p-[1px]">
                {displayIndex < 10 ? `0${displayIndex}` : displayIndex}
              </span>

              <Arrow className="w-[21px] !fill-current text-dark-gray group-hover:text-ec-blue transition-all" />
            </Flex>

            <Emoji
              // Font size and line height are taken from `pixel-heading-1` and `pixel-heading-1b`.
              className={`${emojis.length <= 2 ? "text-[64px]" : "text-[52px]"} leading-[48px] text-center mb-[22px] text-nowrap`}
              emojis={emojis}
            />
            <Text
              textScale="display4"
              textTransform="uppercase"
              $fontWeight="bold"
              mb="6px"
              ellipsis
              title={emojisToName(emojis).toUpperCase()}
            >
              {emojisToName(emojis)}
            </Text>
            <Flex>
              <Column width="50%">
                <div
                  className={
                    "body-sm font-forma text-light-gray " +
                    "group-hover:text-ec-blue uppercase p-[1px] transition-all"
                  }
                >
                  {t("Market Cap")}
                </div>
                {/* TODO: Have these do a "damage"-like animation, as if it's health is being chunked.
                  Like you'd see -0.03 (the diff) pop out of the total value in red and it'd shake horizontally,
                  then fall off the screen. */}
                <motion.div
                  animate={controls}
                  variants={animationsOn ? textVariants : {}}
                  className="body-sm uppercase font-forma"
                  style={{ color: "#FFFFFFFF", filter: "brightness(1) contrast(1)" }}
                >
                  {usdMarketCap === undefined ? (
                    <FormattedNumber value={marketCap} scramble nominalize suffix=" APT" />
                  ) : (
                    <FormattedNumber value={usdMarketCap} suffix=" $" />
                  )}
                </motion.div>
              </Column>
              <Column width="50%">
                <div
                  className={
                    "body-sm font-forma text-light-gray " +
                    "group-hover:text-ec-blue uppercase p-[1px] transition-all"
                  }
                >
                  {t(secondaryLabel)}
                </div>
                <motion.div
                  animate={controls}
                  variants={animationsOn ? textVariants : {}}
                  className="body-sm uppercase font-forma"
                  style={{ color: "#FFFFFFFF", filter: "brightness(1) contrast(1)" }}
                >
                  <FormattedNumber value={secondaryMetric} scramble nominalize suffix=" APT" />
                </motion.div>
              </Column>
            </Flex>
          </motion.div>
        </motion.div>
      </EmojiMarketPageLink>
    </motion.div>
  );
};

export default TableCard;
