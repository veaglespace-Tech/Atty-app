import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image picked from expo-image-picker
 * @param {Object} asset - The asset object returned from ImagePicker (contains uri, width, height)
 * @param {number} maxDim - Maximum dimension for the image
 * @returns {Promise<string>} Base64 data URL of the compressed image
 */
export const compressPickedImage = async (asset, maxDim = 512) => {
  let { width, height, uri } = asset;
  
  let resizeParams = {};
  if (width > height && width > maxDim) {
    resizeParams = { width: maxDim };
  } else if (height > maxDim) {
    resizeParams = { height: maxDim };
  }
  
  const actions = Object.keys(resizeParams).length > 0 ? [{ resize: resizeParams }] : [];
  
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  
  if (!manipResult.base64) {
    throw new Error("Failed to generate base64 for image.");
  }
  
  return `data:image/jpeg;base64,${manipResult.base64}`;
};

/**
 * Compresses an image file from a URI (useful for DocumentPicker where dimensions are unknown)
 */
export const compressDocumentImage = async (uri) => {
  const { width, height } = await new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
  
  let resizeParams = {};
  const maxDim = 1200; // max dimension for documents to remain readable
  if (width > height && width > maxDim) {
    resizeParams = { width: maxDim };
  } else if (height > maxDim) {
    resizeParams = { height: maxDim };
  }
  
  const actions = Object.keys(resizeParams).length > 0 ? [{ resize: resizeParams }] : [];

  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  
  if (!manipResult.base64) {
    throw new Error("Failed to generate base64 for document image.");
  }
  
  return `data:image/jpeg;base64,${manipResult.base64}`;
};
