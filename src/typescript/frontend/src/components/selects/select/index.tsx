import Text from "components/text";
import { translationFunction } from "context/language-context";
import React from "react";
import { useScramble } from "use-scramble";

import { FlexGap } from "@/containers";

import type { SelectProps } from "../types";
import { DropdownSelectWrapper } from "./styled";

export const Select: React.FC<SelectProps> = ({
  targetRef,
  wrapperProps,
  title,
  titleProps,
  placeholder = "Please select...",
  placeholderProps,
  tooltip,
}) => {
  const { t } = translationFunction();

  const { ref, replay } = useScramble({
    text: `${title}`,
    overdrive: false,
    speed: 0.5,
  });

  return (
    <DropdownSelectWrapper onMouseEnter={replay} {...wrapperProps}>
      <FlexGap ref={targetRef} gap="8px" ellipsis>
        <Text className="med-pixel-text" color="darkGray">
          {"{"}
        </Text>
        <Text className="med-pixel-text" {...placeholderProps} ellipsis>
          {t(placeholder)}
        </Text>

        {!title ? null : typeof title === "string" ? (
          <Text className="med-pixel-text" {...titleProps} ellipsis ref={ref}></Text>
        ) : (
          React.isValidElement(title) && title
        )}
        <Text className="med-pixel-text" color="darkGray">
          {"}"}
        </Text>
      </FlexGap>
      {tooltip}
    </DropdownSelectWrapper>
  );
};
