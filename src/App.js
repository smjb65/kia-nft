import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import NFTContractABI from './abi/MyNFT.json';


import './App.css';

function App() {
  const [activePage, setActivePage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('created');
  const [fileUploaded, setFileUploaded] = useState(null);
  const [properties, setProperties] = useState([{ name: '', value: '' }]);
  // State جدید برای NFTهای ساخته‌شده
  const [createdNFTs, setCreatedNFTs] = useState([]);
  const [account, setAccount] = useState(null);
  const [marketNFTs, setMarketNFTs] = useState([]);
  const [balance, setBalance] = useState(null);

  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/2f28ca878e6c4214af25e29566351459');



  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
        }
      });
    });

    document.querySelectorAll('section').forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (activePage === 'marketplace') {
      loadNFTs();
    }
  }, [activePage]);


  const showPage = (pageName) => {
    setActivePage(pageName);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // آدرس قرارداد NFT
  const nftContractAddress = "0xAad52Cf0D0Dc0C8dbC65D4FD4299edCa048d0668";

  // آپلود فایل به Pinata
  async function uploadFileToIPFS(file) {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
        },
        body: formData,
      });

      const result = await response.json();
      console.log("File IPFS Hash:", result.IpfsHash);
      return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error("Pinata file upload error:", error);
      throw error;
    }
  }

  // آپلود JSON متادیتا به Pinata
  async function uploadJSONToIPFS(jsonData) {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();
      console.log("Metadata IPFS Hash:", result.IpfsHash);
      return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error("Pinata JSON upload error:", error);
      throw error;
    }
  }
  // انتخاب فایل و ذخیره در state
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileUploaded(file);
      console.log("Selected file:", file.name);
    }
  };

  // وقتی NFT ساخته میشه، آن را به state اضافه کنیم:
  const handleCreateNFT = async (e) => {
    e.preventDefault();
    if (!fileUploaded) return alert("Please upload a file first!");

    setNotification({ message: "Creating NFT...", type: "info" });
    try {
      const formData = new FormData(e.target);
      const name = formData.get("name");
      const description = formData.get("description");
      const category = formData.get("category");
      const royalty = formData.get("royalty") || 0;
      const price = formData.get("price");

      const fileUrl = await uploadFileToIPFS(fileUploaded);
      const metadata = { name, description, image: fileUrl, category, royalty, price, properties };
      const metadataUrl = await uploadJSONToIPFS(metadata);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(nftContractAddress, NFTContractABI.abi, signer);

      const tx = await contract.mintNFT(account, metadataUrl, { value: ethers.parseEther("0") });
      await tx.wait();

      // اضافه کردن NFT جدید به state
      setCreatedNFTs(prev => [...prev, { id: Date.now(), name, image: fileUrl, owner: account, price, category }]);

      setNotification({ message: `NFT created successfully! Tx: ${tx.hash}`, type: "success" });
      setFileUploaded(null);
      e.target.reset();
      setProperties([{ name: "", value: "" }]);
    } catch (err) {
      console.error(err);
      setNotification({ message: "Failed to create NFT", type: "error" });
    }
  };


  const buyNFT = async (tokenId, price) => {
    try {
      if (!window.ethereum) return alert("Please connect your wallet first");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(nftContractAddress, NFTContractABI.abi, signer);

      const tx = await contract.safeTransferFrom(
        await signer.getAddress(),  // از کی خریده میشه
        await contract.ownerOf(tokenId),  // به مالک فعلی
        tokenId,
        { value: ethers.parseEther(price.toString()) }
      );
      await tx.wait();

      alert(`NFT purchased! Tx: ${tx.hash}`);
      loadNFTs(); // رفرش لیست NFT ها بعد از خرید
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Purchase failed, see console");
    }
  };



  // بارگذاری NFT ها از قرارداد
  const loadNFTs = async () => {
    try {
      if (!window.ethereum) return console.error("Wallet not connected");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(nftContractAddress, NFTContractABI.abi, provider);

      const total = await contract.tokenCount(); // تعداد NFT ها
      const nfts = [];

      for (let id = 1; id <= total; id++) {
        const owner = await contract.ownerOf(id);
        const tokenURI = await contract.tokenURI(id);

        // گرفتن متادیتا از IPFS
        const res = await fetch(tokenURI);
        const metadata = await res.json();

        nfts.push({
          tokenId: id,
          owner,
          ...metadata
        });
      }

      setMarketNFTs(nfts);
      console.log("Loaded NFTs:", nfts);
    } catch (err) {
      console.error("Failed to load NFTs:", err);
    }
  };

  // فراخوانی هنگام mount کامپوننت
  useEffect(() => {
    loadNFTs();
  }, []);



  const addProperty = () => {
    setProperties([...properties, { name: '', value: '' }]);
  };

  const removeProperty = (index) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const showNFTDetails = (nftId) => {
    const nft = createdNFTs.find(n => n.id === nftId);
    showNotification(`Viewing details for ${nft.name}`, 'info');
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5300);
  };
  const getBalance = async (address) => {
    try {
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      const formattedBalanceWithDecimals = parseFloat(formattedBalance).toFixed(5);

      return formattedBalanceWithDecimals;
    } catch (err) {
      console.error("Error fetching balance:", err);
      return "---";
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length > 0) {
          const walletAddress = accounts[0];
          setAccount(walletAddress);
          const balance = await getBalance(walletAddress);
          setBalance(balance);
        }
      } catch (err) {
        console.error("Error connecting to wallet:", err);
        alert("Failed to connect wallet. Please try again.");
      }
    } else {
      alert("MetaMask or Trust Wallet not found. Please install it.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Address copied to clipboard: " + text);
    }).catch((err) => {
      console.error("Error copying address:", err);
      alert("Failed to copy address.");
    });
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            const walletAddress = accounts[0];
            setAccount(walletAddress);
            const balance = await getBalance(walletAddress);
            setBalance(balance);
          }
        } catch (err) {
          console.error("Error checking wallet connection:", err);
        }
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          const walletAddress = accounts[0];
          setAccount(walletAddress);
          const balance = await getBalance(walletAddress);
          setBalance(balance);
        } else {
          setAccount(null);
          setBalance(null);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  return (
    <div className="bg-dark text-white">
      {/* Navigation */}
      <nav className="bg-dark-light border-b border-dark-lighter sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-primary">KIA NFT</div>
              <span className="text-sm text-gray-400 hidden lg:block">Powered by Ethereum</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => showPage('home')} className="nav-link text-white hover:text-primary transition-colors">Home</button>
              <button onClick={() => showPage('marketplace')} className="nav-link text-white hover:text-primary transition-colors">Marketplace</button>
              <button onClick={() => showPage('create')} className="nav-link text-white hover:text-primary transition-colors">Create NFT</button>
              <button onClick={() => showPage('about')} className="nav-link text-white hover:text-primary transition-colors">About</button>
            </div>
            <div className="md:hidden flex items-center space-x-4">
              <button
                id="connectButton"
                onClick={account ? () => copyToClipboard(account) : connectWallet}
                className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors"
              >
                {account
                  ? `${account.slice(0, 6)}...${account.slice(-4)} - ${balance ? balance : '0.0'} ETH`
                  : 'Connect Wallet'}
              </button>

              <button onClick={toggleMobileMenu} className="text-white hover:text-primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
            <button
              id="connectButton"
              onClick={account ? () => copyToClipboard(account) : connectWallet}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              {account
                ? `${account.slice(0, 6)}...${account.slice(-4)} - ${balance ? balance : '0.0'} ETH`
                : 'Connect Wallet'}
            </button>

          </div>
          <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} bg-dark-light border-t border-dark-lighter`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button onClick={() => showPage('home')} className="block px-3 py-2 text-white hover:text-primary transition-colors">Home</button>
              <button onClick={() => showPage('marketplace')} className="block px-3 py-2 text-white hover:text-primary transition-colors">Marketplace</button>
              <button onClick={() => showPage('create')} className="block px-3 py-2 text-white hover:text-primary transition-colors">Create NFT</button>
              <button onClick={() => showPage('about')} className="block px-3 py-2 text-white hover:text-primary transition-colors">About</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div id="mainContent">
        {/* Home Page */}
        <div className={`page ${activePage === 'home' ? 'active' : ''}`}>
          <section className="gradient-bg min-h-screen flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="fade-in">
                <h1 className="text-5xl md:text-7xl font-bold mb-6">
                  KIA <span className="text-primary">NFT</span> Marketplace
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                  The premier NFT marketplace on Ethereum Sepolia testnet - Create, buy and sell unique digital assets
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => showPage('marketplace')} className="bg-primary text-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-all transform hover:scale-105">
                    Explore Marketplace
                  </button>
                  <button onClick={() => showPage('create')} className="border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary hover:text-dark transition-all">
                    Create NFT
                  </button>
                </div>
                <div className="mt-12 flex justify-center items-center space-x-8 text-gray-400">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">1,234</div>
                    <div className="text-sm">NFTs Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">567</div>
                    <div className="text-sm">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">89.5 ETH</div>
                    <div className="text-sm">Total Volume</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Marketplace Page */}
        <div className={`page ${activePage === 'marketplace' ? 'active' : ''}`}>
          <section className="py-20 bg-dark min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">NFT Marketplace</h2>
                <p className="text-gray-400 text-lg">Discover NFTs created on this platform</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {marketNFTs.map(nft => (
                  <div key={nft.id} className="bg-dark-light rounded-xl overflow-hidden card-hover cursor-pointer">
                    <div className="aspect-square bg-dark-lighter relative overflow-hidden">
                      <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 bg-dark/80 rounded-full px-2 py-1 text-xs flex items-center space-x-1">
                        <span>❤️</span>
                        <span>{nft.likes || 0}</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-2">{nft.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">Owner: {nft.owner}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-primary font-bold text-lg">{nft.price} ETH</span>
                          <span className="text-gray-400 text-sm block">{nft.category}</span>
                        </div>
                        <button
                          className="bg-primary text-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
                          onClick={() => buyNFT(nft.id, nft.price)}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>
        </div>


        {/* Create NFT Page */}
        <div className={`page ${activePage === 'create' ? 'active' : ''}`}>
          <section className="py-20 bg-dark-light min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Create Your NFT</h2>
                <p className="text-gray-400 text-lg">Turn your digital art into an NFT on Ethereum Sepolia</p>
              </div>
              <div className="bg-dark rounded-2xl p-8 shadow-2xl kia-glow">
                <form onSubmit={(e) => handleCreateNFT(e, fileUploaded, properties, setNotification, setFileUploaded, setProperties, account)} className="space-y-6">

                  {/* آپلود فایل */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload File</label>
                    <div
                      className="border-2 border-dashed border-dark-lighter rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      {fileUploaded ? (
                        <>
                          <div className="text-4xl mb-4 text-primary">✅</div>
                          <p className="text-primary font-semibold">{fileUploaded.name}</p>
                          <p className="text-gray-400 text-sm mt-2">File uploaded ({(fileUploaded.size / (1024 * 1024)).toFixed(2)} MB)</p>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-4">📁</div>
                          <p className="text-gray-400">Drag and drop your file here or click to browse</p>
                          <p className="text-xs text-gray-500 mt-2">Supports: JPG, PNG, GIF, MP4, MP3 (Max 100MB)</p>
                        </>
                      )}
                      <input
                        type="file"
                        id="fileInput"
                        name="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>

                  {/* نام و قیمت */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">NFT Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                        placeholder="Enter your NFT name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (ETH) *</label>
                      <input
                        type="number"
                        name="price"
                        step="0.001"
                        required
                        className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                        placeholder="0.1"
                      />
                    </div>
                  </div>

                  {/* توضیحات */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      name="description"
                      rows="4"
                      className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                      placeholder="Describe your NFT..."
                    ></textarea>
                  </div>

                  {/* دسته‌بندی و رویالتی */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select
                        name="category"
                        className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                      >
                        <option>Art</option>
                        <option>Photography</option>
                        <option>Music</option>
                        <option>Sports</option>
                        <option>Gaming</option>
                        <option>Collectibles</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Royalty (%)</label>
                      <input
                        type="number"
                        name="royalty"
                        min="0"
                        max="10"
                        className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                        placeholder="2.5"
                      />
                    </div>
                  </div>

                  {/* نتورک تست */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Testnet</label>
                    <select
                      name="testnet"
                      className="w-full bg-dark-light border border-dark-lighter rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                    >
                      <option>Ethereum Sepolia</option>
                      <option>Polygon Mumbai</option>
                      <option>Ethereum Goerli</option>
                    </select>
                  </div>

                  {/* پراپرتی‌ها */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Properties (Optional)</label>
                    <div className="space-y-3">
                      {properties.map((prop, index) => (
                        <div key={index} className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Property name"
                            className="flex-1 bg-dark-light border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                            value={prop.name}
                            onChange={(e) => {
                              const newProperties = [...properties];
                              newProperties[index].name = e.target.value;
                              setProperties(newProperties);
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Value"
                            className="flex-1 bg-dark-light border border-dark-lighter rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                            value={prop.value}
                            onChange={(e) => {
                              const newProperties = [...properties];
                              newProperties[index].value = e.target.value;
                              setProperties(newProperties);
                            }}
                          />
                          {index === 0 ? (
                            <button type="button" onClick={addProperty} className="bg-primary text-dark px-4 py-2 rounded-lg hover:bg-secondary transition-colors">+</button>
                          ) : (
                            <button type="button" onClick={() => removeProperty(index)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">-</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* دکمه ساخت */}
                  <button
                    type="submit"
                    className="w-full bg-primary text-dark py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors flex items-center justify-center"
                    disabled={notification && notification.message === 'Creating NFT...'}
                  >
                    <span>{notification && notification.message === 'Creating NFT...' ? 'Creating NFT...' : 'Create NFT'}</span>
                    {notification && notification.message === 'Creating NFT...' && (
                      <div className="loading w-5 h-5 border-2 border-dark border-t-transparent rounded-full ml-2"></div>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>




        {/* About Page */}
        <div className={`page ${activePage === 'about' ? 'active' : ''}`}>
          <section className="py-20 bg-dark-light min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">About KIA NFT</h2>
                <p className="text-gray-400 text-lg">Showcasing Web3 development skills on Ethereum</p>
              </div>
              <div className="bg-dark rounded-2xl p-8 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-primary">Project Overview</h3>
                    <p className="text-gray-300 mb-6">
                      KIA NFT is a demonstration project running exclusively on testnet to showcase technical skills in blockchain and Web3 development. Built on the Ethereum ecosystem.
                    </p>
                    <h4 className="text-lg font-semibold mb-3 text-primary">Key Features:</h4>
                    <ul className="text-gray-300 space-y-2">
                      <li>• MetaMask wallet integration</li>
                      <li>• NFT creation and trading</li>
                      <li>• Complete marketplace functionality</li>
                      <li>• Modern responsive UI/UX</li>
                      <li>• Ethereum Sepolia testnet support</li>
                      <li>• Real-time transaction tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-primary">Technology Stack</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">⚛️</div>
                        <div className="font-semibold">React</div>
                      </div>
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">🔗</div>
                        <div className="font-semibold">ether.js</div>
                      </div>
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">💎</div>
                        <div className="font-semibold">Solidity</div>
                      </div>
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">🎨</div>
                        <div className="font-semibold">Tailwind CSS</div>
                      </div>
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">⚡</div>
                        <div className="font-semibold">Ethereum</div>
                      </div>
                      <div className="bg-dark-lighter rounded-lg p-4 text-center">
                        <div className="text-2xl mb-2">🔨</div>
                        <div className="font-semibold">Hardhat</div>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary">
                        ⚠️ Notice: This website operates exclusively on testnet and no real transactions are processed.
                      </p>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold mb-3 text-primary">Ethereum Benefits:</h4>
                      <ul className="text-gray-300 space-y-1 text-sm">
                        <li>• Decentralized and secure</li>
                        <li>• Large developer community</li>
                        <li>• Extensive tooling ecosystem</li>
                        <li>• Smart contract capabilities</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark border-t border-dark-lighter py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="text-2xl font-bold text-primary mb-4">KIA NFT</div>
              <p className="text-gray-400 mb-6">The premier NFT marketplace on Ethereum Sepolia testnet, showcasing the future of digital asset trading.</p>
              <div className="flex space-x-4">
                <button className="text-gray-400 hover:text-primary transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </button>
                <button className="text-gray-400 hover:text-primary transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
                </button>
                <button className="text-gray-400 hover:text-primary transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Marketplace</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-primary transition-colors">Browse NFTs</button></li>
                <li><button className="hover:text-primary transition-colors">Create NFT</button></li>
                <li><button className="hover:text-primary transition-colors">Collections</button></li>
                <li><button className="hover:text-primary transition-colors">Rankings</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-primary transition-colors">Help Center</button></li>
                <li><button className="hover:text-primary transition-colors">KIA Chain Docs</button></li>
                <li><button className="hover:text-primary transition-colors">API Documentation</button></li>
                <li><button className="hover:text-primary transition-colors">Community</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-dark-lighter text-center text-gray-500 text-sm">
            <p>© 2024 KIA NFT Marketplace. All rights reserved. Built on Ethereum Sepolia testnet for demonstration purposes.</p>
          </div>
        </div>
      </footer>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 w-96 p-4 rounded-lg shadow-lg z-50 ${notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white transform transition-transform`} style={{ transform: notification ? 'translateX(0)' : 'translateX(100%)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-white hover:text-gray-200 ml-4">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;