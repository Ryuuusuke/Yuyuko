const asstosrt = require("ass-to-srt");

/**
 * Convert ASS subtitle to SRT format from URL
 * @param {string} url - URL to ASS subtitle file
 * @returns {Promise<string|null>} - SRT subtitle content or null if failed
 */
async function convertAssToSrtFromUrl(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const readable = response.body;
    const utf8decoder = new TextDecoder('utf-8');

    let arrayString = "";
    for await (const chunk of readable) {
      arrayString += utf8decoder.decode(chunk, { stream: true });
    }
    arrayString += utf8decoder.decode(); // Flush any remaining bytes
    
    // Convert ASS to SRT
    const srtOutput = asstosrt(arrayString);
    return srtOutput;
  } catch (error) {
    console.error("❌ Error converting ASS to SRT:", error.message);
    return null;
  }
}

/**
 * Convert ASS subtitle to SRT format from text content
 * @param {string} assContent - ASS subtitle content
 * @returns {string|null} - SRT subtitle content or null if failed
 */
function convertAssToSrtFromText(assContent) {
  try {
    if (!assContent || typeof assContent !== 'string') {
      throw new Error('Invalid ASS content provided');
    }
    
    const srtOutput = asstosrt(assContent);
    return srtOutput;
  } catch (error) {
    console.error("❌ Error converting ASS text to SRT:", error.message);
    return null;
  }
}

/**
 * Check if a filename is an ASS subtitle file
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if it's an ASS file
 */
function isAssFile(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  return filename.toLowerCase().endsWith('.ass');
}

/**
 * Check if a filename is a subtitle file (ASS, SRT, VTT, etc.)
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if it's a subtitle file
 */
function isSubtitleFile(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  const subtitleExtensions = ['.ass', '.srt', '.vtt', '.sub', '.sbv', '.ssa'];
  const lowerFilename = filename.toLowerCase();
  
  return subtitleExtensions.some(ext => lowerFilename.endsWith(ext));
}

/**
 * Get subtitle file extension
 * @param {string} filename - Filename
 * @returns {string|null} - File extension or null if not a subtitle
 */
function getSubtitleExtension(filename) {
  if (!isSubtitleFile(filename)) {
    return null;
  }
  
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : null;
}

/**
 * Convert filename from ASS to SRT
 * @param {string} filename - Original filename
 * @returns {string} - New filename with .srt extension
 */
function convertFilenameToSrt(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'subtitle.srt';
  }
  
  if (filename.toLowerCase().endsWith('.ass')) {
    return filename.replace(/\.ass$/i, '.srt');
  }
  
  return filename;
}

module.exports = {
  convertAssToSrtFromUrl,
  convertAssToSrtFromText,
  isAssFile,
  isSubtitleFile,
  getSubtitleExtension,
  convertFilenameToSrt
};