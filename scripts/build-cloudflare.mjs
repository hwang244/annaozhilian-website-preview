import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = new URL('../dist/', import.meta.url);
const outputPath = fileURLToPath(output);
const productionDomain = 'https://annobrain.com';
const publicPath = page => page.endsWith('/index.html') ? `${page.slice(0, -10)}` : page === 'index.html' ? '' : page;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL('../dark/', import.meta.url), output, { recursive: true });
await cp(new URL('../white/', import.meta.url), new URL('../dist/white/', import.meta.url), { recursive: true });

async function publishHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await publishHtml(path);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const sitePath = relative(outputPath, path).split(sep).join('/');
      if (sitePath.startsWith('white/')) continue;
      const html = await readFile(path, 'utf8');
      if (!html.includes('<meta name="robots" content="noindex,nofollow">')) {
        throw new Error(`Expected preview robots tag in ${sitePath}`);
      }
      const canonical = `${productionDomain}/${publicPath(sitePath)}`;
      const published = html.replace(
        '<meta name="robots" content="noindex,nofollow">',
        `<meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}">`,
      );
      await writeFile(path, published);
    }
  }
}

await publishHtml(outputPath);

const pages = [
  'index.html', 'product.html', 'tech.html', 'news.html', 'about.html', 'contact.html',
  'en/index.html', 'en/product.html', 'en/tech.html', 'en/news.html', 'en/about.html', 'en/contact.html',
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${productionDomain}/${publicPath(page)}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap);
await writeFile(new URL('../dist/robots.txt', import.meta.url), `User-agent: *\nAllow: /\nSitemap: ${productionDomain}/sitemap.xml\n`);
await writeFile(new URL('../dist/_redirects', import.meta.url), '/dark/* /:splat 301\n');

console.log(`Prepared ${pages.length} official pages and the white preview in dist/`);
