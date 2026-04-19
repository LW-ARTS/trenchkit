import { Box, Text } from "ink";
import type React from "react";

export const ATTRIBUTION = "built by @LWARTSS | powered by GMGN OpenAPI";

export function Footer(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>
        <Text color="cyan">S</Text>
        <Text dimColor>can </Text>
        <Text color="cyan">W</Text>
        <Text dimColor>allet </Text>
        <Text color="cyan">R</Text>
        <Text dimColor>esearch </Text>
        <Text color="cyan">T</Text>
        <Text dimColor>rade </Text>
        <Text color="cyan">Tab</Text>
        <Text dimColor> focus </Text>
        <Text color="cyan">↑↓←→</Text>
        <Text dimColor> nav </Text>
        <Text color="cyan">Enter</Text>
        <Text dimColor> drill-down </Text>
        <Text color="cyan">Q</Text>
        <Text dimColor>uit</Text>
      </Text>
      <Text dimColor>{ATTRIBUTION}</Text>
    </Box>
  );
}
