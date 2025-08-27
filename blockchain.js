const ec = new elliptic.ec('secp256k1');

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.signature = null;
    }

    calculateHash() {
        return CryptoJS.SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    }

    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('Bạn không thể ký giao dịch cho ví khác!');
        }
        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    isValid() {
        if (this.fromAddress === null) return true;
        if (!this.signature || this.signature.length === 0) {
            throw new Error('Không có chữ ký trong giao dịch này');
        }
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        capNhatHienThiBlockchain();
    }

    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    createGenesisBlock() {
        return new Block(Date.now(), [new Transaction(null, 'genesis', 0)], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);
        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);
        this.chain.push(block);
        this.pendingTransactions = [];
        capNhatHienThiBlockchain();
    }

    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Giao dịch phải bao gồm địa chỉ gửi và nhận');
        }
        if (!transaction.isValid()) {
            throw new Error('Không thể thêm giao dịch không hợp lệ vào chuỗi');
        }
        this.pendingTransactions.push(transaction);
        capNhatHienThiBlockchain();
    }

    getBalanceOfAddress(address) {
        let balance = 0;
        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }
        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (!currentBlock.hasValidTransactions()) {
                return false;
            }
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

class Wallet {
    constructor() {
        this.keyPair = ec.genKeyPair();
        this.publicKey = this.keyPair.getPublic('hex');
        this.privateKey = this.keyPair.getPrivate('hex');
    }

    sign(dataHash) {
        return this.keyPair.sign(dataHash);
    }
}

// Khởi tạo blockchain
const myCoin = new Blockchain();
const wallets = [];

// Hàm sao chép vào clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Đã sao chép vào clipboard!');
    }).catch(err => {
        alert('Lỗi khi sao chép: ' + err);
    });
}

// Hàm cập nhật giao diện
function capNhatHienThiBlockchain() {
    const blockchainList = document.getElementById('blockchain-list');
    blockchainList.innerHTML = '<h3>Các Khối Blockchain</h3>';
    myCoin.chain.forEach((block, index) => {
        blockchainList.innerHTML += `
            <div class="block">
                <strong>Khối ${index}</strong><br>
                Thời Gian: ${new Date(block.timestamp).toLocaleString()}<br>
                Mã Băm Trước: ${block.previousHash}<br>
                Mã Băm: ${block.hash}<br>
                Giao Dịch: <pre>${JSON.stringify(block.transactions, null, 2)}</pre>
            </div>
        `;
    });

    const walletList = document.getElementById('wallet-list');
    walletList.innerHTML = '<h3>Danh Sách Ví</h3>';
    wallets.forEach((wallet, index) => {
        const balance = myCoin.getBalanceOfAddress(wallet.publicKey);
        walletList.innerHTML += `
            <div class="wallet">
                <strong>Ví ${index + 1}</strong><br>
                Khóa Công Khai: ${wallet.publicKey}<br>
                <button class="copy-btn" onclick="copyToClipboard('${wallet.publicKey}')">Sao Chép Khóa Công Khai</button><br>
                Khóa Riêng: ${wallet.privateKey}<br>
                <button class="copy-btn" onclick="copyToClipboard('${wallet.privateKey}')">Sao Chép Khóa Riêng</button><br>
                Số Dư: ${balance}
            </div>
        `;
    });

    const chainStatus = document.getElementById('chain-status');
    chainStatus.innerHTML = `Blockchain Hợp Lệ: <span class="${myCoin.isChainValid() ? 'status' : 'error'}">${myCoin.isChainValid()}</span>`;
}

// Hàm tạo ví mới
function taoViMoi() {
    const wallet = new Wallet();
    wallets.push(wallet);
    capNhatHienThiBlockchain();
}

// Hàm tạo giao dịch
function taoGiaoDich() {
    const fromAddress = document.getElementById('fromAddress').value;
    const privateKey = document.getElementById('privateKey').value;
    const toAddress = document.getElementById('toAddress').value;
    const amount = parseInt(document.getElementById('amount').value);
    const status = document.getElementById('transaction-status');

    try {
        const keyPair = ec.keyFromPrivate(privateKey, 'hex');
        const tx = new Transaction(fromAddress, toAddress, amount);
        tx.signTransaction(keyPair);
        myCoin.addTransaction(tx);
        status.innerHTML = '<span class="status">Giao dịch đã được thêm!</span>';
    } catch (error) {
        status.innerHTML = `<span class="error">Lỗi: ${error.message}</span>`;
    }
}

// Hàm khai thác khối
function khoiMine() {
    if (wallets.length === 0) {
        document.getElementById('transaction-status').innerHTML = '<span class="error">Hãy tạo ví trước!</span>';
        return;
    }
    myCoin.minePendingTransactions(wallets[0].publicKey);
}

// Khởi tạo giao diện
capNhatHienThiBlockchain();