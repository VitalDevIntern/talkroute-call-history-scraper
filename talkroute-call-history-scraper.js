const puppeteer = require('puppeteer');
const fs = require('fs');

function getAccount() {
    try {
        return JSON.parse(fs.readFileSync('account.json'));
    } catch (err) {
        console.error(err);
        console.log('Please provide an account.json file!');
        process.exit();
    }
}

const account = getAccount();

const creds = {
    id: account.user.id,
    password: account.user.password
};

async function connectBrowser() {
    const browserURL = 'http://127.0.0.1:21222';
    const browser = await puppeteer.connect({ browserURL });
    const pages = await browser.pages();
    const page = pages[0];
    return { page, pages, browser };
}

async function main() {
    const { page } = await connectBrowser();

    page.goto('https://cp.talkroute.com/callhistory', { waitUntil: 'load' });

    let loggedIn = (await page.url() == 'https://cp.talkroute.com/login') ? false : true;

    if (loggedIn == false) {
        await page.waitForSelector('#username');
        await page.type('#username', creds.id);
        await page.type('#password', creds.password);
        await page.click('#_submit')
    }

    async function scrapePage() {
        await page.waitForSelector('[class="fa fa-plus"]');
        let plusListLength = await page.evaluate(() => {
            return document.querySelectorAll('[class="fa fa-plus"]').length;
        });
    
        // Looping a bit more than is stricly necessary to ensure all rows are opened
        for (let i = 0; i < plusListLength + 10; i++) {
            try {
                await page.click('[class="fa fa-plus"]');
                await page.waitForTimeout(300);
            } catch {}
        }
    
        return await page.evaluate(() => {
            let arr = [];
            document.querySelectorAll('.call-history-cdr-events').forEach((el) => {
                let rawArr = [el.innerText];
                let joinedArr = rawArr.join('');
                let formattedArr = joinedArr.split('\n');
                arr.push(formattedArr);
            });
            return arr;
        });
    }

    await page.waitForSelector('.call-history-listing');
    await page.waitForSelector('[class="fa fa-plus"]');

    let totalPages= await page.evaluate(() => {
        return parseInt(document.querySelectorAll('.call-history-paging-footer > .col-xs-12')[0].innerText.split(' ').slice(-1)[0].split('.')[0]);
    });

    let data = [];

    for (let i = 0; i < totalPages; i++) {
        await page.waitForSelector('.call-history-listing');
        await page.waitForSelector('[class="fa fa-plus"]');

        data = data.concat(await scrapePage());

        await page.click('[ng-click="selectPage(page + 1, $event)"]')
    }

    // Convert Arrays to CSV
    let csvContent = '';

    data.forEach(function (rowArray) {
        let row = rowArray.join(",");
        csvContent += row + "\r\n";
    });

    // Write CSV to file
    fs.writeFile('callDetails.csv', csvContent, (err) => {
        if (err) return console.log(err);
        console.log('Call details written to file.');
    });

}

main();