
const Apify = require('apify');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminJpegtran = require('imagemin-jpegtran');

const { utils: { log } } = Apify;

const createHTML = async (emojiUrl) => {
    const head = document.getElementsByTagName('HEAD')[0];
    const styleCustom = document.createElement('style');
    head.append(styleCustom);

    const bgContainer = document.createElement('div');
    const emojiContainer = document.createElement('div');
    const emojiImage = document.createElement('img');
    emojiImage.src = emojiUrl;

    bgContainer.setAttribute('style', `
        background: url('https://darling-gumption-b9b94a.netlify.app/gradient-bg.svg');
        margin: 0;
        width: 800px;
        height: 450px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-size: fill;
    `);

    emojiContainer.setAttribute('style', `
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
    `);

    emojiImage.setAttribute('style', `
        width: 100%;
        height: 100%;
    `);
    document.body.appendChild(bgContainer);
    emojiContainer.append(emojiImage);
    bgContainer.append(emojiContainer);


};

const imagesHaveLoaded = () => { return Array.from(document.images).every((i) => i.complete); };



Apify.main(async () => {
    const { emojiUrl, debug, type } = await Apify.getInput();

    log.info('Opening the browser.');
    const browser = await Apify.launchPuppeteer({
        launchOptions: {
            headless: true,
        },
    });

    log.info(emojiUrl);

    log.info('Generating HTML');
    const resultPage = await browser.newPage();
    await resultPage.evaluate(createHTML, emojiUrl);
    await resultPage.waitForFunction(imagesHaveLoaded, { timeout: 5000 });

    // Capture the screenshot
    log.info('Capturing screenshot.');
    const screenshot = await resultPage.screenshot({ type });

    if (debug) {
        await Apify.utils.sleep(500);
        await resultPage.evaluateHandle('document.fonts.ready');
        const pageHtml = await resultPage.evaluate(async () => {
            return document.documentElement.innerHTML;
        });
        await Apify.setValue('testHtml', pageHtml, { contentType: 'text/html' });
    }

    log.info('Optimizing the image');
    const imagminPlugins = type === 'png'
        ? [imageminPngquant({ quality: [1, 1] })]
        : [imageminJpegtran()];
    const image = await imagemin.buffer(screenshot, {
        plugins: imagminPlugins,
    });

    await Apify.pushData({ status: 'Success! The image is in the run\'s key-value store.' });
    await Apify.setValue('OUTPUT', image, { contentType: `image/${type}` });

    log.info('Done.');
    await browser.close();
});
