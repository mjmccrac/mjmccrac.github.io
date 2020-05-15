var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
});
const maxPriceInEth = 1000;

const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later

var buyNames = [];
var buyStatus = [];
var sellNames = [];
var sellStatus = [];

var unsoldNames = [];

var sellNamesToShip = [];
var sellNamesFinished = [];
var sellIndexToShip = []; // txNum
var sellIndexFinished = [];
var sellStatusToShip = [];
var sellStatusFinished = [];

var buyNamesFinal = [];
var buyNamesToConfirm = [];
var buyIndexFinal = [];
var buyIndexToConfirm = [];
var buyStatusFinal = [];
var buyStatusToConfirm = [];

var unsoldIndex = [];
var unsoldStatus = [];

var buyIndex = [];
var sellIndex = [];

var buttonCount = 0; // counts number of buttons to take you to transaction screen
var forSaleButtonCount = 0; // number of buttons to take you to edit screen
var tx = [];
var upForSale = [];
var currentTx = 0;

App = {


  web3Provider: null,
  userAddress: null,
  userBalance: 0,
  adminPriv: false,
  sellPriv: false,
  buffer: '',
  img: [],
  contracts: {},
  ipfsHash: "",

  item_name: null,
  item_price: 0,
  item_state: 0,
  item_seller: null,
  item_ipfsHash: "",


  updateAccount: function() {
    var addressElement = document.getElementById("userAddress");
    userAddress = web3.eth.accounts[0];
    addressElement.innerHTML = userAddress;

    var balanceElement = document.getElementById("userBalance");
    web3.eth.getBalance(userAddress, (err, wei) => {
      userBalance = web3.fromWei(wei, 'ether');
      balanceElement.innerHTML = userBalance;
    });
  },


  init: async function() {
    ipfsHash = "";
    tx.length = 0;
    upForSale.length = 0;
    return await App.initWeb3();
  },

  initWeb3: async function() {

    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error("User denied account access");
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Final.json', function(data) {
      var FinalArtifact = data;
      App.contracts.Final = TruffleContract(FinalArtifact);
      App.contracts.Final.setProvider(App.web3Provider);
      return App.updateInterface();
    });
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-view', App.viewTransaction);
    $(document).on('click', '.btn-forsale', App.gotoEdit);
  },

  gotoEdit: function() {
    event.preventDefault();
    var itemId = parseInt($(event.target).data('id'));
    var currentItem = upForSale[itemId];
    sessionStorage.setItem("currentItem", currentItem);
    var w = window.open("editItem.html", "_top");
  },

  viewTransaction: function() {

    event.preventDefault();
    var itemId = parseInt($(event.target).data('id'));
    currentTx = tx[itemId];
    sessionStorage.setItem("currentTx", currentTx);
    var w = window.open("transaction.html", "_top");
  },

  updateInterface: function(isSeller, isAdmin) {
    //var itemCount = 0;
    App.updateAccount();

    var element = document.getElementById("permissions");

    var FinalInstance;

    App.contracts.Final.deployed().then(function(instance) {
      element.innerHTML = "Shopper";
      FinalInstance = instance;
      return FinalInstance.checkSeller(userAddress);
    }).then(function(isSeller) {
      if (isSeller != 0) {
        sellerPriv = true;
        element.innerHTML += ", Seller";
      } else {
        sellerPriv = false;
      }

    }).then(function() {
      return FinalInstance.checkAdmin.call(userAddress);
    }).then(function(isAdmin) {
      if (isAdmin != 0) {
        adminPriv = true;
        element.innerHTML += ", Admin";
      } else {
        adminPriv = false;
      }

    }).then(function() {

    }).catch(function(err) {
      alert(err.message);
    });
    App.updatePurchases();
    App.updateSales();
    App.updateUnsold();
  },

  updatePurchases: function() {
    var FinalInstance;

    buyNames.length = 0;
    buyStatus.length = 0;
    buyIndex.length = 0;

    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;

      return FinalInstance.getNumPurchases(userAddress);
    }).then(function(res) {
      var numPurchases = res;
      if (numPurchases > 0) {
        var j = -1;
        var all = [];
        var i;
        for (i = 0; i < numPurchases; i++) {

          var p = FinalInstance.getBuy(userAddress, i).then((Res_txIndex) => {
            tx.push(Res_txIndex);

            return FinalInstance.getTxInfo(Res_txIndex);
          }).then(function(res) {
            buyStatus.push(parseInt(res[1]));
            buyIndex.push(res[2]);
          }).then(function() {
            j++;
            return FinalInstance.getItemData(buyIndex[j]);

          }).then(function(res) {

            buyNames.push(res[0]);
          });

          all.push(p);
        }

        Promise.all(all).then(function() {
          App.sortBuys(); // March2020
          App.displayBatchOfItems();
        });

      }
    });
  },

  updateSales: function() {
    var FinalInstance;

    sellNames.length = 0;
    sellStatus.length = 0;
    sellIndex.length = 0;

    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;

      return FinalInstance.getNumSales(userAddress);
    }).then(function(res) {
      var numSales = res;
      if (numSales > 0) {
        var j = -1;
        var all = [];
        var i;
        for (i = 0; i < numSales; i++) {

          var p = FinalInstance.getSell(userAddress, i + 1).then((Res_txIndex) => {
            tx.push(Res_txIndex);
            return FinalInstance.getTxInfo(Res_txIndex);
          }).then(function(res) {
            sellStatus.push(parseInt(res[1]));
            sellIndex.push(res[2]);
          }).then(function() {
            j++;
            return FinalInstance.getItemData(sellIndex[j]);

          }).then(function(res) {

            sellNames.push(res[0]);

          });

          all.push(p);

        }


        Promise.all(all).then(function() {

          App.sortSales();
          App.displayBatchOfSales();
        });

      }
    });
  },


  updateUnsold: function() {
    var FinalInstance;

    unsoldNames.length = 0;
    unsoldStatus.length = 0;
    unsoldIndex.length = 0;

    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;

      return FinalInstance.getNumUnsold(userAddress);
    }).then(function(res) {
      var numUnsold = res;

      if (numUnsold > 0) {
        var all = [];
        var i;
        for (i = 0; i < numUnsold; i++) {

          var p = FinalInstance.getUnsold(userAddress, i).then((Res_itemNum) => {


            upForSale.push(Res_itemNum);
            return FinalInstance.getItemData(Res_itemNum);
          }).then(function(res) {
            unsoldNames.push(res[0]);
          });
          all.push(p);
        }


        Promise.all(all).then(function() {
          App.displayBatchOfForSale();
        });
      }
    });
  },

  sortSales: function() {
    sellNamesToShip.length = 0;
    sellNamesFinished.length = 0;
    sellStatusToShip.length = 0;
    sellStatusFinished.length = 0;
    sellIndexToShip.length = 0;
    sellIndexFinished.length = 0;

    for (var i = 0; i < sellNames.length; i++) {
      if (sellStatus[i] < 2) {
        sellNamesToShip.push(sellNames[i]);
        sellIndexToShip.push(sellIndex[i]);
        sellStatusToShip.push(sellStatus[i]);
      } else {
        sellNamesFinished.push(sellNames[i]);
        sellIndexFinished.push(sellIndex[i]);
        sellStatusFinished.push(sellStatus[i]);
      }
    }
  },

  sortBuys: function() {
    buyNamesFinal.length = 0;
    buyNamesToConfirm.length = 0;
    buyStatusFinal.length = 0;
    buyStatusToConfirm.length = 0;
    buyIndexFinal.length = 0;
    buyIndexToConfirm.length = 0;

    for (var i = 0; i < buyNames.length; i++) {
      if (buyStatus[i] == 3) {
        buyNamesFinal.push(buyNames[i]);
        buyIndexFinal.push(buyIndex[i]);
        buyStatusFinal.push(buyStatus[i]);
      } else {
        buyNamesToConfirm.push(buyNames[i]);
        buyIndexToConfirm.push(buyIndex[i]);
        buyStatusToConfirm.push(buyStatus[i]);
      }
    }
  },

  displayBatchOfForSale: function() {
    var forSaleItems = $('#listSaleItems3');
    var listTemplate = $('#listTemplate3');

    var numForSale = unsoldNames.length;

    for (var i = 0; i < numForSale; i++) {
      listTemplate.find('.item-name').text(unsoldNames[i]);
      listTemplate.find('.item-tx').text(unsoldIndex[i]);
      listTemplate.find('.item-status').text(states[0]);
      listTemplate.find('.btn-forsale').attr('data-id', forSaleButtonCount);
      forSaleItems.append(listTemplate.html());
      forSaleButtonCount++;
    }

  },

  displayBatchOfSales: function() {
    var sellItemsShip = $('#listSaleItems1');
    var sellItemsFinished = $('#listSaleItems2');
    var listTemplate = $('#listTemplate');
    var listTemplateGrey = $('#listTemplate2');

    var numSellShip = sellNamesToShip.length;
    var numSellFinished = sellNamesFinished.length;

    for (var i = 0; i < numSellShip; i++) {
      listTemplate.find('.item-name').text(sellNamesToShip[i]);
      listTemplate.find('.item-tx').text(sellIndexToShip[i]);
      listTemplate.find('.item-status').text(states[sellStatusToShip[i]]);
      listTemplate.find('.btn-view').attr('data-id', buttonCount);
      sellItemsShip.append(listTemplate.html());
      buttonCount++;
    }

    for (i = 0; i < numSellFinished; i++) {
      listTemplateGrey.find('.item-name').text(sellNamesFinished[i]);
      listTemplate.find('.item-tx').text(sellIndexFinished[i]);
      listTemplateGrey.find('.item-status').text(states[sellStatusFinished[i]]);
      listTemplateGrey.find('.btn-view').attr('data-id', buttonCount);
      sellItemsFinished.append(listTemplateGrey.html());
      buttonCount++;
    }
  },


  // New as of March2020
  displayBatchOfItems: function() {
    buttonCount = 0;
    forSaleButtonCount = 0;
    var buyItemsFinal = $('#listBuyItems');
    var buyItemsConfirm = $('#listBuyItems2');

    var listTemplate = $('#listTemplate');
    var listTemplateGrey = $('#listTemplate2');

    var numBuyDisplayed = buyNamesFinal.length;
    var numBuyConfirm = buyNamesToConfirm.length;

    for (var i = 0; i < numBuyDisplayed; i++) {
      listTemplateGrey.find('.item-name').text(buyNamesFinal[i]);
      listTemplateGrey.find('.item-tx').text(buyIndexFinal[i]);
      listTemplateGrey.find('.item-status').text(states[buyStatusFinal[i]]);
      listTemplateGrey.find('.btn-view').attr('data-id', buttonCount);
      buyItemsFinal.append(listTemplateGrey.html());
      buttonCount++;
    }

    for (var i = 0; i < numBuyConfirm; i++) {
      listTemplate.find('.item-name').text(buyNamesToConfirm[i]);
      listTemplate.find('.item-tx').text(buyIndexToConfirm[i]);
      listTemplate.find('.item-status').text(states[buyStatusToConfirm[i]]);
      listTemplate.find('.btn-view').attr('data-id', buttonCount);
      buyItemsConfirm.append(listTemplate.html());
      buttonCount++;
    }
  }

};




$(function() {
  $(window).load(function() {
    App.init();
  });
});
