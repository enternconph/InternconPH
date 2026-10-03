import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export const isNative = !!(window.Capacitor?.isNativePlatform?.());
export const isElectron = navigator.userAgent.toLowerCase().includes('electron');

export const getLocation = async () => {
  if (isNative) {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      await Geolocation.requestPermissions();
    }
    const position = await Geolocation.getCurrentPosition();
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  } else {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported."));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          reject,
          { enableHighAccuracy: true }
        );
      }
    });
  }
};

export const scanQR = async () => {
  if (isNative) {
    const granted = await requestPlatformCamera();
    if (!granted) throw new Error("Camera permission denied");
    
    // Using Capacitor MLKit Barcode Scanning
    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0) {
      return barcodes[0].rawValue;
    }
    return null;
  }
  // Not used directly on web/electron; they use React component
  return null;
};

export const requestPlatformCamera = async () => {
  if (isNative) {
    const perm = await Camera.checkPermissions();
    if (perm.camera !== 'granted') {
      const res = await Camera.requestPermissions();
      return res.camera === 'granted';
    }
    return true;
  }
  return true;
};

// Storage Wrappers
export const setItem = async (key, value) => {
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
};

export const getItem = async (key) => {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
};

export const removeItem = async (key) => {
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
};
