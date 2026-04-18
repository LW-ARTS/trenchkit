import { Box, Text } from "ink";
import type React from "react";

export const ATTRIBUTION = "built by @LWARTSS | powered by GMGN OpenAPI";

export function Footer(): React.ReactElement {
  return (
    <Box paddingX={1}>
      <Text dimColor>{ATTRIBUTION}</Text>
    </Box>
  );
}
