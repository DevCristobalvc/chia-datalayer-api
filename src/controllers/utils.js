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


router.post('/get-keypairs', async (req, res) => {

    const mnemonic = req.body.mnemonic;

    const isValid = bip39.validateMnemonic(mnemonic);

    if (isValid === true) {

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const node = bip32.fromSeed(seed);

    let path, privateKey, publicKey;

    // Generar claves para EVM
    path = `m/44'/60'/0'/0/0`;
    privateKey = node.derivePath(path).privateKey.toString('hex');
    publicKey = new ethers.Wallet(privateKey).address;
    const evmKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };

    // Generar claves para Tron
    path = `m/44'/195'/0'/0/0`;
    privateKey = node.derivePath(path).privateKey.toString('hex');
    publicKey = await TronWeb.address.fromPrivateKey(privateKey);
    const tronKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };

    //Generar claves para Solana
    path = `m/44'/501'/0'/0'`;
    const keypair = web3sol.Keypair.fromSeed(ed25519.derivePath(path, seed.toString("hex")).key);
    privateKey = bs58.encode(keypair.secretKey);
    publicKey = keypair.publicKey.toString();
    const solanaKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };


    res.json({
        // 'mnemonic':mnemonic,
        'evm_keypair': evmKeyPair,
        'tron_keypair': tronKeyPair,
        'solana_keypair': solanaKeyPair
        // 'bitcoin_keypair': bitcoinKeyPairObject
    });

}else {
    res.json({
        'error': 'La frase de recuperacion es invalida'})
}

});


//generar mnemonic y llaves para TRON, SOLANA y EVMs
router.get('/generate-keypair', async (req, res) => {
    const mnemonic = bip39.generateMnemonic();

    const seed = await bip39.mnemonicToSeed(mnemonic);
    const node = bip32.fromSeed(seed);

    let path, privateKey, publicKey;

    // Generar claves para EVM
    path = `m/44'/60'/0'/0/0`;
    privateKey = node.derivePath(path).privateKey.toString('hex');
    publicKey = new ethers.Wallet(privateKey).address;
    const evmKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };

    // Generar claves para Tron
    path = `m/44'/195'/0'/0/0`;
    privateKey = node.derivePath(path).privateKey.toString('hex');
    publicKey = await TronWeb.address.fromPrivateKey(privateKey);
    const tronKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };

    //Generar claves para Solana
    path = `m/44'/501'/0'/0'`;
    const keypair = web3sol.Keypair.fromSeed(ed25519.derivePath(path, seed.toString("hex")).key);
    privateKey = bs58.encode(keypair.secretKey);
    publicKey = keypair.publicKey.toString();
    const solanaKeyPair = {
        'public_key': publicKey,
        'private_key': privateKey
    };

    //Generar claves para Bitcoin
    // Generar un par de claves público-privado aleatorio
    // const keyPair = bitcoin.ECPair.makeRandom();
        
    // // Obtener la dirección de Bitcoin desde la clave pública
    // const address = keyPair.getAddress();
    
    // // Obtener la clave privada de Bitcoin en formato WIF (Wallet Import Format)
    // const privateKeyWIF = keyPair.toWIF();
    // const bitcoinKeyPairObject = {
    //     'public_key': address,
    //     'private_key': privateKeyWIF
    // };

    res.json({
        'mnemonic':mnemonic,
        'evm_keypair': evmKeyPair,
        'tron_keypair': tronKeyPair,
        'solana_keypair': solanaKeyPair
        // 'bitcoin_keypair': bitcoinKeyPairObject
    });
});


// Obtener Mnemonic
router.get('/get-mnemonic', (req, res) => {
    try {
        const mnemonic = bip39.generateMnemonic()
        res.json({"mnemonic":mnemonic});
    }  catch (error) {
        console.error('Error al obtener las 12 palabras:', error);
        res.status(500).json({ error: 'Error al obtener las 12 palabras.' });
    }
})





//exportando modulo
module.exports = router;