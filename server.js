require('dotenv').config()

const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const nodemailer = require('nodemailer');
const converter = require('json-2-csv');
const Podio = require('podio-js').api;
const cron = require('node-cron');
const Connection = require('tedious').Connection;
const Request = require('tedious').Request;


//const fields = ['address','unit','zip','garea','larea','beds','baths','pool','wf','build','frclosure','sold_price','tax_value','land_value','build_value','phone_number_2','phone_number_1','owner_zip','owner_state','owner_country','owner_city','owner_address','owner'];
const fields = ['address','unit','zip','garea','larea','beds','baths','pool','wf','build','frclosure','sold_price','tax_value','land_value','build_value'];


const boxResults = '#box_result_INDEX > td > #title_result > a';
const zipResults = '#pagtag_table > tbody > tr:nth-child(3) > td:nth-child(2)';
const addressResults = '#pagtag_table > tbody > tr:nth-child(1) > td:nth-child(2)';
const bedBathResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(4) > td:nth-child(2)';
const grossAreaResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(4)';
const livingAreaResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(2) > td:nth-child(4)';
const poolResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(6) > td:nth-child(4)';
const waterFrontResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(5) > td:nth-child(4)';
const builtResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(5) > td:nth-child(2)';
const foreclosureResults ='#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(6)';
const soldPriceResults = '#pagtag_table > tbody > tr:nth-child(13) > td:nth-child(4)';
const taxValueResults = '#pagtag_table > tbody > tr:nth-child(11) > td:nth-child(4)';
const landValueResults = '#pagtag_table > tbody > tr:nth-child(11) > td:nth-child(2)';
const buildValueResults = '#pagtag_table > tbody > tr:nth-child(10) > td:nth-child(2)';
const cityValueResults = '#pagtag_table > tbody > tr:nth-child(2) > td:nth-child(2)';
const ownerNameValueResults = '#pagtag_table > tbody > tr:nth-child(1) > td:nth-child(2)';
const ownerAddressValueResults = '#pagtag_table > tbody > tr:nth-child(2) > td:nth-child(2)';
const ownerZipCodeValueResults = '#pagtag_table > tbody > tr:nth-child(3) > td:nth-child(2)';
const ownerCityValueResults = '#pagtag_table > tbody > tr:nth-child(2) > td:nth-child(4)';
const ownerStateValueResults = '#pagtag_table > tbody > tr:nth-child(3) > td:nth-child(4)';
const ownerPhoneNumber1ValueResults = '#pagtag_table > tbody > tr:nth-child(5) > td:nth-child(2)';


var thecsv = null;

let {google} = require('googleapis');
let OAuth2 = google.auth.OAuth2;

let oauth2Client = new OAuth2(
	//ClientID
	process.env.GMAIL_CLIENTID,
	
	//Client Secret
	process.env.GMAIL_SECRET,
	
	//Redirect URL
	"https://developers.google.com/oauthplayground"
);

 // Create connection to database
var sqlconfig = 
{
  userName: process.env.AZURE_SQL_USERNAME, // update me
  password: process.env.AZURE_SQL_PASSWORD, // update me
  server: process.env.AZURE_SQL_SERVER, // update me
  options: 
     {
        database: process.env.AZURE_SQL_DATABASE_NAME //update me
        , encrypt: true
     }
}

var connection = new Connection(sqlconfig);


async function getREIFaxData(){

    // Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) 
{
  if (err) 
    {
       console.log(err)
    }
 else
    {
        //queryDatabase(item)
    }
}
);
	
//console.log(Date.now());
//const browser = await puppeteer.launch({headless: true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--window-size=800,600',"--proxy-server='direct://'",'--proxy-bypass-list=*','--ignore-certificate-errors','ignore-certificate-errors-spki-list','--remote-debugging-port=9222','--remote-debugging-address=0.0.0.0','--allow-insecure-localhost','--disable-web-security','--disable-gpu']},{sloMo: 350}, {ignoreHTTPSErrors: true},{dumpio: true});
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--ignore-certificate-errors','--disable-gpu','--window-size=800,600',"--proxy-server='direct://'",'--proxy-bypass-list=*','--enable-features=NetworkService']},{sloMo: 350}, {ignoreHTTPSErrors: true});

const page = await browser.newPage();
const navigationPromise = page.waitForNavigation();

await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');

const EMAIL_USERNAME_SELECTOR = '#inputEmail';
const PASSWORD_SELECTOR = '#inputPassword';
const SIGNIN_BUTTON_SELECTOR = '#submitButton';


const ADVANCED_BUTTON_SELECTOR = '#ext-comp-1031__searchTabAdv';
const ADVANCED_BUTTON_SELECTOR2 = '#ext-comp-1032__searchTabAdv';
const COUNTY_DROPDOWN = '#ncounty';
const FORECLOSURE = '#nforeclosure';
const FORECLOSURE_BUTTON = '#ext-gen130';
const FILEDATE_BETWEEN = '#ext-gen391';


await page.goto('https://www.reifax.com/login/index.php?logPrincipal=true',{waitUntil: 'networkidle2'});

try
{
  await navigationPromise;
}
catch(err){
  console.log(err);
}

await page.click(EMAIL_USERNAME_SELECTOR);
await page.keyboard.type(process.env.REIFAX_USERNAME);


await page.click(PASSWORD_SELECTOR);
await page.keyboard.type(process.env.REIFAX_PASSWORD);


await page.click(SIGNIN_BUTTON_SELECTOR,{delay:1000} );

try
{
  await navigationPromise;
}
catch(err){
  console.log(err);
}


await page.waitForNavigation({waitUntil:'networkidle2'});

await page.waitForSelector('#ext-gen58');

await page.click('#ext-gen29');

await page.waitForSelector('#principal__searchTab');


try
{
	await page.click('#ext-comp-1038__searchTabAdv',{delay:2000});
}
catch(err)
{
	console.log(err);
	
}

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.focus(COUNTY_DROPDOWN, {delay:2000});

await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter');


await page.focus(FORECLOSURE, {delay:2000});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter');

//await page.click(FORECLOSURE_BUTTON, {delay:2000});

await page.click('#ext-gen167', {delay:2000});


//await page.focus(FILEDATE_BETWEEN, {delay:2000});
await page.click('#ext-gen436',{delay:2000});

await page.focus('#ext-gen517',{delay:2000});

await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter');


 const d = new Date();
 
  
const dateString = formatDate(d);
const dateFirstDayString = formatDateFirstOfMonth(d);
const intakeDate = formatIntakeDate(d);
const sourceData = formatSource(d);
  //console.log(dateString);
  
  //await page.click('#ext-gen392',{delay:2000});
  
  await page.click('#ext-gen439',{delay:2000});
  

  //await page.keyboard.type(dateString),{delay:1000};
  await page.keyboard.type('20180601'),{delay:1000};
  //await page.keyboard.type(dateFirstDayString),{delay:1000};
  
  //await page.click('#ext-gen394',{delay:2000});
  await page.click('#ext-gen441',{delay:2000});
  
  //await page.keyboard.type('20180607'),{delay:1000};
  await page.keyboard.type(dateString),{delay:1000};
  
  try
  {
	  
    //await page.click('#ext-gen93'),{delay:5000};
    await page.click('#ext-gen131'),{delay:5000};
	
  }
  catch(err)
  {
	  console.log(err);
	  await page.click('#ext-gen130'),{delay:5000};
  }
  
  
  
   try
   {
	await page.waitForSelector('#result_orderby_asc');
   }
   catch(error2)
   {
	   console.log(error2);
	   sendZeroResultsEmail();
	   await browser.close();
   }
	   
  
   //let results = await page.evaluate((sel) => {
   //    let element = document.querySelector(sel);
   // return element? element.innerHTML:null;
   //   }, '#ext-gen525 > div > div:nth-child(1) > table > tbody > tr > td:nth-child(2)');

   // var res = results.split(" ");
	
   // var queryPropertieCount = res[19];
	
	
 
  
 
 var viewData = [];
 
 
 
 let pageNumber = await page.evaluate((sel) => {
		let elements = Array.from(document.querySelectorAll(sel));
		return elements.length;
 }, '#ext-gen541 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > select > option');
 
 //#ext-gen541 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > select
 
	//console.log(pageNumber);
   
   pageNumber = pageNumber-1;
 
  for (let i = 0; i <= pageNumber ; i++) 
{
 
   if(i > 0)
   {
    	//await page.click('#ext-gen525 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > a:nth-child(4)');
        
        await page.click('#ext-gen541 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > a:nth-child(4)');
        

        await page.waitForSelector('#result_orderby_asc');
   }
 
 
    let boxResult1  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
		}, '#box_result_0');
		
		
	//console.log(boxResult1);
  
  let boxResult2  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, '#box_result_1');
		
	//console.log(boxResult2);
	
  let boxResult3  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, '#box_result_2');
		
	//console.log(boxResult3);
	
  let boxResult4  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, '#box_result_3');
		
	//console.log(boxResult4);
	
 let boxResult5  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
		}, '#box_result_4');
		
	//console.log(boxResult5);
	
let boxResult6  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, '#box_result_5');
		
	//console.log(boxResult6);
	
let boxResult7  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, '#box_result_6');
		
	//console.log(boxResult7);
  
let boxResult8  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
	}, '#box_result_7');
		
	//console.log(boxResult8);
	
let boxResult9  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, '#box_result_8');
		
	//console.log(boxResult9);
	
let boxResult10  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
	}, '#box_result_9');
		
	//console.log(boxResult10);
  
  let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10);
  boxNumbers  = boxNumbers -1;
  
  for (let i = 0; i <= boxNumbers ; i++) 
{

	 let boxSelector = boxResults.replace("INDEX", i);
	 let bedBathSelector = bedBathResults.replace("INDEX", i);
	 let grossAreaSelector = grossAreaResults.replace("INDEX", i);
	 let livingAreaSelector = livingAreaResults.replace("INDEX", i);
	 let poolSelector = poolResults.replace("INDEX", i);
	 let waterFrontSelector = waterFrontResults.replace("INDEX",i);
	 let builtSelector = builtResults.replace("INDEX",i);
	 let foreclosureSelector = foreclosureResults.replace("INDEX",i);
	
     let box_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
	  
	   let bedBath_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, bedBathSelector);
	  
	   let grossArea_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, grossAreaSelector);
	  
	   let livingArea_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, livingAreaSelector);
	  
	   let pool_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, poolSelector);
	  
	  let waterFront_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, waterFrontSelector);
	  
	   let built_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, builtSelector);
	  
	   let foreclosure_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, foreclosureSelector);
	  
	  
	  
	  
	  res = box_result.split(",");
	  
	  
	 //console.log(res);  
	 
	 //var addr = res[0].split(" ");
	 
	 //var address = addr[32] +  ' ' + addr[33] + ' ' + addr[34];
	 
	 //console.log(address);
	
	
	// var zip = res[2].replace(/ /g, '');
	 
	 //console.log(zip);
	 
	 //console.log(bedBath_result);
	 
	 var temp = bedBath_result.split("/");
	 
	 var bed = temp[0];
	 
	 var content = bed.toString().replace(/\t/g, '').split('\n');
	 
	 //console.log(content);
	 
	 bed = content[1];
	 
	 //console.log(bed);
	 
	 var baths = temp[1];
	 
	 //console.log(baths);
	 
	 var grossLivingTemp = grossArea_result.toString().replace(/\t/g, '').split('\n');
	 
	 var gLiving = grossLivingTemp[1];
	 
	 //console.log(gLiving);
	 
	 var livingTemp = livingArea_result.toString().replace(/\t/g, '').split('\n');
	 
	 var lArea = livingTemp[1];
	 
	 
	 await page.click(boxSelector);
	 
	 await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});
	 
	 let address_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, addressResults);
	 
	 
	  let zip_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, zipResults);
	 
	 
	  let soldPrice_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, soldPriceResults);
	 
	  let taxValue_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, taxValueResults);
	 
	 let landValue_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, landValueResults);
	  
	   let buildValue_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, buildValueResults);
	  
	   let cityValue_result = await page.evaluate((sel) => {
       let element = document.querySelector(sel);
       return element? element.innerHTML:null;
      }, cityValueResults);
	  
	   let list_length  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
		}, '#pagtag_table');
	
	  //console.log(list_length);
	  
      var href = 'N/A';
      
      var Owner = [];
      //#pagtag_table > tbody > tr:nth-child(1) > td:nth-child(2)
      
	  for(let i=1; i< list_length; i++){
         href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[1];
                    //let name = elements[l].getElementsByTagName('td')[1];
                    if(anchor)
                    {
                        //console.log('TestOwner:',name.innerHTML);
                        //Owner.push(anchor.innerHTML);
                        return anchor.innerHTML;
                    }
                    else
                    {
                        //Owner.push('N/A');
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
        //console.log('OwnerName--------> ', href)
        Owner.push(href);
    }
	  
	  
	  //let ownerName_result = await page.evaluate((sel) => {
      // let element = document.querySelector(sel);
      // return element? element.innerHTML:null;
      //}, ownerNameValueResults);
      let ownerName_result = href;

      if(list_length == 3)
      {
         // console.log("ListLength=3");
        ownerName_result = Owner[0];
      }
      else if(list_length == 4)
      {
        //console.log("ListLength=4");
          ownerName_result = Owner[1];
      }
	  //console.log(ownerName_result);
	  
	//console.log('Owner: '+ownerName_result.toString());
    var Address = [];
    
	  for(let i=1; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[3];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
        //console.log('--------> ', href)
        Address.push(href);
      }
      
     
	  
      let ownerAddress_result = href;
      
      if(list_length == 3)
      {
         // console.log("ListLength=3");
         ownerAddress_result = Address[0];
      }
      else if(list_length == 4)
      {
        //console.log("ListLength=4");
        ownerAddress_result = Address[1];
      }
	  
	  // let ownerAddress_result = await page.evaluate((sel) => {
       //let element = document.querySelector(sel);
       //return element? element.innerHTML:null;
      //}, ownerNameValueResults);

      var Zip = [];
	  
	   for(let i=1; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[7];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
                Zip.push(href);
        //console.log('--------> ', href)
	  }
	  
      let ownerZip_result = href;
      
      if(list_length == 3)
      {
         // console.log("ListLength=3");
         ownerZip_result = Zip[0];
      }
      else if(list_length == 4)
      {
        //console.log("ListLength=4");
        ownerZip_result = Zip[1];
      }
	  
	  // let ownerZip_result = await page.evaluate((sel) => {
      // let element = document.querySelector(sel);
      // return element? element.innerHTML:null;
      //}, ownerZipCodeValueResults);
      var City = [];
	  
	   for(let i=1; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[5];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
                City.push(href);
        //console.log('--------> ', href)
	  }
	  
      let ownerCity_result = href;
      
      if(list_length == 3)
      {
         // console.log("ListLength=3");
         ownerCity_result = City[0];
      }
      else if(list_length == 4)
      {
        //console.log("ListLength=4");
        ownerCity_result = City[1];
      }
	  
	   //let ownerCity_result = await page.evaluate((sel) => {
       //let element = document.querySelector(sel);
       //return element? element.innerHTML:null;
      //}, ownerCityValueResults);
	  
	   for(let i=2; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[9];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
        //console.log('--------> ', href)
	  }
	  
	  let ownerState_result = href;
	  
	   //let ownerState_result = await page.evaluate((sel) => {
       //let element = document.querySelector(sel);
       //return element? element.innerHTML:null;
      //}, ownerStateValueResults);
	  
	    for(let i=2; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[13];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
        //console.log('--------> ', href)
	  }
	  
	  let ownerPhone_result = href;
	  
	  // let ownerPhone_result = await page.evaluate((sel) => {
      // let element = document.querySelector(sel);
      // return element? element.innerHTML:"N/A";
      //}, ownerPhoneNumber1ValueResults);
	 
	 
	 await page.click('#principal__resultTab',{delay:1000});
	 
	 var soldPrice = soldPrice_result.replace(',','');
	 var taxValue = taxValue_result.replace(',','');
	 var landValue = landValue_result.replace(',','');
	 var buildValue = buildValue_result.replace(',','');
	 
	 var json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed, 'baths':baths,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':ownerName_result,'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
     
     var data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result]
     var dataInserted;
     
     request = new Request("INSERT INTO Properties with (ROWLOCK) ([Ownername], [Address]) SELECT '"+ data[0].toString()+ "', '"+ data[1].toString()+ "' WHERE NOT EXISTS (SELECT * FROM dbo.Properties WHERE Address = '"+data[1].toString() +"');",
     function(err,rowCount)
     {
       if(err)
       {
         console.log(err);
        }
        //console.log(rowCount + ' row(s) returned');
        dataInserted = rowCount;
       }
     

    );
    await connection.execSql(request);

     if(dataInserted > 0)
     {
        viewData.push(json);
     }
	 
	 var podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed,"baths-2":baths,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

	 //console.log(podioJson);
     //console.log(intakeDate);

     
    
    
    //await request.on('done', function (rowCount, more, rows) {
     //  dataInserted = rowCount;


     //});
    
    
    //console.log(dataInserted);
    if(dataInserted > 0)
    {
      insertPODIOItem(podioJson);
    }
	 
}

}

	var fileName = dateFirstDayString + ' to ' + dateString + ' LP Lake.csv';



   var json2csvCallback = function (err, csv) {
    if (err) throw err;
    //console.log(csv);
	
    fs.writeFile(fileName, csv, function(err) {
    if (err) throw err;
    console.log('file saved');
	thecsv = csv;
  });
}; 

await converter.json2csv(viewData, json2csvCallback);
  
  //Click download
  //await page.click('#ext-gen543'),{delay:5000};

  
  //await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './tmp'});
  //await page.waitFor(1000);
  
  //Click yes
  //await page.click('#ext-gen484',{delay:2000});
  
  
  
 
  
 /*  const page2 = await browser.newPage();
  
  await page2.goto('chrome://downloads/',{delay:1000});
  
   let link = await page2.evaluate(() => {
        return document.querySelectorAll('href');
      });
	  
	  
	  
  console.log(link[0]);
	  
  await page.bringToFront();
  
  const res = await this.page.evaluate(() =>
{
    return fetch(link[0], {
        method: 'GET',
        credentials: 'include'
    }).then(r => r.text());
}); */
  
  
  // const result = await page.evaluate(async () => {
   //const form = document.querySelector('#ext-gen484');
    //const data = new FormData(form);
    //form.append('#ext-gen484', 'td');

   // return fetch(await page.click('#ext-gen484'), {
   //   method: 'POST',
  //    credentials: 'include',
  //    body: data,
  //  })
    //.then(response => response.text());
  //});
  
 // fs.writeFile('./reifaxData.xls', res, (err) => {  
    // throws an error, you could also catch it here
    //if (err) throw err;

    // success case, the file was saved
    //console.log('REI FAXs saved!');
//});
  
  //fs.writeFile('./reifaxData.xls');
  
//const res = await this.page.evaluate(() =>
//{
//    return fetch('https://example.com/path/to/file.csv', {
//        method: 'GET',
//        credentials: 'include'
//    }).then(r => r.text());
//});
  
  await page.waitFor(2000);
  if(viewData.length == 0)
  {
      sendZeroResultsEmail();
  }
  else
  {
      sendTheEmail(fileName);
  }

  await page.waitFor(1500);


//console.log(Date.now());
  await browser.close();

  await getREIFaxProbate();

}


async function getREIFaxProbate(){

  // Attempt to connect and execute queries if connection goes through
connection.on('connect', function(err) 
{
if (err) 
  {
     console.log(err)
  }
else
  {
      //queryDatabase(item)
  }
}
);

//console.log(Date.now());
//const browser = await puppeteer.launch({headless: true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--window-size=800,600',"--proxy-server='direct://'",'--proxy-bypass-list=*','--ignore-certificate-errors','ignore-certificate-errors-spki-list','--remote-debugging-port=9222','--remote-debugging-address=0.0.0.0','--allow-insecure-localhost','--disable-web-security','--disable-gpu']},{sloMo: 350}, {ignoreHTTPSErrors: true},{dumpio: true});
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--ignore-certificate-errors','--disable-gpu','--window-size=800,600',"--proxy-server='direct://'",'--proxy-bypass-list=*','--enable-features=NetworkService']},{sloMo: 350}, {ignoreHTTPSErrors: true});

const page = await browser.newPage();
const navigationPromise = page.waitForNavigation();

await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/67.0.3372.0 Safari/537.36');

const EMAIL_USERNAME_SELECTOR = '#inputEmail';
const PASSWORD_SELECTOR = '#inputPassword';
const SIGNIN_BUTTON_SELECTOR = '#submitButton';


const ADVANCED_BUTTON_SELECTOR = '#ext-comp-1031__searchTabAdv';
const ADVANCED_BUTTON_SELECTOR2 = '#ext-comp-1032__searchTabAdv';
const COUNTY_DROPDOWN = '#ncounty';
const FORECLOSURE = '#nforeclosure';
const FORECLOSURE_BUTTON = '#ext-gen130';
const FILEDATE_BETWEEN = '#ext-gen391';


await page.goto('https://www.reifax.com/login/index.php?logPrincipal=true',{waitUntil: 'networkidle2'});

try
{
await navigationPromise;
}
catch(err){
console.log(err);
}

await page.click(EMAIL_USERNAME_SELECTOR);
await page.keyboard.type(process.env.REIFAX_USERNAME);


await page.click(PASSWORD_SELECTOR);
await page.keyboard.type(process.env.REIFAX_PASSWORD);


await page.click(SIGNIN_BUTTON_SELECTOR,{delay:1000} );

try
{
await navigationPromise;
}
catch(err){
console.log(err);
}


await page.waitForNavigation({waitUntil:'networkidle2'});

await page.waitForSelector('#ext-gen58');

await page.click('#ext-gen29');

await page.waitForSelector('#principal__searchTab');


try
{
await page.click('#ext-comp-1038__searchTabAdv',{delay:2000});
}
catch(err)
{
console.log(err);

}

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.focus(COUNTY_DROPDOWN, {delay:2000});

await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter');


//await page.focus(FORECLOSURE, {delay:2000});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.down('Enter');

//await page.click(FORECLOSURE_BUTTON, {delay:2000});

await page.click('#ext-gen179', {delay:2000});


//await page.focus(FILEDATE_BETWEEN, {delay:2000});
await page.click('#ext-gen437',{delay:2000});

await page.focus('#ext-gen524',{delay:2000});

await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter');


const d = new Date();


const dateString = formatDate(d);
const dateFirstDayString = formatDateFirstOfMonth(d);
const intakeDate = formatIntakeDate(d);
const sourceData = formatSourceProbate(d);
//console.log(dateString);

//await page.click('#ext-gen392',{delay:2000});

await page.click('#ext-gen440',{delay:2000});


//await page.keyboard.type(dateString),{delay:1000};
await page.keyboard.type('20180601'),{delay:1000};
//await page.keyboard.type(dateFirstDayString),{delay:1000};

//await page.click('#ext-gen394',{delay:2000});
await page.click('#ext-gen442',{delay:2000});

//await page.keyboard.type('20180607'),{delay:1000};
await page.keyboard.type(dateString),{delay:1000};

try
{
  
  //await page.click('#ext-gen93'),{delay:5000};
  await page.click('#ext-gen131'),{delay:5000};

}
catch(err)
{
  console.log(err);
  await page.click('#ext-gen130'),{delay:5000};
}



 try
 {
await page.waitForSelector('#result_orderby_asc');
 }
 catch(error2)
 {
   console.log(error2);
   sendZeroResultsEmailProbate();
   await browser.close();
 }
   

 //let results = await page.evaluate((sel) => {
 //    let element = document.querySelector(sel);
 // return element? element.innerHTML:null;
 //   }, '#ext-gen525 > div > div:nth-child(1) > table > tbody > tr > td:nth-child(2)');

 // var res = results.split(" ");

 // var queryPropertieCount = res[19];





var viewData = [];



let pageNumber = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
  return elements.length;
}, '#ext-gen548 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > select > option');

//#ext-gen541 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > select

//console.log(pageNumber);
 
 pageNumber = pageNumber-1;

for (let i = 0; i <= pageNumber ; i++) 
{

 if(i > 0)
 {
    //await page.click('#ext-gen525 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > a:nth-child(4)');
      
      await page.click('#ext-gen548 > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > a:nth-child(4)');
      

      await page.waitForSelector('#result_orderby_asc');
 }


  let boxResult1  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
  }, '#box_result_0');
  
  
//console.log(boxResult1);

let boxResult2  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
  }, '#box_result_1');
  
//console.log(boxResult2);

let boxResult3  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
  }, '#box_result_2');
  
//console.log(boxResult3);

let boxResult4  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
  }, '#box_result_3');
  
//console.log(boxResult4);

let boxResult5  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
  }, '#box_result_4');
  
//console.log(boxResult5);

let boxResult6  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
  }, '#box_result_5');
  
//console.log(boxResult6);

let boxResult7  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
  }, '#box_result_6');
  
//console.log(boxResult7);

let boxResult8  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
}, '#box_result_7');
  
//console.log(boxResult8);

let boxResult9  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
  }, '#box_result_8');
  
//console.log(boxResult9);

let boxResult10  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
}, '#box_result_9');
  
//console.log(boxResult10);

let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10);
boxNumbers  = boxNumbers -1;

for (let i = 0; i <= boxNumbers ; i++) 
{

 let boxSelector = boxResults.replace("INDEX", i);
 let bedBathSelector = bedBathResults.replace("INDEX", i);
 let grossAreaSelector = grossAreaResults.replace("INDEX", i);
 let livingAreaSelector = livingAreaResults.replace("INDEX", i);
 let poolSelector = poolResults.replace("INDEX", i);
 let waterFrontSelector = waterFrontResults.replace("INDEX",i);
 let builtSelector = builtResults.replace("INDEX",i);
 let foreclosureSelector = foreclosureResults.replace("INDEX",i);

   let box_result = await page.evaluate((sel) => {
   let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, boxSelector);
  
   let bedBath_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, bedBathSelector);
  
   let grossArea_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, grossAreaSelector);
  
   let livingArea_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, livingAreaSelector);
  
   let pool_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, poolSelector);
  
  let waterFront_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, waterFrontSelector);
  
   let built_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, builtSelector);
  
   let foreclosure_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, foreclosureSelector);
  
  
  
  
  res = box_result.split(",");
  
  
 //console.log(res);  
 
 //var addr = res[0].split(" ");
 
 //var address = addr[32] +  ' ' + addr[33] + ' ' + addr[34];
 
 //console.log(address);


// var zip = res[2].replace(/ /g, '');
 
 //console.log(zip);
 
 //console.log(bedBath_result);
 
 var temp = bedBath_result.split("/");
 
 var bed = temp[0];
 
 var content = bed.toString().replace(/\t/g, '').split('\n');
 
 //console.log(content);
 
 bed = content[1];
 
 //console.log(bed);
 
 var baths = temp[1];
 
 //console.log(baths);
 
 var grossLivingTemp = grossArea_result.toString().replace(/\t/g, '').split('\n');
 
 var gLiving = grossLivingTemp[1];
 
 //console.log(gLiving);
 
 var livingTemp = livingArea_result.toString().replace(/\t/g, '').split('\n');
 
 var lArea = livingTemp[1];
 
 
 await page.click(boxSelector);
 
 await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});
 
 let address_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  let zip_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  let soldPrice_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, soldPriceResults);
 
  let taxValue_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, taxValueResults);
 
 let landValue_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, landValueResults);
  
   let buildValue_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, buildValueResults);
  
   let cityValue_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, cityValueResults);
  
   let list_length  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
  }, '#pagtag_table');

  //console.log(list_length);
  
    var href = 'N/A';
    
    var Owner = [];
    //#pagtag_table > tbody > tr:nth-child(1) > td:nth-child(2)
    
  for(let i=1; i< list_length; i++){
       href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[1];
                  //let name = elements[l].getElementsByTagName('td')[1];
                  if(anchor)
                  {
                      //console.log('TestOwner:',name.innerHTML);
                      //Owner.push(anchor.innerHTML);
                      return anchor.innerHTML;
                  }
                  else
                  {
                      //Owner.push('N/A');
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
      //console.log('OwnerName--------> ', href)
      Owner.push(href);
  }
  
  
  //let ownerName_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:null;
    //}, ownerNameValueResults);
    let ownerName_result = href;

    if(list_length == 3)
    {
       // console.log("ListLength=3");
      ownerName_result = Owner[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
        ownerName_result = Owner[1];
    }
  //console.log(ownerName_result);
  
//console.log('Owner: '+ownerName_result.toString());
  var Address = [];
  
  for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[3];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
      //console.log('--------> ', href)
      Address.push(href);
    }
    
   
  
    let ownerAddress_result = href;
    
    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerAddress_result = Address[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerAddress_result = Address[1];
    }
  
  // let ownerAddress_result = await page.evaluate((sel) => {
     //let element = document.querySelector(sel);
     //return element? element.innerHTML:null;
    //}, ownerNameValueResults);

    var Zip = [];
  
   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[7];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              Zip.push(href);
      //console.log('--------> ', href)
  }
  
    let ownerZip_result = href;
    
    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerZip_result = Zip[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerZip_result = Zip[1];
    }
  
  // let ownerZip_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:null;
    //}, ownerZipCodeValueResults);
    var City = [];
  
   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[5];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              City.push(href);
      //console.log('--------> ', href)
  }
  
    let ownerCity_result = href;
    
    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerCity_result = City[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerCity_result = City[1];
    }
  
   //let ownerCity_result = await page.evaluate((sel) => {
     //let element = document.querySelector(sel);
     //return element? element.innerHTML:null;
    //}, ownerCityValueResults);
  
   for(let i=2; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
      //console.log('--------> ', href)
  }
  
  let ownerState_result = href;
  
   //let ownerState_result = await page.evaluate((sel) => {
     //let element = document.querySelector(sel);
     //return element? element.innerHTML:null;
    //}, ownerStateValueResults);
  
    for(let i=2; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[13];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
      //console.log('--------> ', href)
  }
  
  let ownerPhone_result = href;
  
  // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
 await page.click('#principal__resultTab',{delay:1000});
 
 var soldPrice = soldPrice_result.replace(',','');
 var taxValue = taxValue_result.replace(',','');
 var landValue = landValue_result.replace(',','');
 var buildValue = buildValue_result.replace(',','');
 
 var json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed, 'baths':baths,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':ownerName_result,'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
   var data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result]
   var dataInserted;
   
   request = new Request("INSERT INTO ProbateProperties with (ROWLOCK) ([Ownername], [Address]) SELECT '"+ data[0].toString()+ "', '"+ data[1].toString()+ "' WHERE NOT EXISTS (SELECT * FROM dbo.ProbateProperties WHERE Address = '"+data[1].toString() +"');",
   function(err,rowCount)
   {
     if(err)
     {
       console.log(err);
      }
      //console.log(rowCount + ' row(s) returned');
      dataInserted = rowCount;
     }
   

  );
  await connection.execSql(request);

   if(dataInserted > 0)
   {
      viewData.push(json);
   }
 
 var podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":8,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed,"baths-2":baths,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

 //console.log(podioJson);
   //console.log(intakeDate);

   
  
  
  //await request.on('done', function (rowCount, more, rows) {
   //  dataInserted = rowCount;


   //});
  
  
  //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

}

var fileName = dateFirstDayString + ' to ' + dateString + ' Probate Lake.csv';



 var json2csvCallback = function (err, csv) {
  if (err) throw err;
  //console.log(csv);

  fs.writeFile(fileName, csv, function(err) {
  if (err) throw err;
  console.log('probate file saved');
thecsv = csv;
});
}; 

await converter.json2csv(viewData, json2csvCallback);

//Click download
//await page.click('#ext-gen543'),{delay:5000};


//await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: './tmp'});
//await page.waitFor(1000);

//Click yes
//await page.click('#ext-gen484',{delay:2000});





/*  const page2 = await browser.newPage();

await page2.goto('chrome://downloads/',{delay:1000});

 let link = await page2.evaluate(() => {
      return document.querySelectorAll('href');
    });
  
  
  
console.log(link[0]);
  
await page.bringToFront();

const res = await this.page.evaluate(() =>
{
  return fetch(link[0], {
      method: 'GET',
      credentials: 'include'
  }).then(r => r.text());
}); */


// const result = await page.evaluate(async () => {
 //const form = document.querySelector('#ext-gen484');
  //const data = new FormData(form);
  //form.append('#ext-gen484', 'td');

 // return fetch(await page.click('#ext-gen484'), {
 //   method: 'POST',
//    credentials: 'include',
//    body: data,
//  })
  //.then(response => response.text());
//});

// fs.writeFile('./reifaxData.xls', res, (err) => {  
  // throws an error, you could also catch it here
  //if (err) throw err;

  // success case, the file was saved
  //console.log('REI FAXs saved!');
//});

//fs.writeFile('./reifaxData.xls');

//const res = await this.page.evaluate(() =>
//{
//    return fetch('https://example.com/path/to/file.csv', {
//        method: 'GET',
//        credentials: 'include'
//    }).then(r => r.text());
//});

await page.waitFor(2000);
if(viewData.length == 0)
{
    sendZeroResultsEmailProbate();
}
else
{
    sendTheEmailProbate(fileName);
}

await page.waitFor(1500);


//console.log(Date.now());
await browser.close();



}


function sendZeroResultsEmail()
{
	
	// Set the refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

//Initialize an access token variable
let accessToken = "";

//Get the access token
oauth2Client.refreshAccessToken(function(err,tokens)
{
	if(err) 
	{
		console.log(err);
	  } 
	  else 
	  {
		console.log(accessToken);
	  }
	accessToken = tokens.access_token;
});

var smtpTransport = nodemailer.createTransport({
    host:"smtp.gmail.com",
	port: 465,
	secure: true,
	auth:{
      type: "OAuth2",
      user: process.env.GMAIL_USERNAME,
	  clientId: process.env.GMAIL_CLIENTID,
	  clientSecret: process.env.GMAIL_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
	  accessToken: accessToken
    }
});

	var mailOptions = {
	  from: process.env.GMAIL_USERNAME,
	  to: "Kornarmy@gmail.com, mfilson148@gmail.com",
	  subject: "REI FAX Mailer list No Results",
	  generateTextFromHTML: true,
	  html: "<b>REI FAX Found zero results today.</b>",
	  //attachments: [{   filename: 'Testfile.csv',// file on disk as an attachment
		//				content: thecsv
		//			}]
	};

	smtpTransport.sendMail(mailOptions, function(error, response) {
	  if (error) {
		console.log(error);
	  } else {
		console.log(response);
	  }
	  smtpTransport.close();
	});
	
};

function sendZeroResultsEmailProbate()
{
	
	// Set the refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

//Initialize an access token variable
let accessToken = "";

//Get the access token
oauth2Client.refreshAccessToken(function(err,tokens)
{
	if(err) 
	{
		console.log(err);
	  } 
	  else 
	  {
		console.log(accessToken);
	  }
	accessToken = tokens.access_token;
});

var smtpTransport = nodemailer.createTransport({
    host:"smtp.gmail.com",
	port: 465,
	secure: true,
	auth:{
      type: "OAuth2",
      user: process.env.GMAIL_USERNAME,
	    clientId: process.env.GMAIL_CLIENTID,
	    clientSecret: process.env.GMAIL_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
	    accessToken: accessToken
    }
});

	var mailOptions = {
	  from: process.env.GMAIL_USERNAME,
	  to: "Kornarmy@gmail.com, mfilson148@gmail.com",
	  subject: "REIFAX Probate Mailer list No Results",
	  generateTextFromHTML: true,
	  html: "<b>REIFAX Found zero probate results today.</b>",
	  //attachments: [{   filename: 'Testfile.csv',// file on disk as an attachment
		//				content: thecsv
		//			}]
	};

	smtpTransport.sendMail(mailOptions, function(error, response) {
	  if (error) {
		console.log(error);
	  } else {
		console.log(response);
	  }
	  smtpTransport.close();
	});
	
};



function sendTheEmail(fileName)
{
	
// Set the refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

//Initialize an access token variable
let accessToken = "";

//Get the access token
oauth2Client.refreshAccessToken(function(err,tokens)
{
if(err) 
{
    console.log(err);
  } 
  else 
  {
    console.log(accessToken);
  }
	accessToken = tokens.access_token;
});

var smtpTransport = nodemailer.createTransport({
    host:"smtp.gmail.com",
	port: 465,
	secure: true,
	auth:{
      type: "OAuth2",
      user: process.env.GMAIL_USERNAME,
	  clientId: process.env.GMAIL_CLIENTID,
	  clientSecret: process.env.GMAIL_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
	  accessToken: accessToken
    }
});

var mailOptions = {
  from: process.env.GMAIL_USERNAME,
  to: "Kornarmy@gmail.com, mfilson148@gmail.com",
  subject: "REI FAX LP LAKE",
  generateTextFromHTML: true,
  html: "<b>REI FAX From the machines!</b>",
  attachments: [{   filename: fileName,// file on disk as an attachment
					content: thecsv
				}]
};

smtpTransport.sendMail(mailOptions, function(error, response) {
  if (error) {
    console.log(error);
  } else {
    console.log(response);
  }
  smtpTransport.close();
});
	
};



function sendTheEmailProbate(fileName)
{
	
// Set the refresh token
oauth2Client.setCredentials({
	refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

//Initialize an access token variable
let accessToken = "";

//Get the access token
oauth2Client.refreshAccessToken(function(err,tokens)
{
if(err) 
{
    console.log(err);
  } 
  else 
  {
    console.log(accessToken);
  }
	accessToken = tokens.access_token;
});

var smtpTransport = nodemailer.createTransport({
    host:"smtp.gmail.com",
	port: 465,
	secure: true,
	auth:{
      type: "OAuth2",
      user: process.env.GMAIL_USERNAME,
	    clientId: process.env.GMAIL_CLIENTID,
	    clientSecret: process.env.GMAIL_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
	    accessToken: accessToken
    }
});

var mailOptions = {
  from: process.env.GMAIL_USERNAME,
  to: "Kornarmy@gmail.com, mfilson148@gmail.com",
  subject: "REIFAX PROBATE LAKE",
  generateTextFromHTML: true,
  html: "<b>REIFAX From the machines!</b>",
  attachments: [{   filename: fileName,// file on disk as an attachment
					content: thecsv
				}]
};

smtpTransport.sendMail(mailOptions, function(error, response) {
  if (error) {
    console.log(error);
  } else {
    console.log(response);
  }
  smtpTransport.close();
});
	
};




function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('');
}

function formatDateFirstOfMonth(date){
	var d = new Date(date),
	month = '' + (d.getMonth() + 1),
	day = '01',
	year = d.getFullYear();
	
	if (month.length < 2) month = '0' + month;
	return [year, month, day].join('');
}

function formatIntakeDate(date){
var d = new Date(date),
	month = '' + (d.getMonth() + 1),
	day = '' + d.getDate(),
	year = d.getFullYear(),
	hour = '' + d.getHours(), 
	minute = '' + d.getMinutes(),
	second = '' + d.getSeconds(); 
	
 
	if (hour.length == 1) { hour = '0' + hour; }
	if (minute.length == 1) { minute = "0" + minute; }
	if (second.length == 1) { second = "0" + second; }
	if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
	
	//return [year, month, day].join('-');
	return [year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second];
	
}
	
function formatSource(date){
	var d = new Date(date),
	year = d.getFullYear(),
    locale = "en-us",
    month = d.toLocaleString(locale, { month: "long" });
	
	return [year + ' ' + month + ' LIS PENDENS'];
}

function formatSourceProbate(date){
	var d = new Date(date),
	year = d.getFullYear(),
    locale = "en-us",
    month = d.toLocaleString(locale, { month: "long" });
	
	return [year + ' ' + month + ' PROBATE'];
}


function insertPODIOItem(item)
{
	//get the API id/secret
	const clientId = process.env.PODIO_CLIENTID;
    const clientSecret = process.env.PODIO_CLIENT_SECRET;

	//get the app ID and Token for appAuthentication
	const appId = process.env.PODIO_APPID;
	const appToken = process.env.PODIO_APPTOKEN;

	// instantiate the SDK
	const podio = new Podio({
	authType: 'app',
	clientId: clientId,
	clientSecret: clientSecret
	});

	podio.authenticateWithApp(appId, appToken, (err) => {

	if (err) throw new Error(err);

	podio.isAuthenticated().then(() => {
		
    var requestData = {data: true};
	requestData = item;
    // Ready to make API calls in here...
	podio.request('POST', '/item/app/'+ process.env.PODIO_APPID +'/',requestData,function(responseData)
		{
			console.log('my responce: ',responseData);
		}).catch(err => console.log(err));

	}).catch(err => console.log(err));

});

}

function insertAzureSQLItem(item)
{
   
    
    
    request = new Request("INSERT INTO Properties ([Ownername], [Address]) values ('"+ item[0].toString()+ "','" +item[1].toString() +"');",
    function(err){
      if(err)
      {
        console.log(err);}
      });

      //request.on('row',function(columns){
      //   currentData.PropertiesId = columns[0].value;
      //   currentData.Ownername = columns[1].value;
      //   currentData.Address = columns[2].value;
         //console.log(currentData);
      //});

    
           

    //request.on('row', function(columns) {
       //columns.forEach(function(column) {
         //  console.log("%s\t%s", column.metadata.colName, column.value);
        //});
           // });
    connection.execSql(request);

}

function queryDatabase(item)
{
      //console.log('Reading rows from the Table...');
    //console.log("Connected!");
    //var sql = "CREATE TABLE homes (name VARCHAR(255), address VARCHAR(255))";
  //connection.execSql(sql, function (err, result) {
    //if (err) throw err;
    //console.log("Table created");
  //});
       // Read all rows from table
     request = new Request("INSERT INTO Properties ([Ownername], [Address]) values '" + item[0]+ "','" +item[1] +"'",
     function(err){
       if(err)
       {
         console.log(err);}
       });

       //request.on('row',function(columns){
       //   currentData.PropertiesId = columns[0].value;
       //   currentData.Ownername = columns[1].value;
       //   currentData.Address = columns[2].value;
          //console.log(currentData);
       //});

     
            

     //request.on('row', function(columns) {
        //columns.forEach(function(column) {
          //  console.log("%s\t%s", column.metadata.colName, column.value);
         //});
            // });
     connection.execSql(request);
   }



getREIFaxData();



//const init = async () => {
  // run every 10 minutes
   //cron.schedule('*/10 * * * *', getREIFaxData);
   //cron.schedule('0 0 12 * * 1-5', getREIFaxData);
   //cron.schedule('0 45 12 * * 1-5', getREIFaxProbate)
//};


//init(); 



