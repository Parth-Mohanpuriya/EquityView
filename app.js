
const CONFIG = {
    
    API_KEY: '', 
    TICKERS: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'],
    UPDATE_INTERVAL: 60000,
    IS_DEMO: true,
    CURRENT_FILTER: 'ALL', 
    CURRENT_SORT: 'DEFAULT' 
};

const dom = {
    stockGrid: document.getElementById('stockGrid'),
    searchInput: document.getElementById('searchInput'),
    loader: document.getElementById('loader'),
    noResults: document.getElementById('noResults'),
    apiStatus: document.getElementById('apiStatus'),
    modal: document.getElementById('apiKeyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    useDemoBtn: document.getElementById('useDemoBtn'),
    sortSelect: document.getElementById('sortSelect'),
    filterBtns: document.querySelectorAll('.filter-btn')
};

let stocksData = [];

const MOCK_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 1.25, percent: 0.68 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.71, change: -0.45, percent: -0.31 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 397.58, change: 4.12, percent: 1.05 },
   
];


function setupEventListeners() {
    dom.searchInput.addEventListener('input', handleSearch);
    dom.saveKeyBtn.addEventListener('click', saveApiKey);
    dom.useDemoBtn.addEventListener('click', startDemo);
    dom.sortSelect.addEventListener('change', handleSort);
    dom.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn));
    });
}


function init() {
    console.log('StockDash Initializing...');
    setupEventListeners();

    
    const savedKey = localStorage.getItem('finnhub_api_key');
    if (savedKey) {
        CONFIG.API_KEY = savedKey;
        CONFIG.IS_DEMO = false;
        dom.modal.classList.add('hidden');
        updateStatus(false);
        fetchStockData();
    } else {
        dom.modal.classList.remove('hidden');
    }
}


document.addEventListener('DOMContentLoaded', init);


function startDemo() {
    CONFIG.IS_DEMO = true;
    dom.modal.classList.add('hidden');
    updateStatus(true);
    stocksData = MOCK_STOCKS;
    renderStocks(stocksData);
}


function saveApiKey() {
    const key = dom.apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('finnhub_api_key', key);
        CONFIG.API_KEY = key;
        CONFIG.IS_DEMO = false;
        dom.modal.classList.add('hidden');
        updateStatus(false);
        fetchStockData();
    }
}


function updateStatus(isDemo) {
    const dot = dom.apiStatus.querySelector('.status-dot');
    const text = dom.apiStatus.querySelector('.status-text');
    
    if (isDemo) {
        dot.className = 'status-dot yellow';
        text.textContent = 'Demo Mode';
    } else {
        dot.className = 'status-dot green';
        text.textContent = 'Live Mode';
    }
}


async function fetchStockData() {
    if (CONFIG.IS_DEMO) return;

    dom.loader.classList.remove('hidden');
    dom.stockGrid.innerHTML = '';
    
    try {
        const promises = CONFIG.TICKERS.map(async (symbol) => {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${CONFIG.API_KEY}`);
            
            if (response.status === 403) {
                console.warn(`Access denied for ${symbol}. Likely not supported on free tier (e.g., non-US stocks).`);
                
                const mock = MOCK_STOCKS.find(s => s.symbol === symbol);
                return mock || { symbol, name: symbol, price: 0, change: 0, percent: 0 };
            }
            
            if (response.status === 429) throw new Error('API Rate limit reached (60 calls/min).');
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            if (!data.c && data.c !== 0) {
                
                const mock = MOCK_STOCKS.find(s => s.symbol === symbol);
                return mock || { symbol, name: symbol, price: 0, change: 0, percent: 0 };
            }

            return {
                symbol: symbol,
                name: getCompanyName(symbol),
                price: data.c || 0,
                change: data.d || 0,
                percent: data.dp || 0
            };
        });

        stocksData = await Promise.all(promises);
        renderStocks();
    } catch (error) {
        console.error('Critical Fetch Error:', error);
        alert(error.message || 'Failed to fetch live data.');
        startDemo();
    } finally {
        dom.loader.classList.add('hidden');
    }
}


function renderStocks() {
    
    let processedData = [...stocksData];

    
    const query = dom.searchInput.value.toUpperCase();
    if (query) {
        processedData = processedData.filter(stock => 
            stock.symbol.includes(query) || stock.name.toUpperCase().includes(query)
        );
    }

    
    if (CONFIG.CURRENT_FILTER === 'PROFIT') {
        processedData = processedData.filter(s => s.change >= 0);
    } else if (CONFIG.CURRENT_FILTER === 'LOSS') {
        processedData = processedData.filter(s => s.change < 0);
    }

    
    if (CONFIG.CURRENT_SORT === 'PRICE_ASC') {
        processedData.sort((a, b) => a.price - b.price);
    } else if (CONFIG.CURRENT_SORT === 'PRICE_DESC') {
        processedData.sort((a, b) => b.price - a.price);
    }

    dom.stockGrid.innerHTML = '';
    
    if (processedData.length === 0) {
        dom.noResults.classList.remove('hidden');
        return;
    }

    dom.noResults.classList.add('hidden');

    processedData.forEach((stock, index) => {
        const isPositive = stock.change >= 0;
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="symbol-box">
                    <span class="symbol">${stock.symbol}</span>
                    <span class="company-name">${stock.name}</span>
                </div>
                <div class="change-badge ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(stock.percent).toFixed(2)}%
                </div>
            </div>
            <div class="price-section">
                <div class="current-price">$${stock.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <div class="change-text ${isPositive ? 'positive' : 'negative'}" style="font-size: 0.9rem; font-weight: 500;">
                    ${isPositive ? '+' : ''}${stock.change.toFixed(2)} Today
                </div>
            </div>
        `;
        
        dom.stockGrid.appendChild(card);
    });
}


function handleSearch() {
    renderStocks();
}


function handleSort(e) {
    CONFIG.CURRENT_SORT = e.target.value;
    renderStocks();
}


function handleFilter(btn) {
    
    dom.filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    
    CONFIG.CURRENT_FILTER = btn.dataset.filter;
    renderStocks();
}


function getCompanyName(symbol) {
    const names = {
        'AAPL': 'Apple Inc.',
        'GOOGL': 'Alphabet Inc.',
        'MSFT': 'Microsoft Corp.',
        'TSLA': 'Tesla, Inc.',
        'AMZN': 'Amazon.com, Inc.',
        'NVDA': 'NVIDIA Corp.',
        'META': 'Meta Platforms',
        'RELIANCE.NS': 'Reliance Industries',
        'TCS.NS': 'Tata Consultancy Services',
        'HDFCBANK.NS': 'HDFC Bank Ltd.',
        'INFY.NS': 'Infosys Ltd.'
    };
    return names[symbol] || symbol;
}

setInterval(() => {
    if (!CONFIG.IS_DEMO && CONFIG.API_KEY) {
        fetchStockData();
    }
}, CONFIG.UPDATE_INTERVAL);


