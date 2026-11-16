import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

window.Capacitor = Capacitor;

async function toBase64(data) {
  if (typeof data === 'string') {
    if (data.startsWith('data:')) return data.slice(data.indexOf(',') + 1);
    return data;
  }
  const buf = await data.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let bin = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

window.GingerbreadNative = {
  async exportFile(data, fname, mime) {
    const base64 = await toBase64(data);
    const safe = String(fname || 'gingerbread').replace(/[/\\]/g, '-');
    const res = await Filesystem.writeFile({
      path: safe,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: safe,
      files: [res.uri],
      dialogTitle: 'Save or share',
    });
  },
};

App.addListener('backButton', () => {
  const modal = document.getElementById('modal');
  if (modal && !modal.hidden) {
    modal.hidden = true;
    return;
  }
  App.minimizeApp();
});

(async () => {
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#1d110a' });
  } catch { /* web or unsupported */ }
  try {
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch { /* ignore */ }
})();
