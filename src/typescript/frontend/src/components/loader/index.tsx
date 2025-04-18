import type { FlexProps } from "components/layout/components/types";
import SpinnerIcon from "components/svg/icons/Spinner";
import React from "react";

import { Flex } from "@/containers";

const Loader: React.FC<FlexProps> = (props) => {
  return (
    <Flex justifyContent="center" alignItems="center" height="100dvh" {...props}>
      <SpinnerIcon width="44px" />
    </Flex>
  );
};

export default Loader;
