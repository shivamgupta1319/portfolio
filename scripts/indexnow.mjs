// Tell IndexNow engines (Bing, Yandex, Seznam, Naver…) that the site's pages changed.
// Run after a deploy: `npm run indexnow`. The key file is public/2bb848bdc11c8422729fd9bbe65b75e2.txt.
// Sends every URL in the live sitemap; IndexNow accepts up to 10,000 per call.
const HOST = "shivamgupta.live";
const KEY = "2bb848bdc11c8422729fd9bbe65b75e2";

const sitemap = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error("no URLs found in the sitemap");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
if (res.status >= 400) process.exit(1);
