import { Text, useInput } from "ink";
import { useState } from "react";

export function SmokeApp() {
  const [count, setCount] = useState(0);
  useInput((input) => {
    if (input === "a") setCount((c) => c + 1);
  });
  return <Text>Hello, count: {count}</Text>;
}
