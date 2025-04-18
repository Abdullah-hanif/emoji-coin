import { SOCIAL_ICONS } from "components/footer/constants";
import type { FlexGapProps } from "components/layout/components/types";
import React from "react";

import { FlexGap } from "@/containers";

import { StyledIcon } from "./styled";

export const SocialLinks: React.FC<FlexGapProps> = (props) => {
  return (
    <FlexGap gap="14px" justifyContent="flex-end" {...props}>
      {SOCIAL_ICONS.map(({ icon: Icon, href }, index) => (
        <StyledIcon key={index} as="a" target="_blank" href={href}>
          <Icon width="27px" height="27px" />
        </StyledIcon>
      ))}
    </FlexGap>
  );
};
