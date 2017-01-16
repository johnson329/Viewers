import { OHIF } from 'meteor/ohif:core';
import { getImageId } from './getImageId';
import { addMetaData } from './metaDataProvider';
import { OHIFError } from './classes/OHIFError';

let stackMap = {};
let configuration = {};
const stackUpdatedCallbacks = [];

/**
 * Loop through the current series and add metadata to the
 * Cornerstone meta data provider. This will be used to fill information
 * into the viewport overlays, and to calculate reference lines and orientation markers
 * @param  {Object} stackMap              stackMap object
 * @param  {Object} study                 Study object
 * @param  {Object} displaySet            The set of images to make the stack from
 * @return {Array}                        Array with image IDs
 */
function createAndAddStack(stackMap, study, displaySet) {
  const numImages = displaySet.images.length;
  const imageIds = [];
  let imageId;

  displaySet.images.forEach((image, imageIndex) => {
      const metaData = {
          instance: image,
          series: displaySet, // TODO: Check this
          study: study,
          numImages: numImages,
          imageIndex: imageIndex + 1
      };

      const numFrames = image.numFrames;
      if (numFrames > 1) {
          OHIF.log.info('Multiframe image detected');
          for (let i = 0; i < numFrames; i++) {
              metaData.frame = i;
              imageId = getImageId(image, i);
              imageIds.push(imageId);
              addMetaData(imageId, metaData);
          }
      } 
      else {
          imageId = getImageId(image);
          imageIds.push(imageId);
          addMetaData(imageId, metaData);
      }
  });

  return imageIds;
}

configuration = {
  createAndAddStack: createAndAddStack
};

/**
 * This object contains all the functions needed for interacting with the stack manager.
 * Generally, findStack is the only function used. If you want to know when new stacks
 * come in, you can register a callback with addStackUpdatedCallback.
 * clearStacks and makeAndAddStack should not used outside of loadStudy and removeStudies.
 */
const StackManager = {
  /**
   * Removes all current stacks
   */
  clearStacks() {
    stackMap = {};
  },
  /**
   * Create a stack from an image set, as well as add in the metadata on a per image bases.
   * @param study The study who's metadata will be added
   * @param displaySet The set of images to make the stack from
   * @return {Array} Array with image IDs
   */
  makeAndAddStack(study, displaySet) {
    return configuration.createAndAddStack(stackMap, study, displaySet, stackUpdatedCallbacks);
  },
  /**
   * Find a stack from the currently created stacks.
   * @param displaySetInstanceUid The UID of the stack to find.
   * @returns {*} undefined if not found, otherwise the stack object is returned.
   */
  findStack(displaySetInstanceUid) {
    return stackMap[displaySetInstanceUid];
  },
  /**
   * Gets the underlying map of displaySetInstanceUid to stack object.
   * WARNING: Do not change this object. It directly affects the manager.
   * @returns {{}} map of displaySetInstanceUid -> stack.
   */
  getAllStacks() {
    return stackMap;
  },
  /**
   * Adds in a callback to be called on a stack being added / updated.
   * @param callback must accept at minimum one argument,
   * which is the stack that was added / updated.
   */
  addStackUpdatedCallback(callback) {
    if (typeof callback !== 'function') {
      throw new OHIFError('callback must be provided as a function');
    }
    stackUpdatedCallbacks.push(callback);
  },
  /**
   * Return configuration
   */
  getConfiguration() {
    return configuration;
  },
  /**
   * Set configuration, in order to provide compatibility
   * with other systems by overriding this functions
   * @param {Object} config object with functions to be overrided
   *
   * For now, only makeAndAddStack can be overrided
   */
  setConfiguration(config) {
    configuration = config;
  }
};

export { StackManager };
