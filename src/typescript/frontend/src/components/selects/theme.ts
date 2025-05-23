import type { DefaultTheme } from "styled-components";

export const getTooltipStyles = (theme: DefaultTheme) => {
  return {
    tooltip: {
      padding: "0px",
      width: "fit-content",
      border: "none",
      background: theme.colors.transparent,
      borderRadius: "inherit",
      maxWidth: "100%",
    },
  };
};
