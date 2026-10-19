async function loadLayoutComponents() {
    try {
        const scriptTag = document.currentScript || document.querySelector('script[src*="inject-engine.js"]');
        const scriptSrc = scriptTag ? scriptTag.getAttribute('src') : 'js/inject-engine.js';
        const basePath = scriptSrc.replace('js/inject-engine.js', '');

        // Fetch layout partials
        const headerRes = await fetch(basePath + 'components/header.html');
        const footerRes = await fetch(basePath + 'components/footer.html');

        if (headerRes.ok) {
            const headerContainer = document.getElementById('global-header');
            if (headerContainer) {
                headerContainer.innerHTML = await headerRes.text();
            }
        } else {
            console.error(`Header 404: Could not find '${basePath}components/header.html'`);
        }

        if (footerRes.ok) {
            const footerContainer = document.getElementById('global-footer');
            if (footerContainer) {
                footerContainer.innerHTML = await footerRes.text();
            }
        } else {
            console.error(`Footer 404: Could not find '${basePath}components/footer.html'`);
        }

        // Normalize internal link paths
        document.querySelectorAll('#global-header a, #global-footer a').forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                if (href.startsWith('/')) href = href.slice(1);
                link.setAttribute('href', basePath + href);
            }
        });

        // Highlight active page link
        const currentFileName = window.location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll('[data-page]').forEach(link => {
            const page = link.getAttribute('data-page') || '';
            if (page === currentFileName || page.endsWith('/' + currentFileName) || page.split('/').pop() === currentFileName) {
                link.classList.add('text-white', 'font-bold', 'border-b-2', 'border-cyan-500', 'pb-1');
                link.classList.remove('text-zinc-400');
            }
        });

        // Setup mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        initClockEngine();

    } catch (error) {
        console.error("Layout engine error:", error);
    }
}

function initClockEngine() {
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    setInterval(() => {
        try {
            const date = new Date();
            const ny = new Intl.DateTimeFormat('en-US', { ...timeOptions, timeZone: 'America/New_York' }).format(date);
            const lon = new Intl.DateTimeFormat('en-GB', { ...timeOptions, timeZone: 'Europe/London' }).format(date);
            const tyo = new Intl.DateTimeFormat('ja-JP', { ...timeOptions, timeZone: 'Asia/Tokyo' }).format(date);
            const utc = new Intl.DateTimeFormat('en-GB', { ...timeOptions, timeZone: 'UTC' }).format(date);

            if (document.getElementById('clock-ny')) document.getElementById('clock-ny').textContent = ny;
            if (document.getElementById('clock-lon')) document.getElementById('clock-lon').textContent = lon;
            if (document.getElementById('clock-tyo')) document.getElementById('clock-tyo').textContent = tyo;
            if (document.getElementById('clock-utc')) document.getElementById('clock-utc').textContent = utc;
        } catch (e) {
            // ignore
        }
    }, 1000);
}

window.addEventListener('DOMContentLoaded', loadLayoutComponents);
