import * as BufferLayout from '@solana/buffer-layout';
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
    sendAndConfirmRawTransaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    createKeypairFromFile
} from "./utils";
import fs from 'mz/fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';

const CONFIG_FILE_PATH = path.resolve(
    os.homedir(),
    '.config',
    'solana',
    'cli',
    'config.yml',
);

async function main() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('Successfully connected to the solana devnet');

    const configYml = await fs.readFile(CONFIG_FILE_PATH, {encoding: 'utf8'});
    const keypairPath = await yaml.parse(configYml).keypair_path;
    const wallet = await createKeypairFromFile(keypairPath);
    console.log("Local account loaded successfully");

    const programKeypair = await createKeypairFromFile(
        path.join(
            path.resolve(__dirname, './dist/program'),
            'mint-keypair.json'
        )
    );

    const programId = programKeypair.publicKey;
    console.log(`Program ID: ${programId.toBase58()}`);

    // Derive the mint address and the
    const mintKeypair: Keypair = Keypair.generate();
    const tokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey,
    );

    console.log(`New token: ${mintKeypair.publicKey}`);

    // Transact with our program

    const instruction = new TransactionInstruction({
        keys: [
            // Mint account
            {
                pubkey: mintKeypair.publicKey,
                isSigner: true,
                isWritable: true,
            },
            // Token account
            {
                pubkey: tokenAddress,
                isSigner: false,
                isWritable: true,
            },
            // Mint Authority
            {
                pubkey: wallet.publicKey,
                isSigner: true,
                isWritable: false,
            },
            // Rent account
            {
                pubkey: SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
            // System Program
            {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
            },
            // Token Program
            {
                pubkey: TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
            },
            // Associated token program
            {
                pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
            },
        ],
        programId: programId,
        data: Buffer.alloc(0),
    });

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [wallet, mintKeypair]
    )
}

main().then(
    () => process.exit(),
    err => {
        console.log(err);
        process.exit(1);
    }
)