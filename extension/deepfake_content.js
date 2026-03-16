/**
 * PhishGuard — Deepfake Detection Content Script
 * Detects audio/video elements and provides right-click context menu for analysis
 */

/**
 * Extract media source from context menu target element
 */
function getMediaSourceFromElement(element) {
  const tagName = element.tagName.toLowerCase();

  switch(tagName) {
    case 'video': {
      const videoSrc = element.src || element.querySelector('source')?.src;
      if (videoSrc) {
        return {
          url: videoSrc,
          type: 'video',
          elementType: 'video'
        };
      }
      break;
    }

    case 'audio': {
      const audioSrc = element.src || element.querySelector('source')?.src;
      if (audioSrc) {
        return {
          url: audioSrc,
          type: 'audio',
          elementType: 'audio'
        };
      }
      break;
    }

    case 'a': {
      const href = element.href;
      const ext = getFileExtension(href);
      const mediaType = inferMediaType(ext);
      if (mediaType !== 'unknown') {
        return {
          url: href,
          type: mediaType,
          elementType: 'link'
        };
      }
      break;
    }

    case 'img': {
      const src = element.src;
      const ext = getFileExtension(src);
      const mediaType = inferMediaType(ext);
      if (mediaType !== 'unknown') {
        return {
          url: src,
          type: mediaType,
          elementType: 'image'
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Extract file extension from URL
 */
function getFileExtension(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    return ext || '';
  } catch {
    return '';
  }
}

/**
 * Infer media type from file extension
 */
function inferMediaType(extension) {
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
  const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

  if (audioExts.includes(extension)) return 'audio';
  if (videoExts.includes(extension)) return 'video';
  return 'unknown';
}

/**
 * Detect if URL is from a streaming platform
 */
function detectStreamingPlatform(url) {
  if (!url) return null;
  const urlLower = url.toLowerCase();

  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('instagram.com')) return 'instagram';

  return null;
}

/**
 * Handle context menu item click
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CONTEXT_ELEMENT') {
    // Find the element that triggered the context menu
    // This is a limitation of content scripts - we can't directly access the element
    // Instead, we'll send back the URL from the message data if available

    const mediaSource = getMediaSourceFromElement(document.elementFromPoint(message.x, message.y));

    if (mediaSource) {
      const platform = detectStreamingPlatform(mediaSource.url);
      sendResponse({
        mediaSource,
        platform
      });
    } else {
      sendResponse(null);
    }

    return true;
  }
});

/**
 * Listen for context menu registration request from background
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REGISTER_DEEPFAKE_MENUS') {
    console.log('[PhishGuard] Context menus registered for deepfake detection');
    sendResponse({ ok: true });
  }
});

console.log('[PhishGuard] Deepfake detection content script loaded');
