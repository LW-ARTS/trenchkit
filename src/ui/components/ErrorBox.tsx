import { Box, Text } from "ink";
import type React from "react";

export type ErrorBoxProps = {
  message: string;
};

const MAX_MSG_LENGTH = 120;

export function ErrorBox({ message }: ErrorBoxProps): React.ReactElement {
  const truncated =
    message.length > MAX_MSG_LENGTH ? `${message.slice(0, MAX_MSG_LENGTH - 1)}…` : message;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red">⚠ panel unavailable</Text>
      <Text color="gray">{truncated}</Text>
    </Box>
  );
}
