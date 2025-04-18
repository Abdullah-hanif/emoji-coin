import { useEmojiFontConfig } from "lib/hooks/use-emoji-font-family";
import { cn } from "lib/utils/class-name";
import { type DetailedHTMLProps, type HTMLAttributes, useMemo } from "react";
import type { CSSProperties } from "styled-components";

import { type AnyEmojiData, getEmojisInString } from "@/sdk/index";

/**
 * Displays emoji as a simple span element containing text representing one or more emojis.
 *
 * It uses the emoji font determined by @see {@link useEmojiFontConfig}.
 */
export const Emoji = ({
  emojis,
  ...props
}: Omit<DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>, "children"> & {
  emojis: AnyEmojiData[] | string;
}) => {
  const { emojiFontClassName } = useEmojiFontConfig();

  const data = useMemo(
    () =>
      typeof emojis === "string"
        ? getEmojisInString(emojis).join("")
        : emojis.map((e) => e.emoji).join(""),
    [emojis]
  );

  return (
    // Wrap this in div so that any font families from tailwind utility classes don't clash with the emoji font class
    // name. This means it's not necessary to manually change each usage of font utility classes in the codebase, and
    // instead just let the font size / line height cascade downwards but override the font family with the emoji font.
    <span className={props.className}>
      <span
        {...props}
        className={emojiFontClassName}
        style={{ fontVariantEmoji: "emoji", display: "inline", ...props.style }}
      >
        {data}
      </span>
    </span>
  );
};

declare global {
  /* eslint-disable-next-line @typescript-eslint/no-namespace */
  namespace JSX {
    interface IntrinsicElements {
      "em-emoji": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: string;
        native?: string;
        key?: string;
        set?: string;
      };
    }
  }
}

/**
 * Renders an emoji as an image using a CDN from the emoji picker library.
 * This facilitates specifying the emoji set (native, Apple, Windows, etc) and size, but will take longer to load in
 * multiple ways, since it's loading an image instead of rendering emojis as text.
 */
export const EmojiAsImage = ({
  emojis,
  set = undefined,
  size = "1em",
  ...props
}: Omit<DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>, "children"> & {
  emojis: AnyEmojiData[] | string;
  set?: string;
  size?: string;
}) => {
  let data: React.ReactNode[] = [];
  if (typeof emojis === "string") {
    const emojisInString = getEmojisInString(emojis);
    data = emojisInString.map((e, i) => (
      <em-emoji key={`${emojisInString[i]}-${i}`} size={size} native={e} set={set}></em-emoji>
    ));
  } else {
    data = emojis.map((e, i) => (
      <em-emoji key={`${emojis[i].emoji}-${i}`} size={size} native={e.emoji}></em-emoji>
    ));
  }
  return <span {...props}>{data}</span>;
};

export const GlowingEmoji = ({
  emojis,
  className,
  onClick,
  style,
}: {
  emojis: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) => {
  const isSingleEmoji = useMemo(() => getEmojisInString(emojis).length === 1, [emojis]);
  return (
    <div className={cn("group relative z-[0]", onClick && "cursor-pointer")} onClick={onClick}>
      <div className={"absolute z-[-1] blur-lg"}>
        <Emoji className={className} emojis={emojis} style={style} />
      </div>
      {/* For the hover effect */}
      {onClick && (
        <div
          className={cn(
            "absolute z-[-1] blur-lg group-hover:saturate-[5] group-hover:scale-[2.2] transition-[transform,opacity] duration-75 pointer-events-none opacity-0 group-hover:opacity-100",
            !isSingleEmoji && "tracking-[-25px]"
          )}
        >
          <Emoji className={className} emojis={emojis} style={style} />
        </div>
      )}
      <Emoji className={className} emojis={emojis} style={style} />
    </div>
  );
};
