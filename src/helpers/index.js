const web3 = require('@solana/web3.js');
const SPL = require("@solana/spl-token");

require("dotenv").config();

const endpoint = process.env.QN_ENDPOINT_URL
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

// Obtener Address del token-account
async function findAssociatedTokenAddress(walletAddress,tokenMintAddress) {
    return (
      await web3.PublicKey.findProgramAddress(
        [
          walletAddress.toBuffer(),
          SPL.TOKEN_PROGRAM_ID.toBuffer(),
          tokenMintAddress.toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      )
    )[0];
}

// Obtener los decimales de un Token
async function getTokenLamports(tokenAddress) {
    try {
        const connection = new web3.Connection(endpoint)
        const mintAddress = new web3.PublicKey(tokenAddress)
        const mintInfo = await SPL.getMint(connection, mintAddress)
        const lamports = Math.pow(10,mintInfo.decimals)
        
        return lamports
    } catch (error) {
        return error
    }
}

module.exports = {
    findAssociatedTokenAddress,
    getTokenLamports
}
