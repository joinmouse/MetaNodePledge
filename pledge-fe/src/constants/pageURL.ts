const pageURL = {
  /** 首页 */
  Dapp: '/',
  Market: '/:pool',
  Lend_Borrow: '/Market/:mode',
  Market_Pool: '/:pid/:pool/:coin/:mode',
  DEX_Swap: '/DEX/Swap',
  DEX_Pool: '/DEX/Pool',
  Add: '/add',
  Find: '/DEX/find',
  Add_Single: '/add/:currencyIdA',
  Add_Double: '/add:currencyIdA/:currencyIdB',
  Remove_Tokens: '/remove/:tokens',
  Remove_Liquidity: '/remove/:currencyIdA/:currencyIdB',
};

export default pageURL;
