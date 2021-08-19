const puppeteer = require('puppeteer');

const launchOptions = {
    headless: false,
    args: ['--remote-debugging-port=21222'],
    userDataDir: './Profile'
};

(async () => {
    await puppeteer.launch(launchOptions);
    console.log('Browser started. Launch options:');
    console.dir(launchOptions);

})();