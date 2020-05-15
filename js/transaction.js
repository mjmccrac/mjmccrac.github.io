var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const maxPriceInEth = 1000;
//const maxAuctionTime = 30*24; // hours - same as Solidity
const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later
const maxRating = 100;

tx = 0;

App = {


  web3Provider: null,
  userAddress:null,
  userBalance:0,
  adminPriv: false,
  sellPriv: false,
  buffer: '',
  img: [],
  contracts: {},
  ipfsHash:"",

  item_name:null,
  item_price:0,

  item_state:0,
  item_seller:null,
  item_buyer:null,
  item_ipfsHash:"",
  tx_rating:0,


 rate:function(){
   var FinalInstance;
   var rating;
   App.contracts.Final.deployed().then(function(instance) {
     FinalInstance = instance;
     if (tx_rating == 0){
       rating = prompt("Enter seller rating: 1-" + maxRating, rating);
       if (rating >= 1 && rating <= maxRating){
         FinalInstance.rateSeller(tx, rating);
       }
       else{
         alert ("invalid rating. must be between 1 and 5");
       }
     }
   });
 },
 receive: function(){
   var FinalInstance;
   var rateTx = 0;
   var rating = 0;
   App.contracts.Final.deployed().then(function(instance) {
     FinalInstance = instance;
     if (tx_rating == 0){
       if (confirm("Proceed to rate the seller?")){
        App.rate();
       }
     }
     FinalInstance.receiveItem(tx, 0, 0);
   });
 },
 confirmSent: function(){
   var FinalInstance;
   App.contracts.Final.deployed().then(function(instance) {
     FinalInstance = instance;
     if (userAddress == item_seller){
       FinalInstance.shipItem(tx);
     }
   });
 },

 choosePhoto: function(){
   //alert ("0");
   var pathElement = document.getElementById("itemPhoto");
   var imageElement = document.getElementById("design_display");
   const filePath = pathElement.value;
   var f = pathElement.files[0];
     var reader = new FileReader();
    // alert("1");
     reader.readAsDataURL(f);
     App.testIpfs();
     reader.onload = (function(theFile) {
       return function(e) {
         if (imageHash == item_ipfsHash) {
         imageElement.src = e.target.result;
       }
       };
     })(f);
     return(1);
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
    tx = sessionStorage.getItem("currentTx");
    ipfsHash = "";
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

    var rateButton = document.getElementById("btn-rate");
    rateButton.addEventListener('click', function(){
      App.rate(); // TODO - replace 0 with an index (page of results)
    });
    var receiveButton = document.getElementById("btn-receive");
    receiveButton.addEventListener('click', function(){
      App.receive(); // TODO - replace 0 with an index (page of results)
    });
    var confirmButton = document.getElementById("btn-confirm");
    confirmButton.addEventListener('click', function(){
      App.confirmSent(); // TODO - replace 0 with an index (page of results)
    });
    var refreshButton = document.getElementById("btn-refresh");
    refreshButton.addEventListener('click', function(){
      document.getElementById("itemPhoto").click();
      //App.refreshPic(); // TODO - replace 0 with an index (page of results)
    });
    var itemFile = document.getElementById("itemPhoto");
    itemFile.addEventListener('change', function() {
      App.choosePhoto();
    });

  },


  updateInterface: function(isSeller, isAdmin) {
    App.updateAccount();

    var element = document.getElementById("permissions");

    var FinalInstance;

    App.contracts.Final.deployed().then(function(instance) {
      //var currentAccount = web3.eth.accounts[0];
      element.innerHTML = "Shopper";
      FinalInstance = instance;
      return FinalInstance.checkSeller(userAddress); //return FinalInstance.getHighBidder(currentItem)
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

    }).then(function(){
      App.updateSellerInfo();
    }).catch(function(err) {
      alert (err.message);
    });

  },

  updateSellerInfo: function(){

    var FinalInstance;
    var fieldBuyer = document.getElementById("_Buyer");
    var fieldStatus = document.getElementById("_Status");
    var fieldSeller = document.getElementById("_Seller");
    var fieldSellerRating = document.getElementById("_SellerRating");
    var fieldSellerReviews = document.getElementById("_SellerReviews");
    var fieldJoinDate = document.getElementById("_JoinDate");
    var fieldNumSales = document.getElementById("_NumSales");
    var fieldCategory = document.getElementById("_keyword");
    var fieldName = document.getElementById("_name");
    var fieldPrice = document.getElementById("_price");
    var fieldTxInfo = document.getElementById("_Transaction");
    var fieldHash = document.getElementById("_add_pic");
    var fieldSellerEmail = document.getElementById("_SellEmail");
    var fieldBuyerEmail = document.getElementById("_BuyerEmail");
    var fieldLocation = document.getElementById("_location");


    App.contracts.Final.deployed().then(function(instance) {
      FinalInstance = instance;

      return FinalInstance.getTxInfo(tx);

      }).then(function(res){
        item_buyer = res[0];
        item_state = res[1];
        currentItem = res[2];
        tx_rating = res[3];

        return FinalInstance.getItemData(currentItem);

      }).then(function(res) {
        item_name = res[0];
        item_price = parseFloat(web3.fromWei(parseInt(res[1]), 'ether'));
        item_seller = res[3];

        document.getElementById("btn-rate").style.visibility = "hidden";
        document.getElementById("btn-receive").style.visibility = "hidden";
        document.getElementById("btn-confirm").style.visibility = "hidden";

        if (userAddress == item_seller){
          if (item_state < 3){
            document.getElementById("btn-confirm").style.visibility = "visible";
          }

        }
        else if (userAddress == item_buyer){
          if (tx_rating == 0){
            document.getElementById("btn-rate").style.visibility = "visible";
          }
          if (item_state != 3){
            document.getElementById("btn-receive").style.visibility = "visible";
          }
        }


    }).then(function(res){

      return FinalInstance.sellerInfo(item_seller);
    }).then(function(res) {
    //  alert(res[0]);
      slr_Rating = parseFloat(res[0]);
      slr_numRat = parseInt(res[1]);
      slr_numSale = parseInt(res[2]);
      slr_jDate = parseInt(res[3]);
      var joinDate = new Date(slr_jDate*1000);
      fieldSellerRating.value = slr_Rating;
      fieldSeller.value = item_seller;
      fieldBuyer.value = item_buyer;
      fieldStatus.value = states[item_state];
      fieldSellerReviews.value = slr_numRat;
      fieldJoinDate.value = joinDate;
      fieldNumSales.value = slr_numSale;
      fieldName.value = item_name;
      fieldPrice.value = item_price;
      fieldTxInfo.value = tx;

      return FinalInstance.getCategory(currentItem);
    }).then(function(res) {
      item_cat = res;
      fieldCategory.value = res;
      return FinalInstance.getIpfsHash(currentItem);
    }).then(function(res) {
      item_ipfsHash = res;
    //  alert ("updateSellerInfo5");
      fieldHash.value = item_ipfsHash;
      App.IPFSdisplay(item_ipfsHash);
      return FinalInstance.getEmail(item_seller)
    }).then(function(res){
    //  alert("get seller email");
      fieldSellerEmail.value = web3.toAscii(res);
      return FinalInstance.getEmail(item_buyer)
    }).then(function(res){
      fieldBuyerEmail.value = web3.toAscii(res);
      return FinalInstance.getLocation(currentItem);
    }).then(function(res){
      fieldLocation.value = res;
});

  },

  //---------------------------------------------------------------------


  setProductPhoto: function() {

    var pathElement = document.getElementById("itemPhoto");
    IpfsNode.on('ready', () => {
      const file = pathElement.value;
      var reader = new FileReader();
      reader.onload = function(event) {
        image = ipfs.types.Buffer(e.target.result);
        addIPFS(image, function(hash) {
          var imageHash = hash;
      });
    };
    reader.readAsArrayBuffer(file);
    return (imageHash);
  });
  },

  //---------------------------------------------------------------------


  getImg: function(hash, refFunc) {

    var buf =[];

    App.contracts.Final.deployed().then(function(instance) {
      // download image
      ipfs.on('ready', async () => {
          const version = await node.version();
          element.innerHTML = version.version;
      });
  }); // deployed

},


testIpfs: async function(){

  alert ("Controls intentionally frozen while sending to IPFS. If screen stays frozen, refresh and try again.");
  var pathElement = document.getElementById("itemPhoto");
  var imageElement = document.getElementById("design_display");
  const filePath = pathElement.value;
  var f = pathElement.files[0];
    var reader = new FileReader();
    reader.onloadend = (function(theFile) {
      image = window.IpfsApi().Buffer(reader.result);
      IpfsNode.files.add(image, (err, result) => {
        if(err || !result) {
          alert("error");
          return;
        }
        var imageHash = result[0].hash;
        alert("ipfs hash: " + imageHash);
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
        //window.URL.revokeObjectURL(blob);
        //alert("blob revoked")
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
