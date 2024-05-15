"use client";

import React, { useState } from "react";

import { useTranslation } from "context";
import { Flex, FlexGap } from "@/containers";
import { Text } from "components/text";

import { type TableHeaderSwitcherPops } from "./types";

const TableHeaderSwitcher: React.FC<TableHeaderSwitcherPops> = ({ title1, title2 }) => {
  const [isActive, setIsActive] = useState(true);
  const { t } = useTranslation();

  const clickHandler = () => {
    setIsActive(!isActive);
  };

  return (
    <FlexGap gap="12px" width="fit-content">
      <Flex cursor="pointer">
        <Text
          textScale={{ _: "pixelHeading4", laptopL: "pixelHeading3" }}
          textTransform="uppercase"
          color={isActive ? "lightGrey" : "darkGrey"}
          onClick={clickHandler}
        >
          {t(title1)}
        </Text>
      </Flex>

      <Flex cursor="pointer">
        <Text
          textScale={{ _: "pixelHeading4", laptopL: "pixelHeading3" }}
          textTransform="uppercase"
          color={isActive ? "darkGrey" : "lightGrey"}
          onClick={clickHandler}
        >
          {t(title2)}
        </Text>
      </Flex>
    </FlexGap>
  );
};

export default TableHeaderSwitcher;
