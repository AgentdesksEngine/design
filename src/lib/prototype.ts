function isRelativeUrl(value: string) {
  return (
    value &&
    !value.startsWith('#') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    !value.startsWith('//') &&
    !value.startsWith('/')
  );
}

function absolutize(value: string, baseUrl: string) {
  if (!isRelativeUrl(value)) return value;
  return new URL(value, baseUrl).pathname;
}

export function rewritePrototypeDocument(html: string, entryPath: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const baseUrl = new URL(entryPath, window.location.origin).href;
  for (const el of doc.querySelectorAll<HTMLElement>('[src]')) {
    const value = el.getAttribute('src');
    if (value) el.setAttribute('src', absolutize(value, baseUrl));
  }
  for (const el of doc.querySelectorAll<HTMLElement>('[href]')) {
    const value = el.getAttribute('href');
    if (value) el.setAttribute('href', absolutize(value, baseUrl));
  }
  return {
    title: doc.title,
    styles: Array.from(doc.head.querySelectorAll('style, link[rel="stylesheet"]')),
    bodyNodes: Array.from(doc.body.childNodes),
    scripts: Array.from(doc.querySelectorAll('script')),
  };
}
