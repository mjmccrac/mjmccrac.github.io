var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const maxPriceInEth = 1000;
//const maxAuctionTime = 30*24; // hours - same as Solidity
const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later
//var auction_or_sell = 0;

App = {


  web3Provider: null,
  userAddress:null,
  userBalance:0,
  adminPriv: false,
  sellerPriv: false,
  buffer: '',
  img: [],
  contracts: {},
  ipfsHash:"",

  item_name:null,
  item_price:0,

  item_state:0,
  item_seller:null,
  item_ipfsHash:"",



  finalizePosting: function(){

    var noErrors = true;
    var continueWithoutPicture;
    if (ipfsHash == ""){
      continueWithoutPicture = confirm("No picture attached through IPFS. Continue without picture?");
      if (!continueWithoutPicture){return;}
    }


    var errorMsg = "";

    if (!sellerPriv){
      noErrors = false;
      errorMsg += "You do not have seller privilege";
    }

    // Check each of the following and add to error message
    // price or start bid is a valid number and > min and < max
    var itemPrice = document.getElementById("item_price").value;
    var weiPrice = web3.toWei(itemPrice, 'ether');
    if (itemPrice <= 0 || itemPrice > maxPriceInEth){
      noErrors = false;
      errorMsg += "Invalid price (must be between 0 - " + maxPriceInEth + " Eth) \n";
    }

    var location = document.getElementById("item_shipping").value;
    location = location.toUpperCase();
    // sale quantity is valid number, > min, < max
    var sale_quantity = document.getElementById("item_quantity").value;
    if (sale_quantity < minSaleQty || sale_quantity > maxSaleQty){
      noErrors = false;
      errorMsg += "Invalid quantity (must be between "+ minSaleQty+ " - " + maxSaleQty + " units) \n";
    }


    // Name is valid as per the solidity requirement
    var itemName = document.getElementById("item_name").value;
    itemName = itemName.toUpperCase();
    if (itemName.lenth > maxStringLength || itemName.length == 0){
      noErrors = false;
      errorMsg += "Invalid item name (must be between 1 and " + maxStringLength + " characters) \n";
    }

    // One keyword - no spaces - check solidity char limit
    var itemKeyword = document.getElementById("item_keywords").value;
    itemKeyword = itemKeyword.toUpperCase();
    var numKeywordsEntered = itemKeyword.split(" ").length;
    if (itemKeyword.lenth > maxStringLength || numKeywordsEntered > 1){
      noErrors = false;
      errorMsg += "Invalid keyword (due to memory limitations, must have 0 or 1 keywords with fewer than " + maxStringLength + " characters) \n";
    }
    // If errors, alert of all errors and do not call any solidity functions

    if (noErrors){
      // Post to chain
      App.contracts.Final.deployed().then(function(instance) {
        FinalInstance = instance;
        alert ("about to post to chain: " + itemName + ", "+  weiPrice + ", " + ipfsHash+ ", "+ sale_quantity+ ", "+ itemKeyword);
        FinalInstance.editItem(itemName, weiPrice, ipfsHash, sale_quantity, itemKeyword, currentItem, location);

      }).catch(function(err) {
        element.innerHTML = err.message;
        alert (err.message);
      });
    }
    else{
      alert (errorMsg);
    }

  },

  updateAccount: function(){
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
    currentItem = sessionStorage.getItem("currentItem");
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
    //$(document).on('click', 'btn-update', App.quickTest;
    var finalizeButton = document.getElementById("btn-finalize");
    finalizeButton.addEventListener('click', function() {
      App.finalizePosting();
    });
    var itemFile = document.getElementById("itemPhoto");
    itemFile.addEventListener('change', function() {
      App.choosePhoto();
    });
    var radioSale = document.getElementById("radio_sale");

  },

  updateFields: function(){

    var FinalInstance;
    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;
      return FinalInstance.getItemData(currentItem);

      }).then(function(res) {
        item_name = res[0];
        document.getElementById("item_name").value = item_name;
        item_price = parseFloat(web3.fromWei(parseInt(res[1]), 'ether'));
        document.getElementById("item_price").value = item_price;
        item_state = parseInt(res[2]);
        item_seller = res[3];
        return FinalInstance.getQuantity(currentItem);
      }).then(function(res) {
        item_qty = parseInt(res);
        document.getElementById("item_quantity").value = parseInt(res);
        return FinalInstance.getCategory(currentItem);
      }).then(function(res) {
        item_cat = res;
        document.getElementById("item_keywords").value = item_cat;
        return FinalInstance.getLocation(currentItem);
      }).then(function(res){
        var item_loc = res;
        document.getElementById("item_shipping").value = item_loc;
        return FinalInstance.getIpfsHash(currentItem);
      }).then(function(res) {
        item_ipfsHash = res;
        ipfsHash = item_ipfsHash;
        document.getElementById("picHash").value = item_ipfsHash;
        App.IPFSdisplay(item_ipfsHash);
      });

  },


  updateInterface: function(isSeller, isAdmin) {

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
        alert("You do not have seller privileges. Please submit request for seller privileges");
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

    }).then(function(){
      App.updateFields();

    }).catch(function(err) {
      console.log(err.message);
      alert (err.message);

    });

  },

  //---------------------------------------------------------------------

  choosePhoto: function(){
    var pathElement = document.getElementById("itemPhoto");
    var imageElement = document.getElementById("design_display");
    const filePath = pathElement.value;
    var f = pathElement.files[0];
      var reader = new FileReader();
      reader.onload = (function(theFile) {
        return function(e) {
          imageElement.src = e.target.result;
        };
      })(f);
     reader.readAsDataURL(f);
      App.testIpfs();
      return(1);
  },


  //---------------------------------------------------------------------



testIpfs: async function(){

  alert ("Controls intentionally frozen while sending to IPFS. If screen stays frozen, refresh and try again.");
  document.getElementById("btn-finalize").disabled = true;
  var pathElement = document.getElementById("itemPhoto");
  var imageElement = document.getElementById("design_display");
  const filePath = pathElement.value;
  var f = pathElement.files[0];
    var reader = new FileReader();
    reader.onloadend = (function(theFile) {
      image = window.IpfsApi().Buffer(reader.result);
      IpfsNode.files.add(image, (err, result) => { // Upload buffer to IPFS
        if(err || !result) {
          alert("error");
          document.getElementById("btn-finalize").disabled = false;
          return;
        }
        var imageHash = result[0].hash;
        alert("ipfs hash: " + imageHash);
        document.getElementById("btn-finalize").disabled = false;
        ipfsHash = imageHash;
  });
});
   reader.readAsArrayBuffer(f);
  return(1);
},


IPFSdisplay: function(hash){
  var element = document.getElementById("design_display");
  var buf = [];

  IpfsNode.files.cat(hash).then(function(stream) {
    stream.on('data', (file) => {
      data = Array.prototype.slice.call(file);
      buf = buf.concat(data);
    });
    stream.on('end', (file) => {
      if (typeof blob !== 'undefined') {
      }
      // create new blob
      buf = window.IpfsApi().Buffer(buf);
      blob = new Blob([buf], {type: "image/jpg" });
      img = window.URL.createObjectURL(blob);
      element.src = img;
    });
  }).catch(function(err){
    element.innerHTML = err;
  });
},

};


$(function() {
  $(window).load(function() {
    App.init();
  });
});
