var express = require('express');
var router = express.Router();

const TronWeb = require('tronweb');
const bip39 = require('bip39');

const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
const bip32 = BIP32Factory(ecc)
const { derivePath } = require('ed25519-hd-key');
//const ed25519 = require("ed25519-hd-key");
const bs58 = require('bs58');
const ethers = require('ethers');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL,sendAndConfirmTransaction } = require('@solana/web3.js');
//const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
//const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
//const { Token, TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, transfer } = require("@solana/spl-token");
//TODO: ------------------Organizar metodos que no son del API de Tron en otra ruta----------------
const endpoint = process.env.QN_ENDPOINT_URL;
const testnetUrl = 'https://nile.trongrid.io'; // Puedes cambiar esto con la URL de la red de pruebas que desees

const feepayer = process.env.FEE_PAYER

const { findAssociatedTokenAddress, getTokenLamports } = require('../helpers/index')
const SPL = require("@solana/spl-token");

let useMainnet = false; // Cambiar a false para usar la red de pruebas

function getFullHostUrl() {
  return useMainnet ? 'https://api.trongrid.io/' : testnetUrl;
}

//Conexion con el cluster de tron 
const tronWeb = new TronWeb({
    fullHost : getFullHostUrl(),
    solidityNode: getFullHostUrl() 
  });

//--------------------------------------------------------SOLANA TEST----------------------------------------------------//


// Obtener Balance de SPL Token
router.get('/get-balance-spl/:publicKey/:splToken', async (req, res) => {
    const { publicKey, splToken } = req.params;
    const connection = new Connection(endpoint)
    const account = await findAssociatedTokenAddress(new PublicKey(publicKey), new PublicKey(splToken))
    try {
        const balance = await connection.getTokenAccountBalance(new PublicKey(account.toString()))
        res.json({
            'balance': balance.value.uiAmount
        })
    } catch (e) {
        res.json({
            'balance': e
        })
    }
})

//enviar spl tokens solana
  // Enviar SPL Tokens, el que sea ;)
router.post('/send-spl-token', async (req, res) => {
    const payer = Keypair.fromSecretKey(bs58.decode(req.body.secretKey));
    const receiver = new PublicKey(req.body.toPublicKey);
    const amount = req.body.amount;
    const mint = req.body.mint;
    const fee_payer = Keypair.fromSecretKey(bs58.decode(feepayer));

    const connection = new Connection(endpoint, "confirmed")

    const mintAddress = new PublicKey(mint)

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

//send solana balance
router.post('/send-sol/', async (req, res) => {
    const { secretKey, toPublicKey, amount } = req.body;
    const endpoint = "https://api.mainnet-beta.solana.com"; // Define el endpoint de conexión

    try {
        const toPubKey = new PublicKey(toPublicKey);
        const connection = new Connection(endpoint, "confirmed");
        
        // Crea el keypair a partir de la clave secreta
        const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));

        // Crea la transacción de transferencia
        const transferTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: toPubKey,
                lamports: amount * LAMPORTS_PER_SOL
            })
        );

        // Firma y envía la transacción
        var signature = await sendAndConfirmTransaction(
            connection, 
            transferTransaction, 
            [keypair] // Usa el mismo keypair como pagador de tarifas
        );

        res.json({
            'transfer_transaction': `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ 'error': error.message });
    }
});


//get connection
const connection = new Connection("https://api.mainnet-beta.solana.com");
//get solana balance
router.get('/get-solana-balance/:publicKey', async (req, res) => {
    try {
        const publicKeyString = req.params.publicKey;
        const publicKey = new PublicKey(publicKeyString);
        const balance = await connection.getBalance(publicKey);

        res.send({ balance: balance });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener el balance');
    }
});



//EVMs keypair
router.post('/evm-keypair', async (req, res) => {
    const mnemonic = req.body.mnemonic;
    const isValid = bip39.validateMnemonic(mnemonic);

    if (isValid === true) {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = bip32.fromSeed(seed);
        const child = node.derivePath(`m/44'/60'/0'/0/0`);
        const privateKey = child.privateKey.toString('hex');
        const address = new ethers.Wallet(privateKey);;
        res.json({
            'public_key': address,
            'private_key': privateKey
        })
    } else {
        res.json({
            'error': 'La frase de recuperacion es invalida'})
    }
});


//Tron keypair
router.post('/keypair', async (req, res) => {
    const mnemonic = req.body.mnemonic;

    const isValid = bip39.validateMnemonic(mnemonic);

    if (isValid === true) {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = bip32.fromSeed(seed);
        const child = node.derivePath(`m/44'/195'/0'/0/0`);
        const privateKey = child.privateKey.toString('hex');
        const address = await TronWeb.address.fromPrivateKey(privateKey);
        res.json({
            'public_key': address,
            'private_key': privateKey
        })
    } else {
        res.json({
            'error': 'La frase de recuperacion es invalida'})
    }
})

//Solana Keypair
router.post('/keypair-solana', (req, res) => {
    const mnemonic = req.body.mnemonic;
    const isValid = bip39.validateMnemonic(mnemonic);
    if (isValid === true) {
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const path = `m/44'/501'/0'/0'`;
        const derivedSeed = derivePath(path, seed.toString("hex")).key;
        const keypair = Keypair.fromSeed(derivedSeed.slice(0, 32)); // Utiliza solo los primeros 32 bytes de la semilla derivada
        const secretKey = bs58.encode(keypair.secretKey);

        res.json({
            'public_key': keypair.publicKey.toString(),
            'secret_key': secretKey
        });
    } else {
        res.json({
            'error': "La frase de recuperación es inválida"
        });
    }
});



  //--------------TODO: transfreFrom function -----------------////////////////////////
  //TRC 721 ABI
  const abi721 = [
    {
      "inputs": [
        {"name": "name", "type": "string"},
        {"name": "symbol", "type": "string"},
        {"name": "baseTokenURI", "type": "string"},
        {"name": "preMint", "type": "uint256"}
      ],
      "stateMutability": "Nonpayable",
      "type": "Constructor"
    },
    {
      "outputs": [{"type": "string"}],
      "name": "name",
      "stateMutability": "View",
      "type": "Function"
    },
    {
      "outputs": [{"type": "string"}],
      "inputs": [{"name": "tokenId", "type": "uint256"}],
      "name": "tokenURI",
      "stateMutability": "View",
      "type": "Function"
    }
  ];
  
router.get('/nft-info/:contractAddress/:tokenId/:ownerAddress', async (req, res) => {
    try {
        const { contractAddress,tokenId, ownerAddress } = req.params;

        // Crea una instancia del contrato ERC721
        const tronWeb = new TronWeb({
            fullHost: getFullHostUrl(),
            solidityNode: getFullHostUrl(),
            privateKey: null, // Puedes dejarlo como null si no necesitas una clave privada
        });

        // Establece la dirección del propietario
        tronWeb.setAddress(ownerAddress);

        const instance = await tronWeb.contract(abi721, contractAddress);

        // Llama a las funciones del contrato para obtener información
        const nftName = await instance.name().call();
        //const symbol = await instance.symbol().call();
        const nftImage = await instance.tokenURI(0).call();
        // Puedes agregar más llamadas aquí para obtener más información del contrato ERC721

        res.json({
            'name': nftName,
            //'id': nftId,
            'image': nftImage,
            //'symbol':symbol,
            // Agrega más campos según sea necesario
        });
    } catch (error) {
        console.error('Error al obtener información del NFT ERC721:', error);
        res.status(500).json({ error: 'Error al obtener información del NFT ERC721.' });
    }
});


//TRC20 functions 
const abiTrc20 = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_upgradedAddress","type":"address"}],"name":"deprecate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"deprecated","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_evilUser","type":"address"}],"name":"addBlackList","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"upgradedAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"maximumFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_maker","type":"address"}],"name":"getBlackListStatus","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_subtractedValue","type":"uint256"}],"name":"decreaseApproval","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_value","type":"uint256"}],"name":"calcFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"who","type":"address"}],"name":"oldBalanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newBasisPoints","type":"uint256"},{"name":"newMaxFee","type":"uint256"}],"name":"setParams","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"issue","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_addedValue","type":"uint256"}],"name":"increaseApproval","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"redeem","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"basisPointsRate","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"isBlackListed","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_clearedUser","type":"address"}],"name":"removeBlackList","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"MAX_UINT","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_blackListedUser","type":"address"}],"name":"destroyBlackFunds","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_initialSupply","type":"uint256"},{"name":"_name","type":"string"},{"name":"_symbol","type":"string"},{"name":"_decimals","type":"uint8"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_blackListedUser","type":"address"},{"indexed":false,"name":"_balance","type":"uint256"}],"name":"DestroyedBlackFunds","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"}],"name":"Issue","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"amount","type":"uint256"}],"name":"Redeem","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newAddress","type":"address"}],"name":"Deprecate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_user","type":"address"}],"name":"AddedBlackList","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_user","type":"address"}],"name":"RemovedBlackList","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"feeBasisPoints","type":"uint256"},{"indexed":false,"name":"maxFee","type":"uint256"}],"name":"Params","type":"event"},{"anonymous":false,"inputs":[],"name":"Pause","type":"event"},{"anonymous":false,"inputs":[],"name":"Unpause","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}];

router.get('/token-info/:contractAddress/:ownerAddress', async (req, res) => {
    try {
        const { contractAddress, ownerAddress } = req.params;

        // Crea una instancia del contrato TRC20
        const tronWeb = new TronWeb({
            fullHost: getFullHostUrl(),
            solidityNode: getFullHostUrl(),
            privateKey: null, // Puedes dejarlo como null si no necesitas una clave privada
        });

        // Establece la dirección del propietario
        tronWeb.setAddress(ownerAddress);

        const instance = await tronWeb.contract(abiTrc20, contractAddress);

        // Llama a las funciones del contrato para obtener información
        const tokenName = await instance.name().call();
        const decimals = await instance.decimals().call();
        const tokenSymbol = await instance.symbol().call();
        // Puedes agregar más llamadas aquí para obtener más información del contrato

        res.json({
            'name': tokenName,
            'decimals': decimals,
            'symbol': tokenSymbol,
            // Agrega más campos según sea necesario
        });
    } catch (error) {
        console.error('Error al obtener información del token TRC20:', error);
        res.status(500).json({ error: 'Error al obtener información del token TRC20.' });
    }
})


router.get('/balance-trx/:publicKey', async (req, res) => {
    const { publicKey } = req.params;
    let balance = await tronWeb.trx.getBalance(publicKey);
    res.json({
        "balanceTrc20": balance/1000000
    })
})

router.get('/balance-trc20/:publicKey/:tokenAddress', async (req, res) => {
    const { publicKey, tokenAddress } = req.params;

    tronWeb.setAddress(publicKey);
    try {
        let contract = await tronWeb.contract().at(tokenAddress);

        let result = await contract.balanceOf(publicKey).call();
        const decimals = await contract.decimals().call();
        const lamports = Math.pow(10, decimals);
        let balance = tronWeb.toDecimal(result/lamports);
        res.json({
            'balance': balance
        })
    } catch(error) {
        res.json({
            'error': error
        })
    }
});

router.post('/send-trx', async (req, res) => {
    const toPublicKey = req.body.toPublicKey;
    const amount = req.body.amount;
    const fromPrivateKey = req.body.fromPrivateKey;

    const tronWeb = new TronWeb({
        fullHost : getFullHostUrl(),
        solidityNode: getFullHostUrl(), 
        privateKey: fromPrivateKey
    });

    try {
        // Obtener la dirección del remitente desde la clave privada
        const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);

        // Obtener la cantidad de decimales del token TRX
        const lamports = Math.pow(10, 6);

        // Obtener el balance actual del remitente
        const currentBalance = await tronWeb.trx.getBalance(fromAddress);

        // Verificar si el balance es suficiente para realizar la transacción
        if (currentBalance < amount * lamports) {
            return res.json({
                'error': 'Fondos insuficientes para realizar la transacción'
            });
        }

        // Enviar la transacción de TRX
        const result = await tronWeb.trx.sendTransaction(toPublicKey, amount * lamports);

        res.json({
            'result': result
        });
    } catch (error) {
        res.json({
            'error': error
        });
    }
});


//funcion eviar trc20
router.post('/send-trc20', async (req, res) => {
    const tokenAddress = req.body.tokenAddress;
    const toPublicKey = req.body.toPublicKey;
    const amount = req.body.amount;
    const fromPrivateKey = req.body.fromPrivateKey;

    const tronWeb = new TronWeb({
        fullHost : getFullHostUrl(),
        solidityNode: getFullHostUrl(), 
        privateKey: fromPrivateKey
    });

    try {
        // Obtener la dirección del remitente desde la clave privada
        const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);

        // Crear una instancia del contrato del token TRC20
        const contract = await tronWeb.contract().at(tokenAddress);

        // Obtener la cantidad de decimales del token
        const decimals = await contract.decimals().call();
        const lamports = Math.pow(10, decimals);

        // Verificar si el balance es suficiente para realizar la transacción
        const balance = await contract.balanceOf(fromAddress).call();
        if (balance < amount) {
            return res.json({
                'error': 'Fondos insuficientes para realizar la transacción'
            });
        }

        // Enviar la transacción de TRC20
        const result = await contract.transfer(toPublicKey, amount * lamports).send();

        res.json({
            'result': result
        });
    } catch (error) {
        res.json({
            'error': error
        });
    }
})

module.exports = router;
