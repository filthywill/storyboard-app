import { getShotTextSpacing } from '@/styles/storyboardTheme';

const SHOT_CARD_VERTICAL_PADDING_PX = 16;
const SHOT_TEXT_GROUP_TOP_MARGIN_PX = 4;

interface EmptySlotTextHeightInput {
  showActionText: boolean;
  showScriptText: boolean;
  actionTextFontSize: number;
  scriptTextFontSize: number;
}

const getMinimumTextFieldHeight = (fontSize: number): number => {
  const spacing = getShotTextSpacing(fontSize);
  return (spacing.fontSize * spacing.lineHeight) + (spacing.blockPaddingY * 2);
};

/**
 * Matches the non-image vertical space used by an empty, populated ShotCard:
 * p-2 card padding, an optional mt-1 text group margin, and one empty line per
 * visible action/script field.
 */
export const getMinimumShotCardNonImageHeight = ({
  showActionText,
  showScriptText,
  actionTextFontSize,
  scriptTextFontSize,
}: EmptySlotTextHeightInput): number => {
  const hasVisibleText = showActionText || showScriptText;

  return SHOT_CARD_VERTICAL_PADDING_PX
    + (hasVisibleText ? SHOT_TEXT_GROUP_TOP_MARGIN_PX : 0)
    + (showActionText ? getMinimumTextFieldHeight(actionTextFontSize) : 0)
    + (showScriptText ? getMinimumTextFieldHeight(scriptTextFontSize) : 0);
};
