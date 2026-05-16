// tts.js — Capacitor TTS bridge.
// Routes window.speechSynthesis.speak/cancel through the native
// @capacitor-community/text-to-speech plugin when running inside the
// Capacitor app. Falls back to the Web Speech API in browsers.
//
// External-URL Capacitor apps get a "thin" bridge that lacks
// `registerPlugin`, so we use `Capacitor.nativePromise` directly as the
// final fallback to invoke the native plugin.
//
// Load this BEFORE any game JS that uses TTS.

(function () {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  function platform() {
    const Cap = window.Capacitor;
    if (!Cap) return 'web';
    if (typeof Cap.getPlatform === 'function') return Cap.getPlatform();
    if (typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform()) return 'android';
    if (typeof Cap.platform === 'string') return Cap.platform;
    return 'web';
  }

  function isNative() {
    const p = platform();
    return p === 'android' || p === 'ios';
  }

  // Call native plugin method using whichever bridge API is available.
  function nativeCall(method, options) {
    const Cap = window.Capacitor;
    if (!Cap) return null;

    // 1) Already-registered plugin (full @capacitor/core in a bundled web build)
    if (Cap.Plugins && Cap.Plugins.TextToSpeech && typeof Cap.Plugins.TextToSpeech[method] === 'function') {
      return Cap.Plugins.TextToSpeech[method](options);
    }

    // 2) registerPlugin helper (full @capacitor/core)
    if (typeof Cap.registerPlugin === 'function') {
      try {
        const TTS = Cap.registerPlugin('TextToSpeech');
        Cap.Plugins = Cap.Plugins || {};
        Cap.Plugins.TextToSpeech = TTS;
        if (TTS && typeof TTS[method] === 'function') return TTS[method](options);
      } catch (e) {
        console.warn('[tts.js] registerPlugin failed:', e);
      }
    }

    // 3) nativePromise (thin bridge injected for external-URL apps)
    if (typeof Cap.nativePromise === 'function') {
      try {
        return Cap.nativePromise('TextToSpeech', method, options || {});
      } catch (e) {
        console.warn('[tts.js] nativePromise failed:', e);
      }
    }
    return null;
  }

  const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  const originalCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);

  window.speechSynthesis.speak = function (utterance) {
    if (!isNative()) return originalSpeak(utterance);

    const promise = nativeCall('speak', {
      text: utterance.text || '',
      lang: utterance.lang || 'en-US',
      rate: typeof utterance.rate === 'number' ? utterance.rate : 1.0,
      pitch: typeof utterance.pitch === 'number' ? utterance.pitch : 1.0,
      volume: typeof utterance.volume === 'number' ? utterance.volume : 1.0,
      category: 'ambient'
    });

    if (promise && typeof promise.then === 'function') {
      promise.catch(function (err) {
        console.warn('[tts.js] native speak failed, fallback to web:', err);
        try { originalSpeak(utterance); } catch (e) {}
      });
      return;
    }
    // No bridge worked — fall back to the (likely silent) web TTS.
    originalSpeak(utterance);
  };

  window.speechSynthesis.cancel = function () {
    if (isNative()) {
      try { nativeCall('stop', {}); } catch (e) {}
    }
    try { originalCancel(); } catch (e) {}
  };

  // Debug helper — run `_ttsDebug()` in DevTools console.
  window._ttsDebug = function () {
    const Cap = window.Capacitor;
    const info = {
      capacitor: typeof Cap,
      platform: platform(),
      isNative: isNative(),
      hasRegisterPlugin: !!(Cap && typeof Cap.registerPlugin === 'function'),
      hasNativePromise: !!(Cap && typeof Cap.nativePromise === 'function'),
      hasGetPlatform: !!(Cap && typeof Cap.getPlatform === 'function'),
      pluginsKeys: (Cap && Cap.Plugins) ? Object.keys(Cap.Plugins) : [],
      capacitorKeys: Cap ? Object.keys(Cap) : []
    };
    console.log('[tts.js debug]', info);
    return info;
  };

  // Manual TTS test — run `_ttsTest('hello world', 'en-US')` in DevTools.
  window._ttsTest = function (text, lang) {
    const p = nativeCall('speak', {
      text: text || 'hello world',
      lang: lang || 'en-US',
      rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient'
    });
    if (!p) {
      console.log('[tts.js] no native bridge available');
      return null;
    }
    return p.then(function (r) { console.log('[tts.js] OK', r); return r; })
            .catch(function (e) { console.log('[tts.js] ERR', e); return e; });
  };

  console.log('[tts.js] loaded, platform =', platform());
})();
