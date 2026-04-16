import chalk from "chalk";
import type { ConvictionLabel, SignalStrength } from "./types.js";

export function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.hex("#FFA500");
  return chalk.red;
}

export function convictionColor(label: ConvictionLabel): (text: string) => string {
  switch (label) {
    case "HIGH":
      return chalk.green;
    case "MODERATE":
      return chalk.yellow;
    case "LOW":
      return chalk.hex("#FFA500");
    case "AVOID":
      return chalk.red;
  }
}

export function signalColor(strength: SignalStrength): (text: string) => string {
  switch (strength) {
    case "VERY_STRONG":
      return chalk.green.bold;
    case "STRONG":
      return chalk.green;
    case "MEDIUM":
      return chalk.yellow;
    case "WEAK":
      return chalk.dim;
  }
}

export function gradeColor(grade: string): (text: string) => string {
  if (grade.startsWith("A")) return chalk.green;
  if (grade.startsWith("B")) return chalk.yellow;
  if (grade.startsWith("C")) return chalk.hex("#FFA500");
  return chalk.red;
}

export const brand = {
  header: (text: string) => chalk.bold.cyan(text),
  footer: `${chalk.dim("built by @LWARTSS")}                      ${chalk.dim("powered by GMGN OpenAPI")}`,
  error: (text: string) => chalk.red.bold(`[ERROR] ${text}`),
  warn: (text: string) => chalk.yellow(`[WARN] ${text}`),
  info: (text: string) => chalk.blue(`[INFO] ${text}`),
};
