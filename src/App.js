import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import MyTokenArtifact from './abi/MyToken.json';
import PairArtifact from './abi/Pair.json';
import axios from 'axios';

const initialTokens = [
    {
        symbol: 'ETH',
        name: 'Sepolia Ether',
        price: 2600.00,
        icon: '⟠',
        liquidity: 10000000,
        volume24h: 2000000,
        created: '2021-10-01',
        contract: '0x0000000000000000000000000000000000000000',
        decimals: 18
    }
];

function TokenSelector({ selectedToken, onSelect, tokens, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${disabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
            >
                <span className="text-xl">{selectedToken?.icon || '🪙'}</span>
                <span className="font-semibold">{selectedToken?.symbol || 'Select'}</span>
                {!disabled && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-white rounded-xl shadow-lg border z-50">
                    <div className="p-2">
                        {tokens.map((token) => (
                            <button
                                key={token.contract}
                                onClick={() => {
                                    onSelect(token);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg token-hover"
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-xl">{token.icon}</span>
                                    <div className="text-left">
                                        <div className="font-semibold">{token.symbol}</div>
                                        <div className="text-sm text-gray-500">{token.name}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    ${token.price.toLocaleString()}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateTokenTab({ onTokenCreate }) {
    const [tokenData, setTokenData] = useState({
        name: '',
        symbol: '',
        totalSupply: '',
        decimals: 18,
        icon: null,
        iconFile: null
    });
    const [isDeploying, setIsDeploying] = useState(false);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50000) {
                alert('Image size should be less than 50KB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setTokenData({ ...tokenData, icon: event.target.result, iconFile: file });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!window.ethereum) {
            alert("MetaMask not found! Please install it.");
            return;
        }

        if (!tokenData.name || !tokenData.symbol || !tokenData.totalSupply) {
            alert('Please fill all fields');
            return;
        }

        try {
            setIsDeploying(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();

            const factory = new ethers.ContractFactory(
                MyTokenArtifact.abi,
                MyTokenArtifact.bytecode,
                signer
            );

            const token = await factory.deploy(
                tokenData.name,
                tokenData.symbol,
                ethers.parseUnits(tokenData.totalSupply.toString(), tokenData.decimals),
                tokenData.decimals
            );

            await token.waitForDeployment();

            // اصلاح مقدار totalSupply برای ذخیره صحیح
            const newToken = {
                ...tokenData,
                totalSupply: Number(tokenData.totalSupply), // تبدیل به عدد
                price: 0,
                liquidity: 0,
                volume24h: 0,
                created: new Date().toISOString().split('T')[0],
                contract: token.target,
                icon: '🪙'
            };

            onTokenCreate(newToken);
            alert(`Token ${tokenData.symbol} successfully deployed at ${token.target} on Sepolia!`);
            setTokenData({ name: '', symbol: '', totalSupply: '', decimals: 18, icon: null, iconFile: null });
        } catch (err) {
            console.error("Error deploying token:", err);
            alert("Failed to deploy token. See console for details.");
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 card-shadow max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6">Create New Token</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token Name</label>
                    <input
                        type="text"
                        value={tokenData.name}
                        onChange={(e) => setTokenData({ ...tokenData, name: e.target.value })}
                        placeholder="Example: My Token"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Token Symbol</label>
                    <input
                        type="text"
                        value={tokenData.symbol}
                        onChange={(e) => setTokenData({ ...tokenData, symbol: e.target.value.toUpperCase() })}
                        placeholder="Example: MTK"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Supply</label>
                    <input
                        type="number"
                        value={tokenData.totalSupply}
                        onChange={(e) => setTokenData({ ...tokenData, totalSupply: e.target.value })}
                        placeholder="1000000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimals</label>
                    <select
                        value={tokenData.decimals}
                        onChange={(e) => setTokenData({ ...tokenData, decimals: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value={6}>6</option>
                        <option value={8}>8</option>
                        <option value={18}>18</option>
                    </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="font-semibold text-blue-800 mb-2">Network Information</h3>
                    <p className="text-sm text-blue-600">Network: Sepolia Testnet</p>
                    <p className="text-sm text-blue-600">Transaction Fee: ~0.001 ETH</p>
                </div>

                <button
                    type="submit"
                    disabled={isDeploying}
                    className={`w-full py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl ${isDeploying ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-blue-700'}`}
                >
                    {isDeploying ? 'Deploying...' : 'Create Token on Sepolia'}
                </button>
            </form>
        </div>
    );
}

function LiquidityTab({ tokens, updateTokenLiquidity }) {
    const ethToken = tokens.find(t => t.contract === '0x0000000000000000000000000000000000000000') || initialTokens[0];
    const [token1, setToken1] = useState(ethToken);
    const [token2, setToken2] = useState(tokens[1] || tokens[0] || {});
    const [amount1, setAmount1] = useState('');
    const [amount2, setAmount2] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

    const PAIR_CONTRACT_ADDRESS = "0xda7057C5F7bc125CBd9dC6D8fe2e9Ff4b42a6214";

    // اعتبارسنجی ورودی‌ها
    const isValidAmount = (amount) => {
        const parsed = parseFloat(amount);
        return amount !== '' && !isNaN(parsed) && parsed > 0;
    };

    useEffect(() => {
        if (isValidAmount(amount1) && token1.price && token2.price && token2.price !== 0) {
            const rate = token1.price / token2.price;
            setAmount2((parseFloat(amount1) * rate).toFixed(6));
        } else {
            setAmount2('');
        }
    }, [amount1, token1, token2]);

    const checkBalance = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();
            const tokenContract = new ethers.Contract(token2.contract, MyTokenArtifact.abi, provider); // استفاده از token2.contract
            const balance = await tokenContract.balanceOf(userAddress);
            const formattedBalance = ethers.formatUnits(balance, token2.decimals || 18);
            console.log(`Balance of ${token2.symbol}: ${formattedBalance}`);
            return formattedBalance;
        } catch (err) {
            console.error("Error checking balance:", err);
            alert(`Failed to check balance: ${err.message}`);
            return 0;
        }
    };

    const approveToken = async () => {
        if (!window.ethereum) {
            alert("MetaMask not found! Please install it.");
            return;
        }

        if (!isValidAmount(amount1) || !isValidAmount(amount2)) {
            alert("Please enter valid positive amounts for both tokens.");
            return;
        }

        try {
            setIsApproving(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            if (token2.contract !== '0x0000000000000000000000000000000000000000') {
                const tokenContract = new ethers.Contract(token2.contract, MyTokenArtifact.abi, signer);
                const amount2Wei = ethers.parseUnits(amount2.toString(), token2.decimals || 18);
                console.log(`Approving ${amount2} ${token2.symbol} (${amount2Wei.toString()} Wei) for ${PAIR_CONTRACT_ADDRESS}`);

                // بررسی موجودی توکن
                const balance = await tokenContract.balanceOf(userAddress);
                console.log(`Your balance of ${token2.symbol}: ${ethers.formatUnits(balance, token2.decimals)}`);
                if (balance < amount2Wei) {
                    throw new Error(`Insufficient balance of ${token2.symbol}. You have ${ethers.formatUnits(balance, token2.decimals)} but need ${amount2}.`);
                }

                // تخمین گس با مدیریت خطا
                let gasEstimate;
                try {
                    gasEstimate = await tokenContract.approve.estimateGas(PAIR_CONTRACT_ADDRESS, amount2Wei);
                    console.log(`Estimated gas for approve: ${gasEstimate.toString()}`);
                } catch (gasError) {
                    console.error("Gas estimation failed:", gasError);
                    gasEstimate = 100000; // مقدار پیش‌فرض در صورت شکست تخمین
                }

                // اجرای تراکنش با گس بالاتر و تأخیر
                await new Promise(resolve => setTimeout(resolve, 1000)); // تأخیر 1 ثانیه
                const tx = await tokenContract.approve(PAIR_CONTRACT_ADDRESS, amount2Wei, {
                    gasLimit: gasEstimate * 150n / 100n // افزایش 50% برای اطمینان
                });
                console.log(`Transaction hash: ${tx.hash}`);
                await tx.wait();
                console.log(`Approved ${amount2} ${token2.symbol} for liquidity pool`);
                alert(`Approved ${amount2} ${token2.symbol} for liquidity pool!`);
            } else {
                alert("ETH does not require approval.");
            }
        } catch (err) {
            console.error("Error approving token:", err);
            alert(`Failed to approve token: ${err.message || 'Check console for details. Try switching RPC provider or increasing gas.'}`);
        } finally {
            setIsApproving(false);
        }
    };

    const addLiquidity = async () => {
        if (!window.ethereum) {
            alert("MetaMask not found! Please install it.");
            return;
        }

        if (!isValidAmount(amount1) || !isValidAmount(amount2)) {
            alert("Please enter valid positive amounts for both tokens.");
            return;
        }

        try {
            setIsAddingLiquidity(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            const parsedAmount1 = parseFloat(amount1);
            console.log(`Input ETH amount: ${amount1}, Parsed: ${parsedAmount1}`);
            if (parsedAmount1 <= 0 || isNaN(parsedAmount1)) {
                throw new Error("ETH amount must be a positive number");
            }

            console.log(`Adding liquidity: ETH=${amount1}, Token=${amount2} (${token2.symbol})`);
            const pairContract = new ethers.Contract(PAIR_CONTRACT_ADDRESS, PairArtifact.abi, signer);
            const amount1Wei = ethers.parseEther(amount1.toString());
            const amount2Wei = ethers.parseUnits(amount2.toString(), token2.decimals || 18);
            console.log(`ETH (Wei): ${amount1Wei.toString()}, Token (Wei): ${amount2Wei.toString()}`);

            // بررسی اجازه (Allowance) برای توکن دوم
            if (token2.contract !== '0x0000000000000000000000000000000000000000') {
                const tokenContract = new ethers.Contract(token2.contract, MyTokenArtifact.abi, signer);
                const allowance = await tokenContract.allowance(userAddress, PAIR_CONTRACT_ADDRESS);
                console.log(`Allowance for ${token2.symbol}: ${ethers.formatUnits(allowance, token2.decimals)}`);
                if (allowance < amount2Wei) {
                    throw new Error(`Insufficient allowance for ${token2.symbol}. Please approve more tokens.`);
                }
            }

            // بررسی تعادل اتریوم
            const balance = await provider.getBalance(userAddress);
            console.log(`User ETH balance: ${ethers.formatEther(balance)}`);
            if (balance < amount1Wei) {
                throw new Error("Insufficient ETH balance to add liquidity.");
            }

            // تخمین گس برای دیباگ
            try {
                const gasEstimate = await pairContract.addLiquidity.estimateGas(amount2Wei, { value: amount1Wei });
                console.log(`Estimated gas: ${gasEstimate.toString()}`);
            } catch (gasError) {
                console.error("Gas estimation failed:", gasError);
                throw new Error(`Gas estimation failed: ${gasError.message}`);
            }

            // اجرای تراکنش
            const tx = await pairContract.addLiquidity(amount2Wei, { value: amount1Wei });
            console.log(`Transaction hash: ${tx.hash}`);
            await tx.wait();

            const [reserve0, reserve1] = await pairContract.getReserves();
            const newLiquidity = Number(ethers.formatEther(reserve0)) + Number(ethers.formatUnits(reserve1, token2.decimals || 18));
            const newPrice = reserve1.eq(0) ? 0 : (Number(ethers.formatEther(reserve0)) / Number(ethers.formatUnits(reserve1, token2.decimals || 18))) * token1.price;

            updateTokenLiquidity(token2.contract, newLiquidity, newPrice);
            alert(`Liquidity added: ${amount1} ETH + ${amount2} ${token2.symbol}!`);
            setAmount1('');
            setAmount2('');
        } catch (err) {
            console.error("Error adding liquidity:", err);
            alert(`Failed to add liquidity: ${err.message || 'Unknown error. Check console for details.'}`);
        } finally {
            setIsAddingLiquidity(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 card-shadow max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-6">Add Liquidity</h2>

            <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm text-gray-600 mb-2">First Token (ETH)</label>
                    <div className="flex items-center space-x-4">
                        <input
                            type="number"
                            value={amount1}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || parseFloat(value) >= 0) {
                                    setAmount1(value);
                                }
                            }}
                            placeholder="0.0"
                            min="0"
                            step="0.000000000000000001"
                            className="flex-1 text-xl font-semibold bg-transparent outline-none text-left"
                            style={{ width: "80%" }}
                        />
                        <TokenSelector
                            selectedToken={token1}
                            onSelect={() => { }}
                            tokens={[token1]}
                            disabled={true}
                        />
                    </div>
                </div>

                <div className="text-center">
                    <span className="text-2xl">+</span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm text-gray-600 mb-2">Second Token</label>
                    <div className="flex items-center space-x-4">
                        <input
                            type="number"
                            value={amount2}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || parseFloat(value) >= 0) {
                                    setAmount2(value);
                                }
                            }}
                            placeholder="0.0"
                            min="0"
                            step="0.000000000000000001"
                            className="flex-1 text-xl font-semibold bg-transparent outline-none text-left"
                            style={{ width: "80%" }}
                        />
                        <TokenSelector
                            selectedToken={token2}
                            onSelect={setToken2}
                            tokens={tokens.filter(t => t.contract !== '0x0000000000000000000000000000000000000000')}
                        />
                    </div>
                </div>

                {isValidAmount(amount1) && isValidAmount(amount2) && (
                    <div className="bg-green-50 rounded-xl p-4">
                        <h3 className="font-semibold text-green-800 mb-2">Liquidity Information</h3>
                        <div className="text-sm text-green-600 space-y-1">
                            <p>Rate: 1 ETH = {token2.price ? (token1.price / token2.price).toFixed(6) : 'N/A'} {token2.symbol}</p>
                            <p>Your pool share: ~0.01%</p>
                            <p>LP tokens received: {(Math.sqrt(parseFloat(amount1) * parseFloat(amount2))).toFixed(2)}</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={approveToken}
                    disabled={!isValidAmount(amount1) || !isValidAmount(amount2) || isApproving || isAddingLiquidity}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all mb-2 ${!isValidAmount(amount1) || !isValidAmount(amount2) || isApproving || isAddingLiquidity
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                        }`}
                >
                    {isApproving ? 'Approving...' : 'Approve Token'}
                </button>

                <button
                    onClick={addLiquidity}
                    disabled={!isValidAmount(amount1) || !isValidAmount(amount2) || isApproving || isAddingLiquidity}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${!isValidAmount(amount1) || !isValidAmount(amount2) || isApproving || isAddingLiquidity
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700'
                        }`}
                >
                    {isAddingLiquidity ? 'Adding Liquidity...' : 'Add Liquidity'}
                </button>
            </div>
        </div>
    );
}

function TokenListTab({ tokens, account, fetchDeployedTokens, setTokens }) {
    const [sortBy, setSortBy] = useState('liquidity');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const filteredTokens = tokens
        .filter(token =>
            token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'price': return b.price - a.price;
                case 'liquidity': return b.liquidity - a.liquidity;
                case 'volume': return b.volume24h - a.volume24h;
                case 'created': return new Date(b.created) - new Date(a.created);
                case 'totalSupply': return b.totalSupply - a.totalSupply; // اضافه کردن مرتب‌سازی برای Total Supply
                default: return 0;
            }
        });

    const handleReset = async () => {
        setIsLoading(true);
        await fetchDeployedTokens();
        setIsLoading(false);
    };
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert("Address copied to clipboard: " + text);
        }).catch((err) => {
            console.error("Error copying address:", err);
            alert("Failed to copy address.");
        });
    };

    return (
        <div className="bg-white rounded-2xl p-6 card-shadow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                <h2 className="text-xl font-semibold">Token List</h2>
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                    <input
                        type="text"
                        placeholder="Search tokens..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="liquidity">Sort by Liquidity</option>
                        <option value="price">Sort by Price</option>
                        <option value="volume">Sort by Volume</option>
                        <option value="created">Sort by Date</option>
                        <option value="totalSupply">Sort by Total Supply</option>
                    </select>
                    <button
                        onClick={handleReset}
                        disabled={isLoading || !account}
                        className={`px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 ${isLoading || !account ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Loading...' : 'Reset & Refresh'}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Token</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Liquidity</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">24h Volume</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Supply</th> {/* ستون جدید */}
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Contract</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTokens.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                                        No tokens found. Deploy a token or connect a wallet.
                                    </td>
                                </tr>
                            ) : (
                                filteredTokens.map((token) => (
                                    <tr key={token.contract} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">{token.icon}</span>
                                                <div>
                                                    <div className="font-semibold">{token.symbol}</div>
                                                    <div className="text-sm text-gray-500">{token.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-semibold">
                                            ${token.price.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-4">
                                            ${token.liquidity.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-4">
                                            ${token.volume24h.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-4">
                                            {Number(token.totalSupply).toLocaleString()} {/* نمایش Total Supply */}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                            {new Date(token.created).toLocaleDateString('en-US')}
                                        </td>
                                        <td className="py-4 px-4">
                                            <button
                                                onClick={() => copyToClipboard(token.contract)}
                                                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                                title="Click to copy address"
                                            >
                                                {token.contract.slice(0, 10)}...
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function App() {
    const [activeTab, setActiveTab] = useState('create');
    const [tokens, setTokens] = useState(initialTokens);
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(null);

    const ETHERSCAN_API_KEY = 'JSTHMX54VAIMNIVRAEEVX3E22E8IPIHFXI';

    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/039192b77faf49418f636491ba286d96');

    const getBalance = async (address) => {
        try {
            const balance = await provider.getBalance(address);
            const formattedBalance = ethers.formatEther(balance);
            return formattedBalance;
        } catch (err) {
            console.error("Error fetching balance:", err);
            return "---";
        }
    };

    const fetchDeployedTokens = async () => {
        if (!account) {
            setTokens(initialTokens);
            return;
        }

        try {
            const response = await axios.get('https://api-sepolia.etherscan.io/api', {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: account,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 10000,
                    sort: 'desc',
                    apikey: ETHERSCAN_API_KEY
                },
                timeout: 20000 // اضافه کردن تایم‌اوت برای جلوگیری از درخواست‌های طولانی
            });

            const contractCreations = response.data.result.filter(tx => tx.to === '' && tx.contractAddress);

            const newTokens = [];
            const uniqueContracts = new Set();
            const uniqueSymbols = new Set(['ETH']); // ETH رو از قبل اضافه می‌کنیم تا تکراری نشه

            for (const tx of contractCreations) {
                const contractAddress = tx.contractAddress.toLowerCase();
                if (uniqueContracts.has(contractAddress)) continue;
                uniqueContracts.add(contractAddress);

                try {
                    const contract = new ethers.Contract(tx.contractAddress, MyTokenArtifact.abi, provider);
                    const [name, symbol, decimals, totalSupply] = await Promise.all([
                        contract.name(),
                        contract.symbol(),
                        contract.decimals(),
                        contract.totalSupply()
                    ]);

                    // فیلتر کردن توکن‌های LP و توکن‌های غیراستاندارد
                    if (symbol === 'LP' || name === 'Liquidity Pool Token') continue;

                    // فقط آخرین توکن با Symbol یکسان رو نگه دار
                    if (uniqueSymbols.has(symbol)) continue;
                    uniqueSymbols.add(symbol);

                    newTokens.push({
                        name,
                        symbol,
                        decimals,
                        totalSupply: ethers.formatUnits(totalSupply, decimals),
                        price: 0,
                        liquidity: 0,
                        volume24h: 0,
                        created: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0],
                        contract: tx.contractAddress,
                        icon: '🪙'
                    });
                } catch (err) {
                    console.error(`Skipping non-ERC20 contract ${tx.contractAddress}:`, err);
                }
            }

            // ترکیب توکن‌های جدید با initialTokens و حذف تکراری‌ها
            const allTokens = [...initialTokens, ...newTokens];
            const uniqueTokens = Array.from(new Map(allTokens.map(token => [token.contract.toLowerCase(), token])).values());

            setTokens(uniqueTokens);
        } catch (err) {
            console.error("Error fetching deployed tokens:", err);
            alert("Failed to fetch deployed tokens. See console for details.");
            setTokens(initialTokens); // در صورت خطا به initialTokens برمی‌گردیم
        }
    };

    const updateTokenLiquidity = (contractAddress, newLiquidity, newPrice) => {
        setTokens(prevTokens => {
            const updatedTokens = prevTokens.map(token =>
                token.contract.toLowerCase() === contractAddress.toLowerCase()
                    ? { ...token, liquidity: newLiquidity, price: newPrice }
                    : token
            );
            return Array.from(new Map(updatedTokens.map(token => [token.contract.toLowerCase(), token])).values());
        });
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
                    fetchDeployedTokens();
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
                        fetchDeployedTokens();
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
                    fetchDeployedTokens();
                } else {
                    setAccount(null);
                    setBalance(null);
                    setTokens(initialTokens);
                }
            };

            window.ethereum.on("accountsChanged", handleAccountsChanged);
            return () => {
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            };
        }
    }, []);

    const handleTokenCreate = (newToken) => {
        const updatedTokens = [...tokens, newToken];
        const uniqueTokens = Array.from(new Map(updatedTokens.map(token => [token.contract.toLowerCase(), token])).values());
        setTokens(uniqueTokens);
        fetchDeployedTokens();
    };

    const tabs = [
        { id: 'create', name: 'Create Token', icon: '🪙' },
        { id: 'liquidity', name: 'Liquidity', icon: '💧' },
        { id: 'tokens', name: 'Token List', icon: '📊' },
    ];

    return (
        <div className="min-h-screen gradient-bg p-4">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card-shadow { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
                .token-hover:hover { transform: translateY(-2px); transition: all 0.2s ease; }
                .tab-active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            `}</style>
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Kia TokenPool</h1>
                        <p className="text-white/80">Complete Decentralized Finance Platform</p>
                    </div>
                    <button
                        id="connectButton"
                        onClick={account ? () => copyToClipboard(account) : connectWallet}
                        className="px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30"
                    >
                        {account ? `${account.slice(0, 6)}...${account.slice(-4)} - ${balance ? balance.slice(0, 6) : '0.0'} ETH` : 'Connect Wallet'}
                    </button>
                </div>

                <div className="flex flex-wrap justify-center mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all m-1 ${activeTab === tab.id
                                ? 'tab-active text-white shadow-lg'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </div>

                <div className="mb-8">
                    {activeTab === 'create' && <CreateTokenTab onTokenCreate={handleTokenCreate} />}
                    {activeTab === 'liquidity' && <LiquidityTab tokens={tokens} updateTokenLiquidity={updateTokenLiquidity} />}
                    {activeTab === 'tokens' && <TokenListTab tokens={tokens} account={account} fetchDeployedTokens={fetchDeployedTokens} setTokens={setTokens} />}
                </div>
                <div className="text-center mt-8 text-white/60 text-sm">
                    <p>Built with ❤️ for the DeFi Community</p>
                </div>
            </div>
        </div>
    );
}

export default App;