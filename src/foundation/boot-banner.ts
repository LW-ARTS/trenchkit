import chalk from "chalk";

const BANNER_LINES = [
  "$$$$$$$$\\ $$$$$$$\\  $$$$$$$$\\ $$\\   $$\\  $$$$$$\\  $$\\   $$\\ $$\\   $$\\ $$$$$$\\ $$$$$$$$\\ ",
  "\\__$$  __|$$  __$$\\ $$  _____|$$$\\  $$ |$$  __$$\\ $$ |  $$ |$$ | $$  |\\_$$  _|\\__$$  __|",
  "   $$ |   $$ |  $$ |$$ |      $$$$\\ $$ |$$ /  \\__|$$ |  $$ |$$ |$$  /   $$ |     $$ |   ",
  "   $$ |   $$$$$$$  |$$$$$\\    $$ $$\\$$ |$$ |      $$$$$$$$ |$$$$$  /    $$ |     $$ |   ",
  "   $$ |   $$  __$$< $$  __|   $$ \\$$$$ |$$ |      $$  __$$ |$$  $$<     $$ |     $$ |   ",
  "   $$ |   $$ |  $$ |$$ |      $$ |\\$$$ |$$ |  $$\\ $$ |  $$ |$$ |\\$$\\    $$ |     $$ |   ",
  "   $$ |   $$ |  $$ |$$$$$$$$\\ $$ | \\$$ |\\$$$$$$  |$$ |  $$ |$$ | \\$$\\ $$$$$$\\    $$ |   ",
  "   \\__|   \\__|  \\__|\\________|\\__|  \\__| \\______/ \\__|  \\__|\\__|  \\__|\\______|   \\__|   ",
];

const TAGLINE = "  real-time crypto intelligence · powered by GMGN OpenAPI";

export function renderBootBanner(): string {
  const body = BANNER_LINES.map((line) => chalk.cyanBright(line)).join("\n");
  return `\n${body}\n${chalk.dim(TAGLINE)}\n`;
}

export async function showBootBanner(holdMs = 1200): Promise<void> {
  process.stdout.write(renderBootBanner());
  await new Promise<void>((r) => {
    setTimeout(r, holdMs);
  });
}
