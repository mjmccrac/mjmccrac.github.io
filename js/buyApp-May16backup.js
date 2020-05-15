var currentItem = 0;
var itemCount = 0;
const states = ["For Sale", "For Auction", "Sold", "Shipped", "Received"];
const IpfsNode = new window.IpfsApi({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });
const maxPriceInEth = 1000;
const maxAuctionTime = 30*24; // hours - same as Solidity
const minSaleQty = 1;
const maxSaleQty = 100000000;
const maxStringLength = 36; // Arbitrary for now. Optimize later

App = {

    // general global variables
    web3Provider: null,
    userAddress:null,
    userBalance:0,
    adminPriv: false,
    sellPriv: false,
    buffer: '',
    img: [],
    contracts: {},
    ipfsHash:"",

    // specific item variables
    item_name:null,
    item_price:0,
    item_auction_start:0,
    item_auction_length:0,
    item_auction_end:0,
    item_high_bid:0,
    item_high_bidder:null,
    item_state:0,
    item_seller:null,
    item_qty: 0,
    item_cat: "",
    slr_Rating:0,
    slr_numRat:0,
    slr_jDate: 0,
    slr_numSale:0,
    item_ipfsHash:"",
    auction_or_sell:0,

    // html field variables
    //fieldHash: document.getElementById("_add_pic"),
    //fieldPicture: document.getElementById("design_display"),
    //fieldAuctionTimer: document.getElementById("_sale_auction"),
    //fieldPrice: document.getElementById("_price"),
    //fieldQuatity: document.getElementById("_sale_quantity"),
    //fieldName: document.getElementById("_name"),
    //fieldCategory: document.getElementById("_keyword"),
    //fieldSeller: document.getElementById("_Seller"),
    //fieldSellerRating: document.getElementById("_SellerRating"),
    //fieldSellerReviews: document.getElementById("_SellerReviews"),
    inputShipping: document.getElementById("item_shipping"),
    inputBid: document.getElementById("bid_amt"),
    buttonFinalize: document.getElementById("btn-finalize"),

    bidItem: function() {
      // account > price, for sale
      App.updateAccount();
      if (userBalance > item_high_bid &&
        item_state == 1 &&
        userAddress != item_seller) {
        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          var nextBid = parseFloat(item_high_bid + 1);
          var bidVal = prompt("Enter Bid in eth", nextBid);
          FinalInstance.submitBid(currentItem, {
            from: web3.eth.accounts[0],
            value: web3.toWei(bidVal, 'ether'),
            gas: 4000000 //TODO reduce
          });
        });
        //    App.listItems();
      } else {
        alert("Error: Can't bid. Balance: " + userBalance + ", state: " + item_state +
          ", user_add: " + userAddress + ", seller_add: " + item_seller);
      }
    },

    buyItem: function() {
      App.updateAccount();
      if ((userBalance > item_price) &&
        (item_state == 0) &&
        (userAddress != item_seller)) {
        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          FinalInstance.buyItem(currentItem, {
            from: web3.eth.accounts[0],
            value: web3.toWei(item_price, 'ether'),
            gas: 4000000
          });
        });
        //    App.listItems();
      } else {
        alert("Error: Can't buy");
      }
    },
      updateSellerInfo: function(){
        var FinalInstance;
        var fieldSellerRating = document.getElementById("_SellerRating");
        var fieldSellerReviews = document.getElementById("_SellerReviews");
        var fieldJoinDate = document.getElementById("_JoinDate");
        var fieldNumSales = document.getElementById("_NumSales");
        var fieldHBidder = document.getElementById("_hBidder");
        var fieldQuantity =  document.getElementById("_sale_quantity");
        var fieldCategory = document.getElementById("_keyword");

      //  alert("updateSellerInfo: " + item_seller);
        App.contracts.Final.deployed().then(function(instance) {
          FinalInstance = instance;
          alert("item_seller: " + item_seller);
          return FinalInstance.sellerInfo(item_seller);
        }).then(function(res) {
          alert(res[0]);
          slr_Rating = parseFloat(res[0]);
          slr_numRat = parseInt(res[1]);
          slr_numSale = parseInt(res[2]);
          slr_jDate = parseInt(res[3]);
          var joinDate = new Date(slr_jDate*1000);
          //alert("address : " + item_seller + ". Rating: " + slr_Rating);
          fieldSellerRating.innerHTML = slr_Rating;
          fieldSellerReviews.innerHTML = slr_numRat;
          fieldJoinDate.innerHTML = joinDate;
          fieldNumSales.innerHTML = slr_numSale;

          return FinalInstance.getQuantity(currentItem);
        }).then(function(res) {
          alert("qty = " + parseInt(res));
          item_qty = parseInt(res);
          fieldQuantity.innerHTML = parseInt(res);

          return FinalInstance.getCategory(currentItem);
        }).then(function(res) {
        //  alert(res);
          item_cat = res;
          fieldCategory.innerHTML = res;

          return FinalInstance.getItemData(currentItem);
          }).then(function(res) {
            item_name = res[0];
            alert ("ITEM NAME = " + item_name);
            item_price = parseFloat(web3.fromWei(parseInt(res[1]), 'ether'));
            item_auction_start = parseInt(res[2]);
            item_auction_length = parseInt(res[3]);
            item_auction_end = item_auction_start + item_auction_length;
            item_high_bid = parseFloat(web3.fromWei(parseInt(res[4]), 'ether'));
            item_state = parseInt(res[5]);
            item_seller = res[6];
            var fieldAuctionTimer = document.getElementById("_sale_auction");
            auction_or_sell = item_state;

            //fieldPicture: document.getElementById("design_display")
            if (auction_or_sell == 0) { // for sale
              auctionString = "Item for sale";
            }
            else if (auction_or_sell == 1) { // auction
              var unixTime = Date.now() / 1000; //Math.round((new Date()).getTime() / 1000);
              var countdown = item_auction_end - unixTime; // need to import item_auction_end
              var countdown_hours = parseInt(countdown / 3600);
              var countdown_min = parseInt((countdown - 3600 * countdown_hours) / 60);
              var elapsedTime = unixTime - item_auction_start; // need to import item_auction_start
              var elapsed_hours = parseInt(elapsedTime / 3600);
              var elapsed_min = parseInt((elapsedTime - 3600 * elapsed_hours) / 60);
              auctionString = "Auction. Started " + elapsed_hours + " h, " + elapsed_min + " minutes ago. Time remaining: " + countdown_hours + " h, " + countdown_min + "minutes";
            }
            fieldAuctionTimer.innerHTML = auctionString;
            alert ("this far");
            return FinalInstance.getHighBidder(currentItem);
            }).then(function(res) {
              if (auction_or_sell == 1) {
                if (res == "0x0000000000000000000000000000000000000000"){
                  fieldHBidder.innerHTML = "NO BIDDERS YET";
                }
                else{
                  fieldHBidder.innerHTML = res;
              }
              }
        });
      },

      init: async function() {
        currentItem = window.opener.currentItem; alert(currentItem);

        item_name = window.opener.displayName[currentItem]; // dname;
        item_price = window.opener.displayPrice[currentItem];
        item_state= window.opener.displayStatus[currentItem];
        item_seller = window.opener.displaySeller[currentItem];
        item_ipfsHash = window.opener.displayIpfsHash[currentItem];
        auction_or_sell= window.opener.displayStatus[currentItem];
        var num = window.opener.displayName.length;
        //alert (num);
      //  alert("item # = " + currentItem + ", name = " + item_name + ", price = " + item_price + ", state = " + item_state +  ", seller = " + item_seller + ", hash = " + item_ipfsHash);

        return await App.initWeb3();
      },

      initFields: function(){
        var fieldHash = document.getElementById("_add_pic");

        var fieldPrice = document.getElementById("_price");
        //var fieldQuantity =  document.getElementById("_sale_quantity");
        var fieldName = document.getElementById("_name");
      //  var fieldCategory = document.getElementById("_keyword");
        var fieldSeller = document.getElementById("_Seller");
        //var fieldSellerRating = document.getElementById("_SellerRating");
        //var fieldSellerReviews = document.getElementById("_SellerReviews");

        fieldHash.innerHTML = item_ipfsHash;

        /*var fieldAuctionTimer = document.getElementById("_sale_auction");
        //fieldPicture: document.getElementById("design_display")
        if (auction_or_sell == 0) { // for sale
          auctionString = "Item for sale";
        }
        else if (auction_or_sell == 1) { // auction
          var unixTime = Date.now() / 1000; //Math.round((new Date()).getTime() / 1000);
          alert("Before Fail Point");
          var countdown = item_auction_end - unixTime; // need to import item_auction_end
          alert ("OK");
          var countdown_hours = parseInt(countdown / 3600);
          var countdown_min = parseInt((countdown - 3600 * countdown_hours) / 60);
          var elapsedTime = unitTime - item_auction_start; // need to import item_auction_start
          var elapsed_hours = parseInt(elapsedTime / 3600);
          var elapsed_min = parseInt((elapsedTime - 3600 * elapsed_hours) / 60);
          auctionString = "Auction. Started " + elapsed_min + " minutes ago. Time remaining: " + countdown_min + "minutes";
        }
        fieldAuctionTimer.innerHTML = auctionString;
*/
        fieldPrice.innerHTML = item_price;
        fieldName.innerHTML = item_name;
        fieldSeller.innerHTML = item_seller;

        App.IPFSdisplay(item_ipfsHash);
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
          switch (item_state) {
            case 0:
              App.buyItem();
              break;
            case 1:
              App.bidItem();
              break;
            default:
              alert("Can't buy at this time");
              break;
          }
        });
      },

      updateInterface: function(isSeller, isAdmin) {
        //var itemCount = 0;
        App.updateAccount();

        var element = document.getElementById("permissions");
        //alert(item_name);

        var FinalInstance;

        App.contracts.Final.deployed().then(function(instance) {
          //var currentAccount = web3.eth.accounts[0];
        //  alert("4");
          element.innerHTML = "Shopper";
          FinalInstance = instance;
        //  alert("5");
          //alert(userAddress)
          return FinalInstance.checkSeller(userAddress); //return FinalInstance.getHighBidder(currentItem)
        }).then(function(isSeller) {
          //alert(isSeller)
          if (isSeller != 0) {
            sellerPriv = true;
            element.innerHTML += ", Seller";
          } else {
            sellerPriv = false;
          //  alert("not seller");
          }
          // Do something with list of for sale items
          // retrieve product data (name, price, seller, ipfsHash, auction info, etc)
          // retrieve pictures from IPFS

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
          console.log(err.message);
          alert (err.message);
          var element = document.getElementById("test2");
          element.innerHTML = err.message;
        });

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

      //---------------------------------------------------------------------

      choosePhoto: function(){
        /*
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
          return(1);*/
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
/*
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
      */
    },


    IPFSdisplay: function(hash){
      //var element = document.getElementById("current_item_display");
    //  var url = 'https://ipfs.io/ipfs/${result[0].hash}'
      var fieldPicture = document.getElementById("design_display");
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
          fieldPicture.src = img;
        });
      }).catch(function(err){
        fieldPicture.innerHTML = err;
      });
    },
};


$(function() {
  $(window).load(function() {
    App.init().then(function(){
      //App.updateSellerInfo();
    }).then(function(){
      App.initFields();
      App.updateSellerInfo();
    });
  //  App.initFields();
  });
});
