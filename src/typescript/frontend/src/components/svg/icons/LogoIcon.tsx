import { Badge } from "components/Badge";
import Svg from "components/svg/Svg";
import { VERSION } from "lib/env";
import React from "react";
import { darkColors } from "theme";
import darkTheme from "theme/dark";
import type { Colors } from "theme/types";

import type { SvgProps } from "../types";

const VersionBadge: React.FC<{ color: keyof Colors }> = ({ color }) =>
  // prettier-ignore
  <Badge color={color}>
    {VERSION?.prerelease.at(0)?.toString().toUpperCase()}
    {VERSION?.prerelease.at(0) && <>&nbsp;</>}
    v
    {VERSION?.major}.{VERSION?.minor}.{VERSION?.patch}
  </Badge>;

const Icon: React.FC<SvgProps & { versionBadge?: boolean }> = ({
  color = "econiaBlue",
  versionBadge = false,
  ...props
}) => {
  return (
    <div className="flex justify-center flex-wrap gap-[.7rem]">
      <Svg viewBox="0 0 1514 104" {...props} color="transparent">
        <path
          d="M830.4 15.2996V0.599609H757V15.2996H742.3V88.7996H757V103.5H830.5V88.7996H845.2V15.2996H830.4ZM762.3 18.2996H777.5V33.4996H762.3V18.2996ZM825.2 73.7996H813.3V85.6996H774.3V73.7996H762.4V46.6996H777.6V70.4996H810V46.9996H825.2V73.7996ZM825.2 33.4996H810V18.2996H825.2V33.4996Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M0.700012 103.4V0.599609H103.5V15.2996H30.1V44.6996H88.8V59.3996H30.1V88.7996H103.5V103.5H0.700012V103.4Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M126.8 103.4V0.599609H156.2V15.2996H170.9V29.9996H185.6V15.2996H200.3V0.599609H229.7V103.4H200.3V44.5996H185.6V73.9996H170.9V44.5996H156.2V103.3H126.8V103.4Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M393.6 103.4V88.6996H378.9V73.9996H408.3V88.6996H452.4V0.599609H481.8V88.6996H467V103.4H393.6Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M504.9 103.4V88.6996H534.3V15.2996H504.9V0.599609H593V15.2996H563.6V88.6996H593V103.4H504.9Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M645.6 103.4V88.6996H631V73.9996H616.3V29.9996H631V15.2996H645.7V0.599609H704.4V15.2996H719.1V29.9996H689.7V15.2996H660.3V29.9996H645.6V73.9996H660.3V88.6996H689.7V73.9996H719.1V88.6996H704.4V103.4H645.6Z"
          fill={darkColors[color]}
        />
        <path
          d="M868.4 103.4V88.6996H897.8V15.2996H868.4V0.599609H956.5V15.2996H927.1V88.6996H956.5V103.4H868.4Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M979.7 103.4V0.599609H1009.1V15.2996H1023.8V29.9996H1038.5V44.6996H1053.2V0.599609H1082.6V103.4H1053.2V73.9996H1038.5V59.2996H1023.8V44.5996H1009.1V103.3H979.7V103.4Z"
          fill={darkTheme.colors[color]}
        />
        <path d="M1105.8 103.4V74H1135.2V103.4H1105.8Z" fill="#086CD9" />
        <path
          d="M1158.4 103.4V0.599609H1261.2V15.2996H1187.8V44.6996H1246.5V59.3996H1187.8V103.5H1158.4V103.4Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M1299.1 103.4V88.6996H1284.4V0.599609H1313.8V88.6996H1357.9V0.599609H1387.3V88.6996H1372.6V103.4H1299.1Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M1410.5 103.4V0.599609H1439.9V15.2996H1454.6V29.9996H1469.3V44.6996H1484V0.599609H1513.4V103.4H1484V73.9996H1469.3V59.2996H1454.6V44.5996H1439.9V103.3H1410.5V103.4Z"
          fill={darkTheme.colors[color]}
        />
        <path
          d="M340.9 15.2996V0.599609H267.4V15.2996H252.7V88.7996H267.4V103.5H340.9V88.7996H355.6V15.2996H340.9ZM272.8 18.2996H288V33.4996H272.8V18.2996ZM335.6 73.7996H323.7V85.6996H284.7V73.7996H272.8V46.6996H288V70.4996H320.4V46.9996H335.6V73.7996ZM335.6 33.4996H320.4V18.2996H335.6V33.4996Z"
          fill={darkTheme.colors[color]}
        />
      </Svg>
      {versionBadge ? <VersionBadge color={color} /> : <></>}
    </div>
  );
};

export default Icon;
