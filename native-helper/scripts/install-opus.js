
// Script to download and install Opus codec libraries
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPUS_VERSION = '1.3.1';
const BASE_URL = 'https://archive.mozilla.org/pub/opus';

const downloads = {
  win32: {
    url: `${BASE_URL}/opus-${OPUS_VERSION}-win.zip`,
    extract: 'deps/opus'
  },
  darwin: {
    url: `${BASE_URL}/opus-${OPUS_VERSION}-mac.tar.gz`,
    extract: 'deps/opus'
  }
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function installOpus() {
  const platform = process.platform;
  const download = downloads[platform];
  
  if (!download) {
    console.log(`No Opus binaries available for platform: ${platform}`);
    return;
  }

  console.log(`Installing Opus codec for ${platform}...`);

  // Create deps directory
  const depsDir = path.join(__dirname, '..', 'deps');
  if (!fs.existsSync(depsDir)) {
    fs.mkdirSync(depsDir, { recursive: true });
  }

  // Download archive
  const archiveName = path.basename(download.url);
  const archivePath = path.join(depsDir, archiveName);
  
  console.log(`Downloading ${download.url}...`);
  await downloadFile(download.url, archivePath);

  // Extract archive
  console.log(`Extracting ${archiveName}...`);
  const extractDir = path.join(depsDir, 'opus');
  
  if (platform === 'win32') {
    // Use PowerShell to extract ZIP on Windows
    execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractDir}' -Force"`);
  } else {
    // Use tar on macOS/Linux
    execSync(`tar -xzf "${archivePath}" -C "${depsDir}"`);
  }

  // Clean up archive
  fs.unlinkSync(archivePath);

  console.log('Opus codec installation completed');
}

installOpus().catch(console.error);
