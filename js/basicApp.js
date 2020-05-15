var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", /*"For Auction",*/ "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const maxPriceInEth = 1000;
//const maxAuctionTime = 30*24; // hours - same as Solidity
const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later

App = {


  web3Provider: null,
  userAddress:null,
  userBalance:0,
//  ipfsHash: null,
  adminPriv: false,
  sellPriv: false,
  buffer: '',
  img: [],
  contracts: {},
  ipfsHash:"",

  item_name:null,
  item_price:0,
  /*item_auction_start:0,
  item_auction_length:0,
  item_auction_end:0,*/
  item_high_bid:0,
  item_high_bidder:null,
  item_state:0,
  item_seller:null,
  item_ipfsHash:"",
//  auction_or_sell:0,



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
  },


  updateInterface: function(isSeller, isAdmin) {
    //var itemCount = 0;
    App.updateAccount();

    var element = document.getElementById("permissions");

    var FinalInstance;

    App.contracts.Final.deployed().then(function(instance) {
      //var currentAccount = web3.eth.accounts[0];
      element.innerHTML = "Shopper";
      FinalInstance = instance;
      //alert(userAddress)
      return FinalInstance.checkSeller(userAddress); //return FinalInstance.getHighBidder(currentItem)
    }).then(function(isSeller) {
      //alert(isSeller)
      if (isSeller != 0) {
        sellerPriv = true;
        element.innerHTML += ", Seller";
      } else {
        sellerPriv = false;
        alert("not seller");
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

    }).catch(function(err) {
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
  var element = document.getElementById("current_item_display");
//  var url = 'https://ipfs.io/ipfs/${result[0].hash}'

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
