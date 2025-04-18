import { motion } from "framer-motion";
import styled from "styled-components";
import type { Colors } from "theme/types";

const PADDING = 16;

export const Arrow = styled.div`
  width: 10px;
  height: 10px;
  background: ${({ theme }) => theme.colors.econiaBlue};
`;

export const StyledTooltip = styled(motion.div)<{ arrowBorderColor: keyof Colors }>`
  padding: ${PADDING}px;
  border-radius: ${({ theme }) => theme.radii.xSmall};
  max-width: calc(320px - (${PADDING}px * 2));
  z-index: ${({ theme }) => theme.zIndices.tooltip};
  background: ${({ theme }) => theme.colors.econiaBlue};
  border: 1px solid ${({ theme }) => theme.colors.econiaBlue};
  color: ${({ theme }) => theme.colors.black};
  font-size: 20px;
  word-wrap: break-word;
  box-shadow: ${({ theme }) => theme.shadows.tooltip};
  text-transform: uppercase;
  margin-top: 10px;
  margin-bottom: 10px;

  &[data-popper-placement^="top"] > ${Arrow} {
    bottom: -5px;
    border-bottom: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
    border-right: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
  }

  &[data-popper-placement^="bottom"] > ${Arrow} {
    top: -5px;
    border-top: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
    border-left: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
  }

  &[data-popper-placement^="left"] > ${Arrow} {
    right: -5px;
    border-top: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
    border-right: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
  }

  &[data-popper-placement^="right"] > ${Arrow} {
    left: -5px;
    border-bottom: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
    border-left: 1px solid
      ${({ theme, arrowBorderColor }) =>
        arrowBorderColor ? theme.colors[arrowBorderColor] : theme.colors.econiaBlue};
  }
`;
