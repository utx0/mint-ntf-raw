#!/usr/bin/bash
cargo build-bpf --manifest-path=./mint/Cargo.toml --bpf-out-dir=./dist/programs
solana program deploy ./dist/programs/mint.so 


