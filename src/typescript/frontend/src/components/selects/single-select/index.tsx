import { Arrow } from "components/svg";
import { useTooltip } from "hooks";
import type { TooltipOptions } from "hooks/use-tooltip/types";
import React from "react";
import darkTheme from "theme/dark";

import { Select } from "../select";
import { getTooltipStyles } from "../theme";
import type { Option, SingleSelectProps } from "../types";

const SingleSelect: React.FC<SingleSelectProps> = ({
  title,
  titleProps,
  placeholder = "Please select...",
  placeholderProps = { color: "lightGray" },
  dropdownComponent,
  dropdownWrapperProps,
  wrapperProps,
  iconProps,
  tooltipOptions,
  Icon = Arrow,
  value,
  options,
  setValue,
  onHover,
}) => {
  const DropdownComponent = dropdownComponent;

  const defaultTooltipOptions: TooltipOptions = {
    placement: "bottom",
    customStyles: getTooltipStyles(darkTheme),
    trigger: "click",
  };

  const { targetRef, tooltip, setVisible } = useTooltip(
    <DropdownComponent
      options={options}
      value={value}
      onClick={onDropdownMenuClick}
      onClose={onDropdownMenuClose}
      onHover={onHover}
      {...dropdownWrapperProps}
    />,

    {
      ...defaultTooltipOptions,
      ...tooltipOptions,
    }
  );

  function onDropdownMenuClose() {
    setVisible(false);
  }

  function onDropdownMenuClick(option: Option) {
    setVisible(false);
    setValue(option);
  }

  return (
    <Select
      targetRef={targetRef}
      wrapperProps={wrapperProps}
      title={title}
      titleProps={titleProps}
      placeholder={placeholder}
      placeholderProps={placeholderProps}
      Icon={Icon}
      iconProps={iconProps}
      tooltip={tooltip}
    />
  );
};

export default SingleSelect;
