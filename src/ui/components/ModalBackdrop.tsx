import { Box } from "ink";
import type React from "react";

export type ModalBackdropProps = {
  children: React.ReactNode;
};

/**
 * Centered modal container (D-09): double-border cyan, fixed 60-col width that
 * fits inside the 100-col minimum enforced by TooSmallFallback. Backdrop dimming
 * of the grid is handled by the App composer, not this component.
 */
export function ModalBackdrop({ children }: ModalBackdropProps): React.ReactElement {
  return (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      alignSelf="center"
      width={60}
    >
      {children}
    </Box>
  );
}
