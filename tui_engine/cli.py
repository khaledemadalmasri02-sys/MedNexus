#!/usr/bin/env python3
"""TUI Layout Engine CLI - Render styled terminal output from structured text."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console

from tui_engine import STYLES


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tui-engine",
        description="TUI Layout Engine - Convert structured text into styled terminal output",
    )
    parser.add_argument(
        "input",
        nargs="?",
        default=None,
        help="Path to input text file (omit or use '-' for stdin)",
    )
    parser.add_argument(
        "-s",
        "--style",
        choices=list(STYLES.keys()),
        default="modern",
        help="Visual style schema (default: modern)",
    )
    parser.add_argument(
        "-l",
        "--list-styles",
        action="store_true",
        help="List available styles and exit",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Render demo content in the selected style",
    )
    return parser


DEMO_CONTENT = """# Cardiovascular System

The cardiovascular system is responsible for transporting oxygen, nutrients, hormones, and waste products throughout the body. It consists of the heart, blood vessels, and blood.

## Key Components

- The heart is a muscular organ that pumps blood through the circulatory system
- Arteries carry oxygenated blood away from the heart to tissues
- Veins return deoxygenated blood back to the heart
- Capillaries facilitate gas and nutrient exchange at the tissue level

## Cardiac Cycle Phases

| Phase | Duration | Pressure (mmHg) | Key Event |
|-------|----------|-----------------|-----------|
| Atrial Systole | 0.1s | 5-10 | Atria contract, fill ventricles |
| Ventricular Systole | 0.3s | 120 | Ventricles contract, eject blood |
| Diastole | 0.4s | 80 | Heart relaxes, chambers refill |

## Clinical Significance

Understanding the cardiac cycle is essential for interpreting ECG readings, diagnosing arrhythmias, and managing heart failure. The timing and pressure changes directly correlate with the heart sounds heard during auscultation.
"""


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list_styles:
        console = Console()
        console.print("Available styles:", style="bold")
        for name in STYLES:
            console.print(f"  - {name}")
        return 0

    if args.demo:
        raw_text = DEMO_CONTENT
    elif args.input and args.input != "-":
        path = Path(args.input)
        if not path.exists():
            print(f"Error: file not found: {path}", file=sys.stderr)
            return 1
        raw_text = path.read_text(encoding="utf-8")
    else:
        if sys.stdin.isatty():
            print("Reading from stdin (Ctrl+D to finish)...", file=sys.stderr)
        raw_text = sys.stdin.read()

    if not raw_text.strip():
        print("Error: no input content provided", file=sys.stderr)
        return 1

    style_cls = STYLES[args.style]
    console = Console()
    engine = style_cls(console=console)
    group = engine.render(raw_text)
    console.print(group)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
