// Debug script to see exactly what's on the WorkFlowy shared page
import puppeteer from 'puppeteer';

async function debugWorkFlowy() {
    console.log('🔍 Starting WorkFlowy content debug...');
    
    const browser = await puppeteer.launch({ headless: false }); // Non-headless to see what happens
    const page = await browser.newPage();
    
    await page.goto('https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe', { 
        waitUntil: 'networkidle2',
        timeout: 60000
    });
    
    console.log('📄 Page loaded, taking screenshot...');
    await page.screenshot({ path: 'workflowy-debug.png', fullPage: true });
    
    console.log('🔍 Analyzing page structure...');
    const analysis = await page.evaluate(() => {
        return {
            title: document.title,
            url: window.location.href,
            bodyText: (document.body.innerText || '').substring(0, 500),
            totalElements: document.querySelectorAll('*').length,
            bullets: document.querySelectorAll('.bullet').length,
            content: document.querySelectorAll('.content').length,
            names: document.querySelectorAll('.name').length,
            notes: document.querySelectorAll('.note').length,
            dataIds: document.querySelectorAll('[data-id]').length,
            collapsed: document.querySelectorAll('[data-collapsed="true"]').length,
            scripts: document.querySelectorAll('script').length,
            htmlPreview: document.documentElement.outerHTML.substring(0, 1000)
        };
    });
    
    console.log('📊 Page analysis:', JSON.stringify(analysis, null, 2));
    
    console.log('⏳ Waiting to see if content loads dynamically...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const afterWait = await page.evaluate(() => {
        return {
            bodyTextLength: (document.body.innerText || '').length,
            bullets: document.querySelectorAll('.bullet').length,
            dataIds: document.querySelectorAll('[data-id]').length
        };
    });
    
    console.log('📊 After waiting:', afterWait);
    
    await browser.close();
    console.log('✅ Debug complete - check workflowy-debug.png screenshot');
}

debugWorkFlowy().catch(console.error);
