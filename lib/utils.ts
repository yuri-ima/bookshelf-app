export function toDriveDirect(url: string) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w1600` : url;
}
