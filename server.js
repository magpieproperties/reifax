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
const JSZip = require('jszip');
const Docxtemplater = require('docxtemplater');
const path = require('path');


//const fields = ['address','unit','zip','garea','larea','beds','baths','pool','wf','build','frclosure','sold_price','tax_value','land_value','build_value','phone_number_2','phone_number_1','owner_zip','owner_state','owner_country','owner_city','owner_address','owner'];
const fields = ['address','unit','zip','garea','larea','beds','baths','pool','wf','build','frclosure','sold_price','tax_value','land_value','build_value'];


//const boxResults = '#box_result_INDEX > td > #title_result > a';
const boxResults =  '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-3 > div';
const zipResults = '#pagtag_table > tbody > tr:nth-child(3) > td:nth-child(2)';
const addressResults = '#pagtag_table > tbody > tr:nth-child(1) > td:nth-child(2)';
const bathResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-9 > div';
const bedResults =  '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-8 > div';
//const bedBathResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(4) > td:nth-child(2)';

// const grossAreaResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(3) > td:nth-child(4)';
const grossAreaResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-6 > div';
//const livingAreaResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(2) > td:nth-child(4)';
const livingAreaResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-7 > div';
//const poolResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(6) > td:nth-child(4)';
const poolResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-10 > div';
//const waterFrontResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(5) > td:nth-child(4)';
const waterFrontResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-11 > div';
//const builtResults = '#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(5) > td:nth-child(2)';
const builtResults = '#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-12 > div';
//const foreclosureResults ='#content_result_INDEX > div:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(6)';
const foreclosureResults ='#INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-13 > div';


const soldPriceResults = '#pagtag_table > tbody > tr:nth-child(13) > td:nth-child(4)';
const taxValueResults = '#pagtag_table > tbody > tr:nth-child(11) > td:nth-child(4)';
const landValueResults = '#pagtag_table > tbody > tr:nth-child(11) > td:nth-child(2)';
const buildValueResults = '#pagtag_table > tbody > tr:nth-child(10) > td:nth-child(2)';
const cityValueResults = '#pagtag_table > tbody > tr:nth-child(2) > td:nth-child(2)';


var thecsv = null;
var buf = null;
var buf2 = null;

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
const COUNTY_DROPDOWN = '#ncounty';
const FORECLOSURE = '#nforeclosure';



await page.goto('https://www.reifax.com/login/index.php?logPrincipal=true',{waitUntil: 'networkidle2'});

try
{
  await navigationPromise;
}
catch(err)
{
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

await page.waitFor(3000);

try
{
	await page.click('#ext-comp-1038__searchTabAdv',{delay:2000});
}
catch(err)
{
	console.log(err);
}

await page.waitFor(5000);

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
  
  await page.click('#ext-gen439',{delay:2000});
  
  await page.keyboard.type(dateFirstDayString),{delay:1000};
  
  await page.click('#ext-gen441',{delay:2000});
  
  await page.keyboard.type(dateString),{delay:1000};

  //<button type="button" id="ext-gen131" class=" x-btn-text icon" style="background-image: url(&quot;https://www.reifax.com/img/toolbar/search.png&quot;);">Search&nbsp;&nbsp; </button>
  
  let SearchSelector = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName(' x-btn-text icon'));
      return elements[3].getAttribute("id");
     });

     SearchSelector = '#'+SearchSelector;
     //console.log(SearchSelector);

  try
  {
    await page.click(SearchSelector.toString()),{delay:4000};
  }
  catch(err)
  {
	  console.log(err);
	 // await page.click('#ext-gen130'),{delay:5000};
  }
  
  
  try
  {
    // await page.waitForSelector('#result_orderby_asc');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);
     //sendZeroResultsEmail();
	   //await browser.close();
  }
	   
  
  console.log("Starting Lake");

  await page.waitFor(4000);

 
 var viewData = [];

 var tempData = [];

//  <div class="xtb-text" id="ext-comp-1126">of 2</div>
 
//  let pageSelector = await page.evaluate(() => {
//   let elements = Array.from( document.getElementsByClassName('x-panel-body x-panel-body-noheader x-panel-body-noborder'));
//     return elements[4].getAttribute("id");
//    });

let pageSelector = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[1].getAttribute("id");
   });
 //console.log(pageSelector);

 pageSelector = '#'+pageSelector;

 let pageNumber = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageSelector);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

pageNumber = pageNumber.replace('of ','');

//console.log(pageNumber);

let pageTotal = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[3].getAttribute("id");
   });
 //console.log(pageSelector);

 pageTotal = '#'+pageTotal;

 let pgTotal = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageTotal);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

//pageNumber = pageNumber.replace('of ','');

console.log(pgTotal);

//<button type="button" id="ext-gen608" class=" x-btn-text x-tbar-page-next">&nbsp;</button>

let pageNumberAdvanceId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
    return elements[0].getAttribute("id");
   });

   pageNumberAdvanceId = '#'+pageNumberAdvanceId;

 let pageNumberOrderSelector = '#INDEX > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > select > option';
 let pageNumberAdvanceSelector = '#INDEX > div > div:nth-child(1) > table > tbody > tr > td.paginationstyle > a:nth-child(4)';
 let pageNumberOrder = pageNumberOrderSelector.replace("INDEX",pageSelector);
 let pageNumberAdvance = pageNumberAdvanceSelector.replace("INDEX",pageSelector);


//  let pageNumber = await page.evaluate((sel) => {
// 		let elements = Array.from(document.querySelectorAll(sel));
// 		return elements.length;
//   }, pageNumberOrder);

let pageGridId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
    return elements[0].getAttribute("id");
   });

//console.log(pageGridId);

let pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
let pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
let pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
let pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
let pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
let pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
let pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
let pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
let pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
let pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
let pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
let pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
let pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
let pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
let pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
let pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
let pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
let pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
let pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
let pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
let pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
let pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
let pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
let pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
let pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
let pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
let pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
let pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
let pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
let pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
let pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
let pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
let pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
let pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
let pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
let pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
let pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
let pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
let pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
let pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
let pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
let pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
let pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
let pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
let pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
let pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
let pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
let pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
let pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
let pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
let pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
let pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");




   pageNumber = pageNumber-1;
 
  for (let i = 0; i <= pageNumber ; i++) 
  {
 
    if(i > 0)
    { 
       await page.focus(pageNumberAdvanceId, {delay:1000});
       await page.click(pageNumberAdvanceId,{delay:4000});
       await page.waitFor(2000);
       //await page.waitForSelector('#result_orderby_data');
    }
 

    let boxResult1  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
		}, pageGridOneRow1);
		//console.log(boxResult1);
  
    let boxResult2  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, pageGridOneRow2);
		//console.log(boxResult2);
	
    let boxResult3  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, pageGridOneRow3);
		//console.log(boxResult3);
	
    let boxResult4  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, pageGridOneRow4);
		//console.log(boxResult4);
	
    let boxResult5  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
		}, pageGridOneRow5);
		//console.log(boxResult5);
	
    let boxResult6  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
		}, pageGridOneRow6);
		//console.log(boxResult6);
	
    let boxResult7  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, pageGridOneRow7);
		//console.log(boxResult7);
  
    let boxResult8  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
	  }, pageGridOneRow8);
		//console.log(boxResult8);
	
    let boxResult9  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
		}, pageGridOneRow9);
		//console.log(boxResult9);
	
    let boxResult10  = await page.evaluate((sel) => {
           let elements = Array.from(document.querySelectorAll(sel));
             return elements.length;
	  }, pageGridOneRow10);
    //console.log(boxResult10);
    
    let boxResult11  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow11);
    //console.log(boxResult1);

    let boxResult12  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
    }, pageGridOneRow12);
    //console.log(boxResult2);

    let boxResult13  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
    }, pageGridOneRow13);
    //console.log(boxResult3);

    let boxResult14  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
    }, pageGridOneRow14);
    //console.log(boxResult4);

    let boxResult15  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow15);
    //console.log(boxResult5);

    let boxResult16  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
              return elements.length;
    }, pageGridOneRow16);
    //console.log(boxResult6);

    let boxResult17  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
    }, pageGridOneRow17);
    //console.log(boxResult7);

    let boxResult18  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
    }, pageGridOneRow18);
    //console.log(boxResult8);

    let boxResult19  = await page.evaluate((sel) => {
            let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
    }, pageGridOneRow19);
    //console.log(boxResult9);

    let boxResult20  = await page.evaluate((sel) => {
          let elements = Array.from(document.querySelectorAll(sel));
            return elements.length;
    }, pageGridOneRow20);
    //console.log(boxResult10);

    let boxResult21  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow21);
    //console.log(boxResult1);

    let boxResult22  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow22);
    //console.log(boxResult2);

    let boxResult23  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow23);
    //console.log(boxResult3);

    let boxResult24  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow24);
    //console.log(boxResult4);

    let boxResult25  = await page.evaluate((sel) => {
    let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow25);
    //console.log(boxResult5);

    let boxResult26  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow26);
    //console.log(boxResult6);

    let boxResult27  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow27);
    //console.log(boxResult7);

    let boxResult28  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow28);
    //console.log(boxResult8);

    let boxResult29  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow29);
    //console.log(boxResult9);

    let boxResult30  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow30);
    //console.log(boxResult30);

    let boxResult31  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow31);
    //console.log(boxResult1);

    let boxResult32  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow32);
    //console.log(boxResult2);

    let boxResult33  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow33);
    //console.log(boxResult3);

    let boxResult34  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow34);
    //console.log(boxResult4);

    let boxResult35  = await page.evaluate((sel) => {
    let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow35);
    //console.log(boxResult5);

    let boxResult36  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow36);
    //console.log(boxResult6);

    let boxResult37  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow37);
    //console.log(boxResult7);

    let boxResult38  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow38);
    //console.log(boxResult8);

    let boxResult39  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow39);
    //console.log(boxResult9);

    let boxResult40  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow40);
    //console.log(boxResult10);

    let boxResult41  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow41);
    //console.log(boxResult1);

    let boxResult42  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow42);
    //console.log(boxResult2);

    let boxResult43  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow43);
    //console.log(boxResult3);

    let boxResult44  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow44);
    //console.log(boxResult4);

    let boxResult45  = await page.evaluate((sel) => {
    let elements = Array.from(document.querySelectorAll(sel));
      return elements.length;
    }, pageGridOneRow45);
    //console.log(boxResult5);

    let boxResult46  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
    }, pageGridOneRow46);
    //console.log(boxResult6);

    let boxResult47  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow47);
    //console.log(boxResult7);

    let boxResult48  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow48);
    //console.log(boxResult8);

    let boxResult49  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow49);
    //console.log(boxResult9);

    let boxResult50  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
    }, pageGridOneRow50);
    //console.log(boxResult10);
  
    let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
      boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
      boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
      boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
      boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
    );
    boxNumbers  = boxNumbers -1;
    //console.log(boxNumbers);
    for (let i = 0; i <= boxNumbers ; i++) 
    {

      let boxSelector = boxResults.replace("INDEX_2", (i+1));
      boxSelector = boxSelector.replace("INDEX",pageGridId);
      //console.log(boxSelector);
      let bedSelector = bedResults.replace("INDEX_2",(i+1));
      bedSelector = bedSelector.replace("INDEX",pageGridId);
      //console.log(bedSelector);
      let bathSelector = bathResults.replace("INDEX_2",(i+1));
      bathSelector = bathSelector.replace("INDEX",pageGridId);
      //console.log(bathSelector);
      let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
      grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
      // console.log(grossAreaSelector);
      let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
      livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

      let poolSelector = poolResults.replace("INDEX_2", (i+1));
      poolSelector = poolSelector.replace("INDEX",pageGridId);

      let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
      waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

      let builtSelector = builtResults.replace("INDEX_2", (i+1));
      builtSelector = builtSelector.replace("INDEX",pageGridId);

      let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
      foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
      
      let box_result = await page.evaluate((sel) => {
      let element = document.querySelector(sel);
        return element? element.innerHTML:null;
        }, boxSelector);
	  
      let bed_result = await page.evaluate((sel) => {
      let element = document.querySelector(sel);
        return element? element.innerHTML:null;
        }, bedSelector);

      let bath_result = await page.evaluate((sel) => {
      let element = document.querySelector(sel);
        return element? element.innerHTML:null;
        }, bathSelector);
	  
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
	  
    //res = box_result.split(",");
    
    res = box_result;
	  
	  
	 
   
   var gLiving = grossArea_result;
	 
	 
   var lArea = livingArea_result;
	 
	 
	 await page.click(boxSelector);
	 
   //await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});
   
    await page.waitFor(1000);
	 
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
       return element? element.innerHTML:"0";
      }, soldPriceResults);
	 
	  let taxValue_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
       return element? element.innerHTML:"0";
      }, taxValueResults);
	 
	  let landValue_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
       return element? element.innerHTML:"0";
      }, landValueResults);
	  
	  let buildValue_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
       return element? element.innerHTML:"0";
      }, buildValueResults);
	  
	  let cityValue_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
       return element? element.innerHTML:"0";
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

      State = [];
	  
	   for(let i=1; i< list_length; i++){
        href = await page.evaluate((l, sel) => {
                    let elements= Array.from(document.querySelectorAll(sel));
                    let anchor  = elements[l].getElementsByTagName('td')[9];
                    if(anchor){
                        return anchor.innerHTML;
                    }else{
                        return 'N/A';
                    }
                }, i, '#pagtag_table');
                State.push(href);
        //console.log('--------> ', href)
    }
    
    let ownerState_result = href;
    
      if(list_length == 3)
      {
         // console.log("ListLength=3");
         ownerState_result = State[0];
      }
      else if(list_length == 4)
      {
        //console.log("ListLength=4");
        ownerState_result = State[1];
      }
	  
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
    

    OwnerOne = ownerName_result.split('&');

    
	 
	  var json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':OwnerOne[0],'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
     
    var OwnerParts = OwnerOne[0].split(' ');

    var OwnerFirstName = "";

    var OwnerName = "";

    if(OwnerParts.length >= 3)
    {
   
        OwnerFirstName =  capitalizeFirst(OwnerParts[1]) + " " + capitalizeFirst(OwnerParts[2]);

    }
    else if(OwnerParts.length >= 2)
    {
        OwnerFirstName = capitalizeFirst(OwnerParts[1]);
    }
    

    OwnerName = OwnerFirstName +" "+ capitalizeFirst(OwnerParts[0]);


    var tempdatajson ={'owner_name':OwnerName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};

    var data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result];
    var dataInserted;
     
    //console.log(data);

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
        tempData.push(tempdatajson);
    }
	 
	    var podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

	    //console.log(podioJson);
      //console.log(intakeDate);

     
    
    
    await request.on('done', function (rowCount, more, rows) {
      dataInserted = rowCount;


     });
    
    
    // //console.log(dataInserted);
    if(dataInserted > 0)
    {
      insertPODIOItem(podioJson);
    }
	 
  }

}
//Brevard
try
{
	await page.click('#principal__searchTab',{delay:2000});
}
catch(err)
 {
 	console.log(err);
} 

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.click("#ext-gen201", {delay:2000});

await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
//await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.down('Enter'); 



  
try
{
  await page.click(SearchSelector.toString()),{delay:4000};
}
catch(err)
{
  console.log(err);
 // await page.click('#ext-gen130'),{delay:5000};
}
  

console.log("Starting Brevard");

   await page.waitFor(3000);
  
  try
  {
    //await page.waitForSelector('#result_orderby_data');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);  
     //sendZeroResultsEmail();
	   //await browser.close();
  } 

  await page.waitFor(4000);

    pageSelector = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[1].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageSelector = '#'+pageSelector;
  
    pageNumber = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageSelector);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  pageNumber = pageNumber.replace('of ','');
  
  //console.log(pageNumber);
  
    pageTotal = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[3].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageTotal = '#'+pageTotal;
  
   pgTotal = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageTotal);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  //pageNumber = pageNumber.replace('of ','');
  
    console.log(pgTotal);
  
    pageNumberAdvanceId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
      return elements[0].getAttribute("id");
     });
  
     pageNumberAdvanceId = '#'+pageNumberAdvanceId;

  
  
    pageGridId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
      return elements[0].getAttribute("id");
     });
  
  //console.log(pageGridId);
  
   pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
   pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
   pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
   pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
   pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
   pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
   pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
   pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
   pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
   pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
   pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
   pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
   pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
   pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
   pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
   pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
   pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
   pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
   pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
   pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
   pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
   pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
   pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
   pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
   pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
   pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
   pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
   pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
   pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
   pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
   pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
   pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
   pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
   pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
   pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
   pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
   pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
   pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
   pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
   pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
   pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
   pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
   pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
   pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
   pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
   pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
   pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
   pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
   pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
   pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
   pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
   pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");
  
  
  
 
  pageNumber = pageNumber-1; 

 for (let i = 0; i <= pageNumber ; i++) 
{

  if(i > 0)
  {
    await page.focus(pageNumberAdvanceId, {delay:1000});
    await page.click(pageNumberAdvanceId,{delay:4000});
    await page.waitFor(2000);
    
    //await page.waitForSelector('#result_orderby_data');
 }


 let boxResult1  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow1);
 //console.log(boxResult1);

 let boxResult2  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow2);
 //console.log(boxResult2);

 let boxResult3  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow3);
 //console.log(boxResult3);

 let boxResult4  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow4);
 //console.log(boxResult4);

 let boxResult5  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
 }, pageGridOneRow5);
 //console.log(boxResult5);

 let boxResult6  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow6);
 //console.log(boxResult6);

 let boxResult7  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow7);
 //console.log(boxResult7);

 let boxResult8  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow8);
 //console.log(boxResult8);

 let boxResult9  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow9);
 //console.log(boxResult9);

 let boxResult10  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow10);
 //console.log(boxResult10);
 
 let boxResult11  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow11);
 //console.log(boxResult1);

 let boxResult12  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow12);
 //console.log(boxResult2);

 let boxResult13  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow13);
 //console.log(boxResult3);

 let boxResult14  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow14);
 //console.log(boxResult4);

 let boxResult15  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow15);
 //console.log(boxResult5);

 let boxResult16  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow16);
 //console.log(boxResult6);

 let boxResult17  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow17);
 //console.log(boxResult7);

 let boxResult18  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow18);
 //console.log(boxResult8);

 let boxResult19  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow19);
 //console.log(boxResult9);

 let boxResult20  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow20);
 //console.log(boxResult10);

 let boxResult21  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow21);
 //console.log(boxResult1);

 let boxResult22  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow22);
 //console.log(boxResult2);

 let boxResult23  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow23);
 //console.log(boxResult3);

 let boxResult24  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow24);
 //console.log(boxResult4);

 let boxResult25  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow25);
 //console.log(boxResult5);

 let boxResult26  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow26);
 //console.log(boxResult6);

 let boxResult27  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow27);
 //console.log(boxResult7);

 let boxResult28  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow28);
 //console.log(boxResult8);

 let boxResult29  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow29);
 //console.log(boxResult9);

 let boxResult30  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow30);
 //console.log(boxResult10);

 let boxResult31  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow31);
 //console.log(boxResult1);

 let boxResult32  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow32);
 //console.log(boxResult2);

 let boxResult33  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow33);
 //console.log(boxResult3);

 let boxResult34  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow34);
 //console.log(boxResult4);

 let boxResult35  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow35);
 //console.log(boxResult5);

 let boxResult36  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow36);
 //console.log(boxResult6);

 let boxResult37  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow37);
 //console.log(boxResult7);

 let boxResult38  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow38);
 //console.log(boxResult8);

 let boxResult39  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow39);
 //console.log(boxResult9);

 let boxResult40  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow40);
 //console.log(boxResult10);

 let boxResult41  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow41);
 //console.log(boxResult1);

 let boxResult42  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow42);
 //console.log(boxResult2);

 let boxResult43  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow43);
 //console.log(boxResult3);

 let boxResult44  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow44);
 //console.log(boxResult4);

 let boxResult45  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow45);
 //console.log(boxResult5);

 let boxResult46  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow46);
 //console.log(boxResult6);

 let boxResult47  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow47);
 //console.log(boxResult7);

 let boxResult48  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow48);
 //console.log(boxResult8);

 let boxResult49  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow49);
 //console.log(boxResult9);

 let boxResult50  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow50);
 //console.log(boxResult10);

 let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
   boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
   boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
   boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
   boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
 );
 boxNumbers  = boxNumbers -1;

 for (let i = 0; i <= boxNumbers ; i++) 
 {

   let boxSelector = boxResults.replace("INDEX_2", (i+1));
   boxSelector = boxSelector.replace("INDEX",pageGridId);
   //console.log(boxSelector);
   let bedSelector = bedResults.replace("INDEX_2",(i+1));
   bedSelector = bedSelector.replace("INDEX",pageGridId);
   //console.log(bedSelector);
   let bathSelector = bathResults.replace("INDEX_2",(i+1));
   bathSelector = bathSelector.replace("INDEX",pageGridId);
   //console.log(bathSelector);
   let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
   grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
   // console.log(grossAreaSelector);
   let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
   livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

   let poolSelector = poolResults.replace("INDEX_2", (i+1));
   poolSelector = poolSelector.replace("INDEX",pageGridId);

   let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
   waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

   let builtSelector = builtResults.replace("INDEX_2", (i+1));
   builtSelector = builtSelector.replace("INDEX",pageGridId);

   let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
   foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
    
    let box_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
  
    let bed_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
          return element? element.innerHTML:null;
    }, bedSelector);
  
    let bath_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, bathSelector);
  
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
  
    res = box_result;
	  
	  
   
    var gLiving = grossArea_result;
    
    
    var lArea = livingArea_result;
 
 
 await page.click(boxSelector);
 
// await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});

    await page.waitFor(1000);
 
  address_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  zip_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  soldPrice_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, soldPriceResults);
 
  taxValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, taxValueResults);
 
  landValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, landValueResults);
  
  buildValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, buildValueResults);
  
  cityValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, cityValueResults);
  
  list_length  = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
    return elements.length;
  }, '#pagtag_table');
  //console.log(list_length);
  
  href = 'N/A';
    
  Owner = [];
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
   // ownerName_result = Owner[1] + Owner[0];

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
  Address = [];
  
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
    
   
  
    ownerAddress_result = href;
    
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

   Zip = [];
  
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
  
    ownerZip_result = href;
    
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
   City = [];
  
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
  
    ownerCity_result = href;
    
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
 
     State = [];
  
   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              State.push(href);
      //console.log('--------> ', href)
  }

  ownerState_result = href;
  
    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerState_result = State[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerState_result = State[1];
    }
    
  
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
  
  ownerPhone_result = href;
  
    // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
  await page.click('#principal__resultTab',{delay:1000});

  var OwnerOne = ownerName_result.split(';');

  var FirstName = OwnerOne[0].split(',');

  var ContainSecondName = false; 

  var FinalName = "";

  if(FirstName.length > 1)
  {
    ContainSecondName = true;
  }

  if(ContainSecondName)
  {
    FinalName = capitalizeFirst(FirstName[1])+" "+capitalizeFirst(FirstName[0]);
  }
  else
  {
    FinalName = capitalizeFirst(FirstName[0]);
  }
 
  soldPrice = soldPrice_result.replace(',','');
  taxValue = taxValue_result.replace(',','');
  landValue = landValue_result.replace(',','');
  buildValue = buildValue_result.replace(',','');
  ownerName = OwnerOne[0].replace(',','');
 
  json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':ownerName,'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
  data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result]

  

  tempdatajson = {'owner_name':FinalName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};
  
  dataInserted;
   
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
      tempData.push(tempdatajson);

      //console.log(tempdatajson);
   }
 
   podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

    //console.log(podioJson);
    //console.log(intakeDate);

   
  
  
    await request.on('done', function (rowCount, more, rows) {
    dataInserted = rowCount;


   });
  
  
  // //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

} 



//Marion
try
{
	await page.click('#principal__searchTab',{delay:2000});
}
catch(err)
 {
 	console.log(err);
} 


//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.click("#ext-gen201", {delay:2000});

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
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
await page.keyboard.down('Enter'); 



  
try
{
  await page.click(SearchSelector.toString()),{delay:4000};
}
catch(err)
{
  console.log(err);
 // await page.click('#ext-gen130'),{delay:5000};
}
  

  
console.log("Starting Marion");
  
await page.waitFor(3000);

  try
  {
    // await page.waitForSelector('#result_orderby_data');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);
     //sendZeroResultsEmail();
	   //await browser.close();
  } 

  await page.waitFor(4000);

    pageSelector = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[1].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageSelector = '#'+pageSelector;
  
    pageNumber = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageSelector);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  pageNumber = pageNumber.replace('of ','');
  
  //console.log(pageNumber);
  
    pageTotal = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[3].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageTotal = '#'+pageTotal;
  
   pgTotal = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageTotal);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  //pageNumber = pageNumber.replace('of ','');
  
    console.log(pgTotal);
  
    pageNumberAdvanceId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
      return elements[0].getAttribute("id");
     });
  
     pageNumberAdvanceId = '#'+pageNumberAdvanceId;

  
  
    pageGridId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
      return elements[0].getAttribute("id");
     });
  
  //console.log(pageGridId);
  
   pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
   pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
   pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
   pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
   pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
   pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
   pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
   pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
   pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
   pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
   pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
   pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
   pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
   pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
   pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
   pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
   pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
   pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
   pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
   pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
   pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
   pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
   pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
   pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
   pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
   pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
   pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
   pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
   pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
   pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
   pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
   pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
   pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
   pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
   pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
   pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
   pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
   pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
   pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
   pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
   pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
   pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
   pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
   pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
   pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
   pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
   pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
   pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
   pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
   pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
   pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
   pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");
  
  
  
 
  pageNumber = pageNumber-1; 

 for (let i = 0; i <= pageNumber ; i++) 
{

  if(i > 0)
  {
    await page.focus(pageNumberAdvanceId, {delay:1000});
    await page.click(pageNumberAdvanceId,{delay:4000});
    await page.waitFor(2000);
    
    //await page.waitForSelector('#result_orderby_data');
 }


 let boxResult1  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow1);
 //console.log(boxResult1);

 let boxResult2  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow2);
 //console.log(boxResult2);

 let boxResult3  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow3);
 //console.log(boxResult3);

 let boxResult4  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow4);
 //console.log(boxResult4);

 let boxResult5  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
 }, pageGridOneRow5);
 //console.log(boxResult5);

 let boxResult6  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow6);
 //console.log(boxResult6);

 let boxResult7  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow7);
 //console.log(boxResult7);

 let boxResult8  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow8);
 //console.log(boxResult8);

 let boxResult9  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow9);
 //console.log(boxResult9);

 let boxResult10  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow10);
 //console.log(boxResult10);
 
 let boxResult11  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow11);
 //console.log(boxResult1);

 let boxResult12  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow12);
 //console.log(boxResult2);

 let boxResult13  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow13);
 //console.log(boxResult3);

 let boxResult14  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow14);
 //console.log(boxResult4);

 let boxResult15  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow15);
 //console.log(boxResult5);

 let boxResult16  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow16);
 //console.log(boxResult6);

 let boxResult17  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow17);
 //console.log(boxResult7);

 let boxResult18  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow18);
 //console.log(boxResult8);

 let boxResult19  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow19);
 //console.log(boxResult9);

 let boxResult20  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow20);
 //console.log(boxResult10);

 let boxResult21  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow21);
 //console.log(boxResult1);

 let boxResult22  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow22);
 //console.log(boxResult2);

 let boxResult23  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow23);
 //console.log(boxResult3);

 let boxResult24  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow24);
 //console.log(boxResult4);

 let boxResult25  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow25);
 //console.log(boxResult5);

 let boxResult26  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow26);
 //console.log(boxResult6);

 let boxResult27  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow27);
 //console.log(boxResult7);

 let boxResult28  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow28);
 //console.log(boxResult8);

 let boxResult29  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow29);
 //console.log(boxResult9);

 let boxResult30  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow30);
 //console.log(boxResult10);

 let boxResult31  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow31);
 //console.log(boxResult1);

 let boxResult32  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow32);
 //console.log(boxResult2);

 let boxResult33  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow33);
 //console.log(boxResult3);

 let boxResult34  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow34);
 //console.log(boxResult4);

 let boxResult35  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow35);
 //console.log(boxResult5);

 let boxResult36  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow36);
 //console.log(boxResult6);

 let boxResult37  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow37);
 //console.log(boxResult7);

 let boxResult38  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow38);
 //console.log(boxResult8);

 let boxResult39  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow39);
 //console.log(boxResult9);

 let boxResult40  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow40);
 //console.log(boxResult10);

 let boxResult41  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow41);
 //console.log(boxResult1);

 let boxResult42  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow42);
 //console.log(boxResult2);

 let boxResult43  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow43);
 //console.log(boxResult3);

 let boxResult44  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow44);
 //console.log(boxResult4);

 let boxResult45  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow45);
 //console.log(boxResult5);

 let boxResult46  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow46);
 //console.log(boxResult6);

 let boxResult47  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow47);
 //console.log(boxResult7);

 let boxResult48  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow48);
 //console.log(boxResult8);

 let boxResult49  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow49);
 //console.log(boxResult9);

 let boxResult50  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow50);
 //console.log(boxResult10);

 let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
   boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
   boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
   boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
   boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
 );
 boxNumbers  = boxNumbers -1;

 for (let i = 0; i <= boxNumbers ; i++) 
 {

   let boxSelector = boxResults.replace("INDEX_2", (i+1));
   boxSelector = boxSelector.replace("INDEX",pageGridId);
   //console.log(boxSelector);
   let bedSelector = bedResults.replace("INDEX_2",(i+1));
   bedSelector = bedSelector.replace("INDEX",pageGridId);
   //console.log(bedSelector);
   let bathSelector = bathResults.replace("INDEX_2",(i+1));
   bathSelector = bathSelector.replace("INDEX",pageGridId);
   //console.log(bathSelector);
   let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
   grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
   // console.log(grossAreaSelector);
   let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
   livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

   let poolSelector = poolResults.replace("INDEX_2", (i+1));
   poolSelector = poolSelector.replace("INDEX",pageGridId);

   let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
   waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

   let builtSelector = builtResults.replace("INDEX_2", (i+1));
   builtSelector = builtSelector.replace("INDEX",pageGridId);

   let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
   foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
    
    let box_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
  
    let bed_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
          return element? element.innerHTML:null;
    }, bedSelector);
  
    let bath_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, bathSelector);
  
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
  
    res = box_result;
	  
	  
    
    
    var gLiving = grossArea_result;
  
    
    var lArea = livingArea_result;
 
 
 await page.click(boxSelector);
 
// await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});

    await page.waitFor(1000);
 
  address_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  zip_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  soldPrice_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, soldPriceResults);
 
  taxValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, taxValueResults);
 
  landValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, landValueResults);
  
  buildValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, buildValueResults);
  
  cityValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, cityValueResults);
  
  list_length  = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
    return elements.length;
  }, '#pagtag_table');
  //console.log(list_length);
  
  href = 'N/A';
    
  Owner = [];
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
    ownerName_result = href;

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
  Address = [];
  
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
    
   
  
    ownerAddress_result = href;
    
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

   Zip = [];
  
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
  
    ownerZip_result = href;
    
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
   City = [];
  
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
  
    ownerCity_result = href;
    
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
  
    State = [];

   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              State.push(href);
      //console.log('--------> ', href)
  }
  
    ownerState_result = href;

    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerState_result = State[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerState_result = State[1];
    }
  
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
  
  ownerPhone_result = href;
  
    // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
  await page.click('#principal__resultTab',{delay:1000});

  var OwnerOne = ownerName_result.split(';');
  
  var OwnerNoAmp = OwnerOne[0].split('&'); 
 
  soldPrice = soldPrice_result.replace(',','');
  taxValue = taxValue_result.replace(',','');
  landValue = landValue_result.replace(',','');
  buildValue = buildValue_result.replace(',','');
 
  json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':OwnerNoAmp[0],'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
  data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result];

  //oName = capitalizeFirst(ownerName_result);

  var OwnerParts = OwnerNoAmp[0].split(' ');

    var OwnerFirstName = "";

    var OwnerName = "";

    if(OwnerParts.length >= 3)
    {
   
        OwnerFirstName =  capitalizeFirst(OwnerParts[1]) + " " + capitalizeFirst(OwnerParts[2]);

    }
    else if(OwnerParts.length >= 2)
    {
        OwnerFirstName = capitalizeFirst(OwnerParts[1]);
    }
    

    OwnerName = OwnerFirstName +" "+ capitalizeFirst(OwnerParts[0]);

  tempdatajson = {'owner_name':OwnerName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};
  
  
  dataInserted;
   
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
      tempData.push(tempdatajson);
   }
 
   podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

    //console.log(podioJson);
    //console.log(intakeDate);

   
  
  
    await request.on('done', function (rowCount, more, rows) {
    dataInserted = rowCount;


   });
  
  
  // //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

}//end of Marion

//Polk
try
{
	await page.click('#principal__searchTab',{delay:2000});
}
catch(err)
 {
 	console.log(err);
} 

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.click("#ext-gen201", {delay:2000});

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
//await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});

await page.keyboard.down('Enter'); 



  
try
{
  await page.click(SearchSelector.toString()),{delay:4000};
}
catch(err)
{
  console.log(err);
 // await page.click('#ext-gen130'),{delay:5000};
}
  
await page.waitFor(3000);
  
console.log("Starting Polk");
  
  try
  {
    // await page.waitForSelector('#result_orderby_data');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);
     //sendZeroResultsEmail();
	   //await browser.close();
  } 

  await page.waitFor(4000);

    pageSelector = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[1].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageSelector = '#'+pageSelector;
  
    pageNumber = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageSelector);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  pageNumber = pageNumber.replace('of ','');
  
  //console.log(pageNumber);
  
    pageTotal = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('xtb-text'));
      return elements[3].getAttribute("id");
     });
   //console.log(pageSelector);
  
   pageTotal = '#'+pageTotal;
  
   pgTotal = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, pageTotal);
  
  //  let pageNumber = await page.evaluate((sel) => {
  //   let elements = Array.from(document.querySelectorAll(sel));
  //   return elements.length;
  // }, ('#'+pageSelector));
  
  //pageNumber = pageNumber.replace('of ','');
  
    console.log(pgTotal);
  
    pageNumberAdvanceId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
      return elements[0].getAttribute("id");
     });
  
     pageNumberAdvanceId = '#'+pageNumberAdvanceId;

  
  
    pageGridId = await page.evaluate(() => {
    let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
      return elements[0].getAttribute("id");
     });
  
  //console.log(pageGridId);
  
   pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
   pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
   pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
   pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
   pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
   pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
   pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
   pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
   pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
   pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
   pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
   pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
   pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
   pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
   pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
   pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
   pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
   pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
   pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
   pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
   pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
   pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
   pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
   pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
   pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
   pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
   pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
   pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
   pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
   pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
   pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
   pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
   pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
   pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
   pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
   pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
   pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
   pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
   pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
   pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
   pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
   pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
   pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
   pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
   pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
   pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
   pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
   pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
   pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
   pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
   pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
   pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");
  
  
  pageNumber = pageNumber-1; 

 for (let i = 0; i <= pageNumber ; i++) 
{

  if(i > 0)
  {
    await page.focus(pageNumberAdvanceId, {delay:1000});
    await page.click(pageNumberAdvanceId,{delay:4000});
    await page.waitFor(2000);
    
    //await page.waitForSelector('#result_orderby_data');
 }


 let boxResult1  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow1);
 //console.log(boxResult1);

 let boxResult2  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow2);
 //console.log(boxResult2);

 let boxResult3  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow3);
 //console.log(boxResult3);

 let boxResult4  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow4);
 //console.log(boxResult4);

 let boxResult5  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
 }, pageGridOneRow5);
 //console.log(boxResult5);

 let boxResult6  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow6);
 //console.log(boxResult6);

 let boxResult7  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow7);
 //console.log(boxResult7);

 let boxResult8  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow8);
 //console.log(boxResult8);

 let boxResult9  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow9);
 //console.log(boxResult9);

 let boxResult10  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow10);
 //console.log(boxResult10);
 
 let boxResult11  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow11);
 //console.log(boxResult1);

 let boxResult12  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow12);
 //console.log(boxResult2);

 let boxResult13  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow13);
 //console.log(boxResult3);

 let boxResult14  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow14);
 //console.log(boxResult4);

 let boxResult15  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow15);
 //console.log(boxResult5);

 let boxResult16  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow16);
 //console.log(boxResult6);

 let boxResult17  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow17);
 //console.log(boxResult7);

 let boxResult18  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow18);
 //console.log(boxResult8);

 let boxResult19  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow19);
 //console.log(boxResult9);

 let boxResult20  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow20);
 //console.log(boxResult10);

 let boxResult21  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow21);
 //console.log(boxResult1);

 let boxResult22  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow22);
 //console.log(boxResult2);

 let boxResult23  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow23);
 //console.log(boxResult3);

 let boxResult24  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow24);
 //console.log(boxResult4);

 let boxResult25  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow25);
 //console.log(boxResult5);

 let boxResult26  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow26);
 //console.log(boxResult6);

 let boxResult27  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow27);
 //console.log(boxResult7);

 let boxResult28  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow28);
 //console.log(boxResult8);

 let boxResult29  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow29);
 //console.log(boxResult9);

 let boxResult30  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow30);
 //console.log(boxResult10);

 let boxResult31  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow31);
 //console.log(boxResult1);

 let boxResult32  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow32);
 //console.log(boxResult2);

 let boxResult33  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow33);
 //console.log(boxResult3);

 let boxResult34  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow34);
 //console.log(boxResult4);

 let boxResult35  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow35);
 //console.log(boxResult5);

 let boxResult36  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow36);
 //console.log(boxResult6);

 let boxResult37  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow37);
 //console.log(boxResult7);

 let boxResult38  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow38);
 //console.log(boxResult8);

 let boxResult39  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow39);
 //console.log(boxResult9);

 let boxResult40  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow40);
 //console.log(boxResult10);

 let boxResult41  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow41);
 //console.log(boxResult1);

 let boxResult42  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow42);
 //console.log(boxResult2);

 let boxResult43  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow43);
 //console.log(boxResult3);

 let boxResult44  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow44);
 //console.log(boxResult4);

 let boxResult45  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow45);
 //console.log(boxResult5);

 let boxResult46  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow46);
 //console.log(boxResult6);

 let boxResult47  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow47);
 //console.log(boxResult7);

 let boxResult48  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow48);
 //console.log(boxResult8);

 let boxResult49  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow49);
 //console.log(boxResult9);

 let boxResult50  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow50);
 //console.log(boxResult10);

 let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
   boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
   boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
   boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
   boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
 );
 boxNumbers  = boxNumbers -1;

 for (let i = 0; i <= boxNumbers ; i++) 
 {

   let boxSelector = boxResults.replace("INDEX_2", (i+1));
   boxSelector = boxSelector.replace("INDEX",pageGridId);
   //console.log(boxSelector);
   let bedSelector = bedResults.replace("INDEX_2",(i+1));
   bedSelector = bedSelector.replace("INDEX",pageGridId);
   //console.log(bedSelector);
   let bathSelector = bathResults.replace("INDEX_2",(i+1));
   bathSelector = bathSelector.replace("INDEX",pageGridId);
   //console.log(bathSelector);
   let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
   grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
   // console.log(grossAreaSelector);
   let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
   livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

   let poolSelector = poolResults.replace("INDEX_2", (i+1));
   poolSelector = poolSelector.replace("INDEX",pageGridId);

   let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
   waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

   let builtSelector = builtResults.replace("INDEX_2", (i+1));
   builtSelector = builtSelector.replace("INDEX",pageGridId);

   let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
   foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
    
    let box_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
  
    let bed_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
          return element? element.innerHTML:null;
    }, bedSelector);
  
    let bath_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, bathSelector);
  
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
  
    res = box_result;
	  
	  
    
    
    var gLiving = grossArea_result;
    
    
    var lArea = livingArea_result;
 
 
 await page.click(boxSelector);
 
// await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});

    await page.waitFor(1000);
 
  address_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  zip_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  soldPrice_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, soldPriceResults);
 
  taxValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, taxValueResults);
 
  landValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, landValueResults);
  
  buildValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, buildValueResults);
  
  cityValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, cityValueResults);
  
  list_length  = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
    return elements.length;
  }, '#pagtag_table');
  //console.log(list_length);
  
  href = 'N/A';
    
  Owner = [];
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
    ownerName_result = href;

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
  Address = [];
  
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
    
   
  
    ownerAddress_result = href;
    
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

   Zip = [];
  
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
  
    ownerZip_result = href;
    
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
   City = [];
  
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
  
    ownerCity_result = href;
    
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
  
    State = [];

   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              State.push(href);
      //console.log('--------> ', href)
  }
  
    ownerState_result = href;

    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerState_result = State[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerState_result = State[1];
    }
  
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
  
  ownerPhone_result = href;
  
    // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
  await page.click('#principal__resultTab',{delay:1000});

  OwnerOne = ownerName_result.split(';');
  
  var OwnerNoAmp = OwnerOne[0].split('&'); 
 
  soldPrice = soldPrice_result.replace(',','');
  taxValue = taxValue_result.replace(',','');
  landValue = landValue_result.replace(',','');
  buildValue = buildValue_result.replace(',','');
 
  json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':OwnerNoAmp[0],'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
  data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result]
  
  dataInserted;

  //oName = capitalizeFirst(ownerName_result);

  var OwnerParts = OwnerNoAmp[0].split(' ');

    var OwnerFirstName = "";

    var OwnerName = "";

    if(OwnerParts.length >= 3)
    {
   
        OwnerFirstName =  capitalizeFirst(OwnerParts[1]) + " " + capitalizeFirst(OwnerParts[2]);

    }
    else if(OwnerParts.length >= 2)
    {
        OwnerFirstName = capitalizeFirst(OwnerParts[1]);
    }
    

    OwnerName = OwnerFirstName +" "+ capitalizeFirst(OwnerParts[0]);

  

  tempdatajson = {'owner_name':OwnerName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};
  
   
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
      tempData.push(tempdatajson);
  }
 
   podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

    //console.log(podioJson);
    //console.log(intakeDate);

   
  
  
    await request.on('done', function (rowCount, more, rows) {
    dataInserted = rowCount;


   });
  
  
  // //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

}//end of Polk 

//Volusia
try
{
	await page.click('#principal__searchTab',{delay:2000});
}
catch(err)
 {
 	console.log(err);
} 

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.click("#ext-gen201", {delay:2000});

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
//await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});

await page.keyboard.down('Enter'); 



  
try
{
  await page.click(SearchSelector.toString()),{delay:4000};
}
catch(err)
{
  console.log(err);
 // await page.click('#ext-gen130'),{delay:5000};
}
  
await page.waitFor(3000);

console.log("Starting Volusia");
  
  
  try
  {
    //await page.waitForSelector('#result_orderby_data');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);
     //sendZeroResultsEmail();
	   //await browser.close();
  } 

  await page.waitFor(4000);

  pageSelector = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[1].getAttribute("id");
   });
 //console.log(pageSelector);

 pageSelector = '#'+pageSelector;

  pageNumber = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageSelector);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

pageNumber = pageNumber.replace('of ','');

//console.log(pageNumber);

  pageTotal = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[3].getAttribute("id");
   });
 //console.log(pageSelector);

 pageTotal = '#'+pageTotal;

 pgTotal = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageTotal);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

//pageNumber = pageNumber.replace('of ','');

  console.log(pgTotal);

  pageNumberAdvanceId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
    return elements[0].getAttribute("id");
   });

   pageNumberAdvanceId = '#'+pageNumberAdvanceId;



  pageGridId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
    return elements[0].getAttribute("id");
   });

//console.log(pageGridId);

 pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
 pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
 pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
 pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
 pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
 pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
 pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
 pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
 pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
 pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
 pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
 pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
 pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
 pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
 pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
 pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
 pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
 pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
 pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
 pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
 pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
 pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
 pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
 pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
 pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
 pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
 pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
 pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
 pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
 pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
 pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
 pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
 pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
 pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
 pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
 pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
 pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
 pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
 pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
 pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
 pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
 pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
 pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
 pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
 pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
 pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
 pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
 pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
 pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
 pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
 pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
 pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");

 

  pageNumber = pageNumber-1; 

 for (let i = 0; i <= pageNumber ; i++) 
{

  if(i > 0)
  {
    await page.focus(pageNumberAdvanceId, {delay:1000});
    await page.click(pageNumberAdvanceId,{delay:4000});
    await page.waitFor(2000);
    
    //await page.waitForSelector('#result_orderby_data');
 }


 let boxResult1  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow1);
 //console.log(boxResult1);

 let boxResult2  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow2);
 //console.log(boxResult2);

 let boxResult3  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow3);
 //console.log(boxResult3);

 let boxResult4  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow4);
 //console.log(boxResult4);

 let boxResult5  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
 }, pageGridOneRow5);
 //console.log(boxResult5);

 let boxResult6  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow6);
 //console.log(boxResult6);

 let boxResult7  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow7);
 //console.log(boxResult7);

 let boxResult8  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow8);
 //console.log(boxResult8);

 let boxResult9  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow9);
 //console.log(boxResult9);

 let boxResult10  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow10);
 //console.log(boxResult10);
 
 let boxResult11  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow11);
 //console.log(boxResult1);

 let boxResult12  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow12);
 //console.log(boxResult2);

 let boxResult13  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow13);
 //console.log(boxResult3);

 let boxResult14  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow14);
 //console.log(boxResult4);

 let boxResult15  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow15);
 //console.log(boxResult5);

 let boxResult16  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow16);
 //console.log(boxResult6);

 let boxResult17  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow17);
 //console.log(boxResult7);

 let boxResult18  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow18);
 //console.log(boxResult8);

 let boxResult19  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow19);
 //console.log(boxResult9);

 let boxResult20  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow20);
 //console.log(boxResult10);

 let boxResult21  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow21);
 //console.log(boxResult1);

 let boxResult22  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow22);
 //console.log(boxResult2);

 let boxResult23  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow23);
 //console.log(boxResult3);

 let boxResult24  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow24);
 //console.log(boxResult4);

 let boxResult25  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow25);
 //console.log(boxResult5);

 let boxResult26  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow26);
 //console.log(boxResult6);

 let boxResult27  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow27);
 //console.log(boxResult7);

 let boxResult28  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow28);
 //console.log(boxResult8);

 let boxResult29  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow29);
 //console.log(boxResult9);

 let boxResult30  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow30);
 //console.log(boxResult10);

 let boxResult31  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow31);
 //console.log(boxResult1);

 let boxResult32  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow32);
 //console.log(boxResult2);

 let boxResult33  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow33);
 //console.log(boxResult3);

 let boxResult34  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow34);
 //console.log(boxResult4);

 let boxResult35  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow35);
 //console.log(boxResult5);

 let boxResult36  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow36);
 //console.log(boxResult6);

 let boxResult37  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow37);
 //console.log(boxResult7);

 let boxResult38  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow38);
 //console.log(boxResult8);

 let boxResult39  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow39);
 //console.log(boxResult9);

 let boxResult40  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow40);
 //console.log(boxResult10);

 let boxResult41  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow41);
 //console.log(boxResult1);

 let boxResult42  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow42);
 //console.log(boxResult2);

 let boxResult43  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow43);
 //console.log(boxResult3);

 let boxResult44  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow44);
 //console.log(boxResult4);

 let boxResult45  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow45);
 //console.log(boxResult5);

 let boxResult46  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow46);
 //console.log(boxResult6);

 let boxResult47  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow47);
 //console.log(boxResult7);

 let boxResult48  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow48);
 //console.log(boxResult8);

 let boxResult49  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow49);
 //console.log(boxResult9);

 let boxResult50  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow50);
 //console.log(boxResult10);

 let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
   boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
   boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
   boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
   boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
 );
 boxNumbers  = boxNumbers -1;

 for (let i = 0; i <= boxNumbers ; i++) 
 {

   let boxSelector = boxResults.replace("INDEX_2", (i+1));
   boxSelector = boxSelector.replace("INDEX",pageGridId);
   //console.log(boxSelector);
   let bedSelector = bedResults.replace("INDEX_2",(i+1));
   bedSelector = bedSelector.replace("INDEX",pageGridId);
   //console.log(bedSelector);
   let bathSelector = bathResults.replace("INDEX_2",(i+1));
   bathSelector = bathSelector.replace("INDEX",pageGridId);
   //console.log(bathSelector);
   let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
   grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
   // console.log(grossAreaSelector);
   let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
   livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

   let poolSelector = poolResults.replace("INDEX_2", (i+1));
   poolSelector = poolSelector.replace("INDEX",pageGridId);

   let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
   waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

   let builtSelector = builtResults.replace("INDEX_2", (i+1));
   builtSelector = builtSelector.replace("INDEX",pageGridId);

   let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
   foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
    
    let box_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
  
    let bed_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
          return element? element.innerHTML:null;
    }, bedSelector);
  
    let bath_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, bathSelector);
  
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
  
    res = box_result;
	  
	  
   
    
    var gLiving = grossArea_result;
  
    
    var lArea = livingArea_result;
 
 
 await page.click(boxSelector);
 
// await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});

    await page.waitFor(1000);
 
  address_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  zip_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  soldPrice_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, soldPriceResults);
 
  taxValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, taxValueResults);
 
  landValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, landValueResults);
  
  buildValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, buildValueResults);
  
  cityValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, cityValueResults);
  
  list_length  = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
    return elements.length;
  }, '#pagtag_table');
  //console.log(list_length);
  
  href = 'N/A';
    
  Owner = [];
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
    ownerName_result = href;

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
  Address = [];
  
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
    
   
  
    ownerAddress_result = href;
    
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

   Zip = [];
  
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
  
    ownerZip_result = href;
    
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
   City = [];
  
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
  
    ownerCity_result = href;
    
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

     State = [];
  
   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              State.push(href);
      //console.log('--------> ', href)
  }
  
    ownerState_result = href;

    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerState_result = State[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerState_result = State[1];
    }
  
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
  
  ownerPhone_result = href;
  
    // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
  await page.click('#principal__resultTab',{delay:1000});

  OwnerOne = ownerName_result.split(';');
  
  var OwnerNoAmp = OwnerOne[0].split('&'); 
 
  soldPrice = soldPrice_result.replace(',','');
  taxValue = taxValue_result.replace(',','');
  landValue = landValue_result.replace(',','');
  buildValue = buildValue_result.replace(',','');
 
  json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':OwnerNoAmp[0],'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
  data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result];
  dataInserted;

  //oName = capitalizeFirst(ownerName_result);

  var OwnerParts = OwnerNoAmp[0].split(' ');

  var OwnerFirstName = "";

  var OwnerName = "";

  if(OwnerParts.length >= 3)
  {
 
      OwnerFirstName =  capitalizeFirst(OwnerParts[1]) + " " + capitalizeFirst(OwnerParts[2]);

  }
  else if(OwnerParts.length >= 2)
  {
      OwnerFirstName = capitalizeFirst(OwnerParts[1]);
  }
  

  OwnerName = OwnerFirstName +" "+ capitalizeFirst(OwnerParts[0]);

  tempdatajson = {'owner_name':OwnerName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};
  
   
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
      tempData.push(tempdatajson);
   }
 
   podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

    //console.log(podioJson);
    //console.log(intakeDate);

   
  
  
    await request.on('done', function (rowCount, more, rows) {
    dataInserted = rowCount;


   });
  
  
  // //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

}//end of Volusia

//Seminole
try
{
	await page.click('#principal__searchTab',{delay:2000});
}
catch(err)
 {
 	console.log(err);
} 

//await page.waitForNavigation({waitUntil:'networkidle0'});
await page.click("#ext-gen201", {delay:2000});

await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
await page.keyboard.press('ArrowUp',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
//await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});
// await page.keyboard.press('ArrowDown',{delay:250});

await page.keyboard.down('Enter'); 



  
try
{
  await page.click(SearchSelector.toString()),{delay:3000};
}
catch(err)
{
  console.log(err);
 // await page.click('#ext-gen130'),{delay:5000};
}
await page.waitFor(3000);

console.log("Starting Seminole");
  
  
  try
  {
    //await page.waitForSelector('#result_orderby_data');
    await page.waitForSelector('#templateCombo');
  }
  catch(error2)
  {
	   console.log(error2);
     
     //sendZeroResultsEmail();
	   //await browser.close();
  } 

  await page.waitFor(4000);

  pageSelector = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[1].getAttribute("id");
   });
 //console.log(pageSelector);

 pageSelector = '#'+pageSelector;

  pageNumber = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageSelector);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

pageNumber = pageNumber.replace('of ','');

//console.log(pageNumber);

  pageTotal = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('xtb-text'));
    return elements[3].getAttribute("id");
   });
 //console.log(pageSelector);

 pageTotal = '#'+pageTotal;

 pgTotal = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
    return element? element.innerHTML:null;
    }, pageTotal);

//  let pageNumber = await page.evaluate((sel) => {
//   let elements = Array.from(document.querySelectorAll(sel));
//   return elements.length;
// }, ('#'+pageSelector));

//pageNumber = pageNumber.replace('of ','');

  console.log(pgTotal);

  pageNumberAdvanceId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName(' x-btn-text x-tbar-page-next'));
    return elements[0].getAttribute("id");
   });

   pageNumberAdvanceId = '#'+pageNumberAdvanceId;



  pageGridId = await page.evaluate(() => {
  let elements = Array.from(document.getElementsByClassName('x-grid3-body'));
    return elements[0].getAttribute("id");
   });

//console.log(pageGridId);

 pageGridSelector = ' #INDEX > div:nth-child(INDEX_2) > table > tbody > tr > td.x-grid3-col.x-grid3-cell.x-grid3-td-1 > div > div > div'
 pageGridOne = pageGridSelector.replace("INDEX",pageGridId);
 pageGridOneRow1 = pageGridOne.replace("INDEX_2","1");
 pageGridOneRow2 = pageGridOne.replace("INDEX_2","2");
 pageGridOneRow3 = pageGridOne.replace("INDEX_2","3");
 pageGridOneRow4 = pageGridOne.replace("INDEX_2","4");
 pageGridOneRow5 = pageGridOne.replace("INDEX_2","5");
 pageGridOneRow6 = pageGridOne.replace("INDEX_2","6");
 pageGridOneRow7 = pageGridOne.replace("INDEX_2","7");
 pageGridOneRow8 = pageGridOne.replace("INDEX_2","8");
 pageGridOneRow9 = pageGridOne.replace("INDEX_2","9");
 pageGridOneRow10 = pageGridOne.replace("INDEX_2","10");
 pageGridOneRow11 = pageGridOne.replace("INDEX_2","11");
 pageGridOneRow12 = pageGridOne.replace("INDEX_2","12");
 pageGridOneRow13 = pageGridOne.replace("INDEX_2","13");
 pageGridOneRow14 = pageGridOne.replace("INDEX_2","14");
 pageGridOneRow15 = pageGridOne.replace("INDEX_2","15");
 pageGridOneRow16 = pageGridOne.replace("INDEX_2","16");
 pageGridOneRow17 = pageGridOne.replace("INDEX_2","17");
 pageGridOneRow18 = pageGridOne.replace("INDEX_2","18");
 pageGridOneRow19 = pageGridOne.replace("INDEX_2","19");
 pageGridOneRow20 = pageGridOne.replace("INDEX_2","20");
 pageGridOneRow21 = pageGridOne.replace("INDEX_2","21");
 pageGridOneRow22 = pageGridOne.replace("INDEX_2","22");
 pageGridOneRow23 = pageGridOne.replace("INDEX_2","23");
 pageGridOneRow24 = pageGridOne.replace("INDEX_2","24");
 pageGridOneRow25 = pageGridOne.replace("INDEX_2","25");
 pageGridOneRow26 = pageGridOne.replace("INDEX_2","26");
 pageGridOneRow27 = pageGridOne.replace("INDEX_2","27");
 pageGridOneRow28 = pageGridOne.replace("INDEX_2","28");
 pageGridOneRow29 = pageGridOne.replace("INDEX_2","29");
 pageGridOneRow30 = pageGridOne.replace("INDEX_2","30");
 pageGridOneRow31 = pageGridOne.replace("INDEX_2","31");
 pageGridOneRow32 = pageGridOne.replace("INDEX_2","32");
 pageGridOneRow33 = pageGridOne.replace("INDEX_2","33");
 pageGridOneRow34 = pageGridOne.replace("INDEX_2","34");
 pageGridOneRow35 = pageGridOne.replace("INDEX_2","35");
 pageGridOneRow36 = pageGridOne.replace("INDEX_2","36");
 pageGridOneRow37 = pageGridOne.replace("INDEX_2","37");
 pageGridOneRow38 = pageGridOne.replace("INDEX_2","38");
 pageGridOneRow39 = pageGridOne.replace("INDEX_2","39");
 pageGridOneRow40 = pageGridOne.replace("INDEX_2","40");
 pageGridOneRow41 = pageGridOne.replace("INDEX_2","41");
 pageGridOneRow42 = pageGridOne.replace("INDEX_2","42");
 pageGridOneRow43 = pageGridOne.replace("INDEX_2","43");
 pageGridOneRow44 = pageGridOne.replace("INDEX_2","44");
 pageGridOneRow45 = pageGridOne.replace("INDEX_2","45");
 pageGridOneRow46 = pageGridOne.replace("INDEX_2","46");
 pageGridOneRow47 = pageGridOne.replace("INDEX_2","47");
 pageGridOneRow48 = pageGridOne.replace("INDEX_2","48");
 pageGridOneRow49 = pageGridOne.replace("INDEX_2","49");
 pageGridOneRow50 = pageGridOne.replace("INDEX_2","50");
 
  pageNumber = pageNumber-1; 

 for (let i = 0; i <= pageNumber ; i++) 
{

  if(i > 0)
  {
    await page.focus(pageNumberAdvanceId, {delay:1000});
    await page.click(pageNumberAdvanceId,{delay:4000});
    await page.waitFor(2000);
    
    //await page.waitForSelector('#result_orderby_data');
 }


 let boxResult1  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow1);
 //console.log(boxResult1);

 let boxResult2  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow2);
 //console.log(boxResult2);

 let boxResult3  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow3);
 //console.log(boxResult3);

 let boxResult4  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow4);
 //console.log(boxResult4);

 let boxResult5  = await page.evaluate((sel) => {
      let elements = Array.from(document.querySelectorAll(sel));
        return elements.length;
 }, pageGridOneRow5);
 //console.log(boxResult5);

 let boxResult6  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow6);
 //console.log(boxResult6);

 let boxResult7  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow7);
 //console.log(boxResult7);

 let boxResult8  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow8);
 //console.log(boxResult8);

 let boxResult9  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow9);
 //console.log(boxResult9);

 let boxResult10  = await page.evaluate((sel) => {
        let elements = Array.from(document.querySelectorAll(sel));
          return elements.length;
 }, pageGridOneRow10);
 //console.log(boxResult10);
 
 let boxResult11  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow11);
 //console.log(boxResult1);

 let boxResult12  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow12);
 //console.log(boxResult2);

 let boxResult13  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow13);
 //console.log(boxResult3);

 let boxResult14  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow14);
 //console.log(boxResult4);

 let boxResult15  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow15);
 //console.log(boxResult5);

 let boxResult16  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
           return elements.length;
 }, pageGridOneRow16);
 //console.log(boxResult6);

 let boxResult17  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow17);
 //console.log(boxResult7);

 let boxResult18  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow18);
 //console.log(boxResult8);

 let boxResult19  = await page.evaluate((sel) => {
         let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow19);
 //console.log(boxResult9);

 let boxResult20  = await page.evaluate((sel) => {
       let elements = Array.from(document.querySelectorAll(sel));
         return elements.length;
 }, pageGridOneRow20);
 //console.log(boxResult10);

 let boxResult21  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow21);
 //console.log(boxResult1);

 let boxResult22  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow22);
 //console.log(boxResult2);

 let boxResult23  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow23);
 //console.log(boxResult3);

 let boxResult24  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow24);
 //console.log(boxResult4);

 let boxResult25  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow25);
 //console.log(boxResult5);

 let boxResult26  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow26);
 //console.log(boxResult6);

 let boxResult27  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow27);
 //console.log(boxResult7);

 let boxResult28  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow28);
 //console.log(boxResult8);

 let boxResult29  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow29);
 //console.log(boxResult9);

 let boxResult30  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow30);
 //console.log(boxResult10);

 let boxResult31  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow31);
 //console.log(boxResult1);

 let boxResult32  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow32);
 //console.log(boxResult2);

 let boxResult33  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow33);
 //console.log(boxResult3);

 let boxResult34  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow34);
 //console.log(boxResult4);

 let boxResult35  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow35);
 //console.log(boxResult5);

 let boxResult36  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow36);
 //console.log(boxResult6);

 let boxResult37  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow37);
 //console.log(boxResult7);

 let boxResult38  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow38);
 //console.log(boxResult8);

 let boxResult39  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow39);
 //console.log(boxResult9);

 let boxResult40  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow40);
 //console.log(boxResult10);

 let boxResult41  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow41);
 //console.log(boxResult1);

 let boxResult42  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow42);
 //console.log(boxResult2);

 let boxResult43  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow43);
 //console.log(boxResult3);

 let boxResult44  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow44);
 //console.log(boxResult4);

 let boxResult45  = await page.evaluate((sel) => {
 let elements = Array.from(document.querySelectorAll(sel));
   return elements.length;
 }, pageGridOneRow45);
 //console.log(boxResult5);

 let boxResult46  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
       return elements.length;
 }, pageGridOneRow46);
 //console.log(boxResult6);

 let boxResult47  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow47);
 //console.log(boxResult7);

 let boxResult48  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow48);
 //console.log(boxResult8);

 let boxResult49  = await page.evaluate((sel) => {
     let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow49);
 //console.log(boxResult9);

 let boxResult50  = await page.evaluate((sel) => {
   let elements = Array.from(document.querySelectorAll(sel));
     return elements.length;
 }, pageGridOneRow50);
 //console.log(boxResult10);

 let boxNumbers = (boxResult1+boxResult2+boxResult3+boxResult4+boxResult5+boxResult6+boxResult7+boxResult8+boxResult9+boxResult10+
   boxResult11+boxResult12+boxResult13+boxResult14+boxResult15+boxResult16+boxResult17+boxResult18+boxResult19+boxResult20+
   boxResult21+boxResult22+boxResult23+boxResult24+boxResult25+boxResult26+boxResult27+boxResult28+boxResult29+boxResult30+
   boxResult31+boxResult32+boxResult33+boxResult34+boxResult35+boxResult36+boxResult37+boxResult38+boxResult39+boxResult40+
   boxResult41+boxResult42+boxResult43+boxResult44+boxResult45+boxResult46+boxResult47+boxResult48+boxResult49+boxResult50
 );
 boxNumbers  = boxNumbers -1;

 for (let i = 0; i <= boxNumbers ; i++) 
 {

   let boxSelector = boxResults.replace("INDEX_2", (i+1));
   boxSelector = boxSelector.replace("INDEX",pageGridId);
   //console.log(boxSelector);
   let bedSelector = bedResults.replace("INDEX_2",(i+1));
   bedSelector = bedSelector.replace("INDEX",pageGridId);
   //console.log(bedSelector);
   let bathSelector = bathResults.replace("INDEX_2",(i+1));
   bathSelector = bathSelector.replace("INDEX",pageGridId);
   //console.log(bathSelector);
   let grossAreaSelector = grossAreaResults.replace("INDEX_2", (i+1));
   grossAreaSelector = grossAreaSelector.replace("INDEX",pageGridId);
   // console.log(grossAreaSelector);
   let livingAreaSelector = livingAreaResults.replace("INDEX_2", (i+1));
   livingAreaSelector = livingAreaSelector.replace("INDEX",pageGridId);

   let poolSelector = poolResults.replace("INDEX_2", (i+1));
   poolSelector = poolSelector.replace("INDEX",pageGridId);

   let waterFrontSelector = waterFrontResults.replace("INDEX_2", (i+1));
   waterFrontSelector = waterFrontSelector.replace("INDEX",pageGridId);

   let builtSelector = builtResults.replace("INDEX_2", (i+1));
   builtSelector = builtSelector.replace("INDEX",pageGridId);

   let foreclosureSelector = foreclosureResults.replace("INDEX_2", (i+1));
   foreclosureSelector = foreclosureSelector.replace("INDEX",pageGridId);
    
    let box_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, boxSelector);
  
    let bed_result = await page.evaluate((sel) => {
     let element = document.querySelector(sel);
          return element? element.innerHTML:null;
    }, bedSelector);
  
    let bath_result = await page.evaluate((sel) => {
    let element = document.querySelector(sel);
      return element? element.innerHTML:null;
      }, bathSelector);
  
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
  
    res = box_result;
	  
	  
    
    
    var gLiving = grossArea_result;
    
    
    
    var lArea = livingArea_result;
 
 
 await page.click(boxSelector);
 
// await page.waitForSelector('#psummary_data_div > div > h1:nth-child(4)',{delay:1000});

    await page.waitFor(1000);
 
  address_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, addressResults);
 
 
  zip_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:null;
    }, zipResults);
 
 
  soldPrice_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, soldPriceResults);
 
  taxValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, taxValueResults);
 
  landValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, landValueResults);
  
  buildValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, buildValueResults);
  
  cityValue_result = await page.evaluate((sel) => {
  let element = document.querySelector(sel);
     return element? element.innerHTML:"0";
    }, cityValueResults);
  
  list_length  = await page.evaluate((sel) => {
  let elements = Array.from(document.querySelectorAll(sel));
    return elements.length;
  }, '#pagtag_table');
  //console.log(list_length);
  
  href = 'N/A';
    
  Owner = [];
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
    ownerName_result = href;

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
  Address = [];
  
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
    
   
  
    ownerAddress_result = href;
    
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

   Zip = [];
  
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
  
    ownerZip_result = href;
    
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
   City = [];
  
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
  
    ownerCity_result = href;
    
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

     State = [];
  
   for(let i=1; i< list_length; i++){
      href = await page.evaluate((l, sel) => {
                  let elements= Array.from(document.querySelectorAll(sel));
                  let anchor  = elements[l].getElementsByTagName('td')[9];
                  if(anchor){
                      return anchor.innerHTML;
                  }else{
                      return 'N/A';
                  }
              }, i, '#pagtag_table');
              State.push(href);
      //console.log('--------> ', href)
  }
  
    ownerState_result = href;

    if(list_length == 3)
    {
       // console.log("ListLength=3");
       ownerState_result = State[0];
    }
    else if(list_length == 4)
    {
      //console.log("ListLength=4");
      ownerState_result = State[1];
    }
  
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
  
  ownerPhone_result = href;
  
    // let ownerPhone_result = await page.evaluate((sel) => {
    // let element = document.querySelector(sel);
    // return element? element.innerHTML:"N/A";
    //}, ownerPhoneNumber1ValueResults);
 
 
  await page.click('#principal__resultTab',{delay:1000});

  //OwnerOne = ownerName_result.split(';');
  
  //var OwnerNoAmp = OwnerOne[0].split('&'); 
 
  soldPrice = soldPrice_result.replace(',','');
  taxValue = taxValue_result.replace(',','');
  landValue = landValue_result.replace(',','');
  buildValue = buildValue_result.replace(',','');

  var OwnerOne = ownerName_result.split(';');


  var FirstName = OwnerOne[0].split(',');

  var ContainSecondName = false; 

  var FinalName = "";

  if(FirstName.length > 1)
  {
    ContainSecondName = true;
  }

  if(ContainSecondName)
  {
    FinalName = (FirstName[1].charAt(1).toUpperCase() + FirstName[1].slice(2).toLowerCase())+" "+capitalizeFirst(FirstName[0]);
  }
  else
  {
    FinalName = capitalizeFirst(FirstName[0]);
  }
 
  json = {'city':cityValue_result,'address':address_result,'unit':"",'zip':zip_result,'garea':gLiving,'larea':lArea,'beds':bed_result, 'baths':bath_result,'pool':pool_result,'wf':waterFront_result,'built':built_result,'frclosure':foreclosure_result,'sold_price':soldPrice,'tax_value':taxValue,'land_value':landValue,'build_value':buildValue,'owner_name':FinalName,'owner_address':ownerAddress_result,'owner_zip':ownerZip_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_phone':ownerPhone_result};
   
  data = [ownerName_result,address_result +" ,"+ cityValue_result + " ," + zip_result];
  dataInserted;

  

  tempdatajson = {'owner_name':FinalName,'address':address_result,'city':capitalizeFirst(cityValue_result),'owner_address':ownerAddress_result,'owner_city':ownerCity_result,'owner_state':ownerState_result,'owner_zip':ownerZip_result};
  
   
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
      tempData.push(tempdatajson);
   }
 
   podioJson = {"fields":{"title":ownerName_result,"lead-source":sourceData,"lead-intake-date":intakeDate,"motivation":7,"status-of-lead":14,"next-action":15,"property-address":address_result +" ,"+ cityValue_result+" ,"+zip_result ,"owners-address":ownerAddress_result +" ,"+ ownerCity_result+" ,"+ownerZip_result,"estimated-value":{"value":buildValue,"currency":"USD"},"beds-2":bed_result,"baths-2":bath_result,"square-feet":lArea,"year-built-2":built_result,"property-taxes-assement":taxValue,"last-sale-price":soldPrice}};

    //console.log(podioJson);
    //console.log(intakeDate);

   
  
  
    await request.on('done', function (rowCount, more, rows) {
    dataInserted = rowCount;


   });
  
  
  // //console.log(dataInserted);
  if(dataInserted > 0)
  {
    insertPODIOItem(podioJson);
  }
 
}

} 



  var fileName = dateFirstDayString + ' to ' + dateString + ' LP.csv';
  
  var fileNameLetterOne = dateFirstDayString + ' to ' + dateString + ' LP Letter 1.docx';

  var fileNameLetterTwo = dateFirstDayString + ' to ' + dateString + ' LP Letter 2.docx';



   var json2csvCallback = function (err, csv) 
   {
    if (err) throw err;
    //console.log(csv);
	
    fs.writeFile(fileName, csv, function(err) 
    {
      if (err) throw err;
      console.log('file saved');
	    thecsv = csv;    
      });
    }; 

    var template = fs.readFileSync(path.resolve(__dirname,'lis_pendons_template.docx'),'binary');
    var zip = new JSZip(template);

    var doc = new Docxtemplater();
    //doc.setOptions({paragraphLoop: true});
    doc.loadZip(zip);

    var loopData = {'letters':tempData};

    //console.log(loopData)

    doc.setData(loopData);

    try{
        doc.render();
    }
    catch(error){
        var e = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          properties:error.properties,
        }
        console.log(JSON.stringify({error:e}));
        throw error;
    }

    buf = doc.getZip().generate({type:'nodebuffer'});

    await fs.writeFileSync(path.resolve(__dirname,fileNameLetterOne),buf);

    var template2 = fs.readFileSync(path.resolve(__dirname,'lis_pendons_template2.docx'),'binary');
    var zip2 = new JSZip(template2);

    var doc2 = new Docxtemplater();
    doc2.loadZip(zip2);

    var loopData2 = {'letters':tempData};

    //console.log(loopData)

    doc2.setData(loopData2);

    try{
        doc2.render();
    }
    catch(error){
        var e = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          properties:error.properties,
        }
        console.log(JSON.stringify({error:e}));
        throw error;
    }

    buf2 = doc2.getZip().generate({type:'nodebuffer'});

    await fs.writeFileSync(path.resolve(__dirname,fileNameLetterTwo),buf2);

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
      await sendTheEmail(fileName,fileNameLetterOne,fileNameLetterTwo);
 }

  await page.waitFor(1500);


//console.log(Date.now());
  await browser.close();

  await connection.close();

  //await getREIFaxProbate();

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
//if(viewData.length == 0)
//{
//    sendZeroResultsEmailProbate();
//}
//else
//{
//    sendTheEmailProbate(fileName);
//}

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
	  subject: "REIFAX LP Mailer list No Results",
	  generateTextFromHTML: true,
	  html: "<b>REIFAX Found zero results today.</b>",
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



function sendTheEmail(fileName,fileNameLetterOne,fileNameLetterTwo)
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
  subject: "REIFAX LP SIX Counties",
  generateTextFromHTML: true,
  html: "<b>REIFAX From the machines!</b>",
  attachments: [{   filename: fileName,// file on disk as an attachment
					content: thecsv }
        , {filename: fileNameLetterOne,
          content:  buf }
          , {filename: fileNameLetterTwo,
            content:  buf2 }]
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
	month = '' + (d.getMonth()),
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

   function capitalizeFirst(string)
   {
     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
   }

   function FlipAroundFirstName(string)
   {

    var OwnerParts = string.split(' ');

    var OwnerFirstName = "";

    var OwnerName = "";

    if(OwnerParts.length >= 3)
    {
   
        OwnerFirstName =  capitalizeFirst(OwnerParts[1]) + " " + capitalizeFirst(OwnerParts[2]);

    }
    else if(OwnerParts.length >= 2)
    {
        OwnerFirstName = capitalizeFirst(OwnerPart[1]);
    }
    

    OwnerName = OwnerFirstName +" "+ capitalizeFirst(OwnerParts[0]);

    return OwnerName

   }


getREIFaxData();



//const init = async () => {
  // run every 10 minutes
   //cron.schedule('*/10 * * * *', getREIFaxData);
   //cron.schedule('0 0 12 * * 1-5', getREIFaxData);
   //cron.schedule('0 45 12 * * 1-5', getREIFaxProbate)
//};


//init(); 



