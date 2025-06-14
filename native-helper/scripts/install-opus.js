
// Script to download and install Opus codec libraries
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPUS_VERSION = '1.4';

// Use GitHub releases for reliable downloads
const downloads = {
  win32: {
    url: `https://github.com/xiph/opus/releases/download/v${OPUS_VERSION}/opus-${OPUS_VERSION}.tar.gz`,
    needsCompile: true
  },
  darwin: {
    url: `https://github.com/xiph/opus/releases/download/v${OPUS_VERSION}/opus-${OPUS_VERSION}.tar.gz`,
    needsCompile: true
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
  
  console.log(`Installing Opus codec for ${platform}...`);

  // Create deps directory structure
  const depsDir = path.join(__dirname, '..', 'deps', 'opus');
  const includeDir = path.join(depsDir, 'include');
  const libDir = path.join(depsDir, 'lib');
  
  [depsDir, includeDir, libDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  try {
    // Try to use package manager first (faster and more reliable)
    if (platform === 'win32') {
      console.log('Attempting to install via vcpkg...');
      try {
        execSync('vcpkg install opus:x64-windows', { stdio: 'inherit' });
        console.log('Successfully installed Opus via vcpkg');
        return;
      } catch (e) {
        console.log('vcpkg not available, using manual installation...');
      }
    } else if (platform === 'darwin') {
      console.log('Attempting to install via Homebrew...');
      try {
        execSync('brew install opus', { stdio: 'inherit' });
        console.log('Successfully installed Opus via Homebrew');
        return;
      } catch (e) {
        console.log('Homebrew not available, using manual installation...');
      }
    }

    // Fallback: Manual installation
    await manualInstallation(platform, depsDir);
    
  } catch (error) {
    console.error('Failed to install Opus:', error.message);
    // Create dummy files to prevent build errors
    createDummyFiles(includeDir, libDir, platform);
  }
}

async function manualInstallation(platform, depsDir) {
  const download = downloads[platform];
  if (!download) {
    throw new Error(`No installation method available for platform: ${platform}`);
  }

  // Download source archive
  const archiveName = path.basename(download.url);
  const archivePath = path.join(path.dirname(depsDir), archiveName);
  
  console.log(`Downloading ${download.url}...`);
  await downloadFile(download.url, archivePath);

  // Extract source
  console.log(`Extracting ${archiveName}...`);
  const extractDir = path.join(path.dirname(depsDir), 'opus-source');
  
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  
  execSync(`tar -xzf "${archivePath}" -C "${path.dirname(depsDir)}"`);
  
  // Find the extracted directory (it includes version number)
  const extractedDirs = fs.readdirSync(path.dirname(depsDir))
    .filter(name => name.startsWith('opus-') && name !== 'opus')
    .map(name => path.join(path.dirname(depsDir), name));
  
  if (extractedDirs.length === 0) {
    throw new Error('Failed to find extracted Opus source directory');
  }
  
  const sourceDir = extractedDirs[0];
  
  // Build Opus
  console.log('Building Opus from source...');
  process.chdir(sourceDir);
  
  try {
    if (platform === 'win32') {
      // Try CMake build for Windows
      execSync('cmake -B build -DCMAKE_BUILD_TYPE=Release', { stdio: 'inherit' });
      execSync('cmake --build build --config Release', { stdio: 'inherit' });
      
      // Copy built files
      const buildDir = path.join(sourceDir, 'build', 'Release');
      if (fs.existsSync(path.join(buildDir, 'opus.lib'))) {
        fs.copyFileSync(path.join(buildDir, 'opus.lib'), path.join(depsDir, 'lib', 'opus.lib'));
      }
    } else {
      // Use autotools for macOS/Linux
      execSync('./autogen.sh', { stdio: 'inherit' });
      execSync('./configure --prefix=' + depsDir, { stdio: 'inherit' });
      execSync('make install', { stdio: 'inherit' });
    }
    
    // Copy headers
    const headerSrc = path.join(sourceDir, 'include');
    if (fs.existsSync(headerSrc)) {
      execSync(`cp -r "${headerSrc}"/* "${path.join(depsDir, 'include')}"`, { stdio: 'inherit' });
    }
    
  } catch (buildError) {
    console.error('Build failed:', buildError.message);
    throw new Error('Failed to build Opus from source');
  } finally {
    // Clean up
    process.chdir(path.join(__dirname, '..'));
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }
    if (fs.existsSync(sourceDir)) {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  }
  
  console.log('Opus codec installation completed');
}

function createDummyFiles(includeDir, libDir, platform) {
  console.log('Creating dummy Opus files to prevent build errors...');
  
  // Create dummy header
  const headerContent = `
#ifndef OPUS_H
#define OPUS_H

// Dummy Opus header - replace with real implementation
typedef struct OpusEncoder OpusEncoder;
typedef struct OpusDecoder OpusDecoder;

#define OPUS_OK 0
#define OPUS_APPLICATION_VOIP 2048

// Dummy function declarations
OpusEncoder *opus_encoder_create(int Fs, int channels, int application, int *error);
int opus_encode(OpusEncoder *st, const short *pcm, int frame_size, unsigned char *data, int max_data_bytes);
void opus_encoder_destroy(OpusEncoder *st);

#endif
`;
  
  fs.writeFileSync(path.join(includeDir, 'opus.h'), headerContent);
  
  // Create dummy library file
  if (platform === 'win32') {
    // Create empty .lib file for Windows
    fs.writeFileSync(path.join(libDir, 'opus.lib'), '');
  } else {
    // Create empty .a file for macOS/Linux
    fs.writeFileSync(path.join(libDir, 'libopus.a'), '');
  }
  
  console.log('Dummy files created. Note: Audio encoding will not work until real Opus is installed.');
}

installOpus().catch(console.error);
