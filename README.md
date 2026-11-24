# Tiny Stack VM

A tiny stack virtual machine for make.fun's
[Build a tiny stack virtual machine, 22 November 2026](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
bounty ($100 in USDC).

`main.ts` runs every instance of a drawn set: for each program in
`MAKEFUN_INPUT_DIR/<id>/` it executes the bytecode of make.fun's tiny
stack ISA (`program.bin` on `input.bin`) and writes the bytes it prints
to `MAKEFUN_OUTPUT_DIR/<id>/stdout.bin` and its exit code to
`MAKEFUN_OUTPUT_DIR/<id>/exit.txt`. 32-bit wrapping integers, a 256-value
stack, 64-deep calls, 256 words of memory, and the ISA's ten traps.

Local run on the practice set:

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=<kit>/practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun's "Build a tiny stack virtual machine, 22 November 2026" bounty, $100 in USDC.
