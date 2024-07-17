var express = require('express');
var router = express.Router();

const TronWeb = require('tronweb');

const bip39 = require('bip39');

const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)

const web3sol = require("@solana/web3.js");
// (async () => {
//   const solana = new web3.Connection("https://flashy-blue-reel.solana-mainnet.quiknode.pro/c2e829af6a866905a19c02a601dc50aee1573a5d/");
//   console.log(await solana.getSlot());
// })();
const ed25519 = require("ed25519-hd-key");
const bs58 = require('bs58');
const ethers = require('ethers');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const crypto = require('crypto');
const LAMPORTS_PER_SOL = web3sol.LAMPORTS_PER_SOL
const endpoint = process.env.QN_ENDPOINT_URL
const feepayer = process.env.FEE_PAYER
const SPL = require("@solana/spl-token");
const { Metaplex , keypairIdentity } = require("@metaplex-foundation/js");
const { TokenStandard } = require ("@metaplex-foundation/mpl-token-metadata");




const { findAssociatedTokenAddress, getTokenLamports } = require('../helpers/index');
const bitcoin = require('bitcoinjs-lib');

 // Enviar NFT
 router.post('/transfer-nft-solana', async (req, res) => {
    const payer = web3sol.Keypair.fromSecretKey(bs58.decode(req.body.secretKey));
    const receiver = new web3sol.PublicKey(req.body.toPublicKey);
    const amount = 1;//
    const mint = req.body.mint;
    const fee_payer = web3sol.Keypair.fromSecretKey(bs58.decode(feepayer));

    const connection = new web3sol.Connection(endpoint, "confirmed")

    const mintAddress = new web3sol.PublicKey(mint)

    try {
    
        const transactionLamports = await getTokenLamports(mint)
    
        const fromTokenAccount = await SPL.getOrCreateAssociatedTokenAccount(
            connection,
            fee_payer,
            mintAddress,
            payer.publicKey
        )
    
        const toTokenAccount = await SPL.getOrCreateAssociatedTokenAccount(
            connection,
            fee_payer,
            mintAddress,
            receiver
        )
            
        const transactionSignature = await SPL.transfer(
            connection,
            fee_payer,
            fromTokenAccount.address,
            toTokenAccount.address,
            payer.publicKey,
            amount * transactionLamports,
            [fee_payer, payer]
        )
        
        res.json({
            'transfer_transaction': `https://explorer.solana.com/tx/${transactionSignature}?cluster=mainnet-beta`
        })
    } catch (error) {
        res.send(error.message)
    }
})


//Send SPL token
router.post('/send-spl-token', async (req, res) => {
    const payer = web3sol.Keypair.fromSecretKey(bs58.decode(req.body.secretKey));
    const receiver = new web3sol.PublicKey(req.body.toPublicKey);
    const amount = req.body.amount;
    const mint = req.body.mint;
    const fee_payer = web3sol.Keypair.fromSecretKey(bs58.decode(feepayer));

    const connection = new web3sol.Connection(endpoint, "confirmed")

    const mintAddress = new web3sol.PublicKey(mint)

    try {
    
        const transactionLamports = await getTokenLamports(mint)
    
        const fromTokenAccount = await SPL.getOrCreateAssociatedTokenAccount(
            connection,
            fee_payer,
            mintAddress,
            payer.publicKey
        )
    
        const toTokenAccount = await SPL.getOrCreateAssociatedTokenAccount(
            connection,
            fee_payer,
            mintAddress,
            receiver
        )
            
        const transactionSignature = await SPL.transfer(
            connection,
            fee_payer,
            fromTokenAccount.address,
            toTokenAccount.address,
            payer.publicKey,
            amount * transactionLamports,
            [fee_payer, payer]
        )
        
        res.json({
            'transfer_transaction': `https://explorer.solana.com/tx/${transactionSignature}?cluster=mainnet-beta`
        })
    } catch (error) {
        res.send(error.message)
    }
})


// Obtener Balance de SPL Token
router.get('/get-balance-spl/:publicKey/:splToken', async (req, res) => {
    const { publicKey, splToken } = req.params;
    const connection = new web3sol.Connection(endpoint)
    const account = await findAssociatedTokenAddress(new web3sol.PublicKey(publicKey), new web3sol.PublicKey(splToken))
    try {
        const balance = await connection.getTokenAccountBalance(new web3sol.PublicKey(account.toString()))
        res.json({
            'balance': balance.value.uiAmount
        })
    } catch (e) {
        res.json({
            'balance': 0
        })
    }
})


//ESTA FALLANDO EL ENDPOINT EN EL SERVER
// Obtener NFTs con llave Publica
router.get('/get-solana-nft/:pubKey', async (req,res) => {
    try {
        const { pubKey } = req.params;

        const nfts = []
    
        const connection = new web3sol.Connection(endpoint);
        const wallet = new web3sol.PublicKey(pubKey)
    
        const metaplex = new Metaplex(connection);
        const myNfts = await metaplex.nfts().findAllByOwner({
            owner: wallet
        });
    
        for (let i = 0; i < myNfts.length; i++) {
            let fetchResult = await fetch(myNfts[i].uri)
            let json = await fetchResult.json()
            nfts.push(json)
        }
    
        res.json(nfts)
    } catch (error) {
        res.json({
            "error": error
        })
    }
})

// Obtener Balance de SOL con llave Publica
router.get('/get-solana-balance/:publicKey', async (req, res) => {
    const { publicKey } = req.params;
    const connection = new web3sol.Connection(endpoint)
    // const sendAir = await connection.requestAirdrop(new web3sol.PublicKey(publicKey),1000000);
    const lamports = await connection.getBalance(new web3sol.PublicKey(publicKey)).catch((err) => {
        console.log(err);
    })
    
    const sol = lamports / LAMPORTS_PER_SOL
    res.json({
        'balance': sol,
    })
})


//Enviar SOL con la secret key 
router.post('/send-sol/', async (req, res) => {
    const secretKey = req.body.secretKey;
    const toPublicKey = req.body.toPublicKey;
    const amount = req.body.amount;
    const fee_payer = web3sol.Keypair.fromSecretKey(bs58.decode(feepayer));

    try {
        const toPubKey = new web3sol.PublicKey(toPublicKey)
        const connection = new web3sol.Connection(endpoint, "confirmed")

        //create Keypair
        const keypair = web3sol.Keypair.fromSecretKey(
            bs58.decode(secretKey)
        );   
          
        const transferTransaction = new web3sol.Transaction()
        .add(web3sol.SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: toPubKey,
            lamports: amount * LAMPORTS_PER_SOL 
        }))
    
        var signature = await web3sol.sendAndConfirmTransaction(
            connection, 
            transferTransaction, 
            [fee_payer, keypair]).catch((err) => {
            res.send(err.message)
        })
        res.json({
            'transfer_transaction': `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`
        })
    } catch (error) {
        res.json({
            'error': error
        })
    }

})








//exportando modulo
module.exports = router;