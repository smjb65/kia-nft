KIA NFT Marketplace
📋 Project Overview
KIA NFT Marketplace is a decentralized platform for creating, buying, and selling Non-Fungible Tokens (NFTs) on the Ethereum Sepolia Testnet. This project serves as a demonstration of Web3 development skills.

https://kia-nft.vercel.app/

🛠️ Technology Stack
Frontend: React.js with Tailwind CSS

Blockchain: Ethereum (Sepolia Testnet)

Smart Contracts: Solidity with ethers.js

Storage: IPFS (via Pinata)

Wallet Integration: MetaMask/Trust Wallet

Development: Hardhat

⚠️ Important Limitations
1. Contract Owner Exclusive Access
Important: Only the smart contract owner address can perform NFT minting operations. This is a security feature in the contract that prevents unauthorized users from creating NFTs.

https://github.com/smjb65/hardhat-NFT

3. Current Purchase System
The NFT purchase functionality is not fully implemented in the current version:

Only the contract owner can create NFTs

Purchase and ownership transfer capabilities require further development

🚀 Key Features
✅ Wallet connection (MetaMask/Trust Wallet)

✅ NFT creation with metadata

✅ IPFS file storage via Pinata

✅ NFT marketplace display

✅ Responsive design

✅ Real-time balance updates

🔧 Setup Instructions
Prerequisites
Node.js (v14 or higher)

MetaMask wallet

Pinata account (for IPFS)

Sepolia ETH for gas fees

Installation
Clone the repository

Install dependencies: npm install

Set up environment variables:

text
REACT_APP_PINATA_JWT=your_pinata_jwt_token
Start development server: npm start

📁 Project Structure
text
src/
├── App.js              # Main application component
├── App.css             # Styling
├── abi/
│   └── MyNFT.json      # Contract ABI
└── ...
🔗 Smart Contract Details
Contract Address: 0xAad52Cf0D0Dc0C8dbC65D4FD4299edCa048d0668

Network: Ethereum Sepolia Testnet

ABI: Included in abi/MyNFT.json

🌐 IPFS Integration
The project uses Pinata for IPFS storage:

Files are uploaded to IPFS via Pinata API

Metadata is stored as JSON on IPFS

Gateway: https://gateway.pinata.cloud/ipfs/

🎯 Usage Guide
Connect Wallet: Click "Connect Wallet" to link your MetaMask

Create NFT: Navigate to "Create NFT" page (owner only)

Upload File: Select file and fill in metadata

Mint NFT: Confirm transaction in wallet

View Marketplace: Browse created NFTs

⚡ Important Notes
This is a testnet demonstration only

No real financial transactions occur

Contract ownership restrictions are intentional

IPFS files are stored via Pinata pinning service

🔮 Future Enhancements
Full purchase functionality

Auction system

Royalty distribution

Collection management

Advanced filtering and search
