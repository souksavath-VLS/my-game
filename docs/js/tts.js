// tts.js — Capacitor TTS bridge.
// Routes window.speechSynthesis.speak/cancel through the native
// @capacitor-community/text-to-speech plugin when running inside the
// Capacitor Android/iOS app (where browser TTS often has no voices and
// silently fails). Falls back to the regular Web Speech API in browsers.
//
// Load this BEFORE any game JS that uses TTS.

(function () {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  let TTS = null;
  let TTSReady = false;

  function platform() {
    const Cap = window.Capacitor;
    if (!Cap) return 'web';
    if (typeof Cap.getPlatform === 'function') return Cap.getPlatform();
    if (typeof Cap.platform === 'string') return Cap.platform;
    if (typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform()) return 'android';
    return 'web';
  }

  function tryAcquireTTS() {
    if (TTSReady) return TTS;
    const Cap = window.Capacitor;
    if (!Cap) return null;
    const p = platform();
    if (p !== 'android' && p !== 'ios') return null;

    // Already exposed by an explicit plugin import?
    if (Cap.Plugins && Cap.Plugins.TextToSpeech) {
      TTS = Cap.Plugins.TextToSpeech;
      TTSReady = true;
      return TTS;
    }
    // Manually register a proxy so calls route to the native plugin even when
    // the plugin's JS module isn't bundled (we load from GitHub Pages).
    if (typeof Cap.registerPlugin === 'function') {
      try {
        TTS = Cap.registerPlugin('TextToSpeech');
        if (TTS) {
          Cap.Plugins = Cap.Plugins || {};
          Cap.Plugins.TextToSpeech = TTS;
          TTSReady = true;
          return TTS;
        }
      } catch (e) {
        console.warn('[tts.js] registerPlugin failed:', e);
      }
    }
    return null;
  }

  // Capacitor's bridge may not be ready immediately; try at load and again
  // shortly after to handle the initial injection race on Android.
  tryAcquireTTS();
  document.addEventListener('DOMContentLoaded', tryAcquireTTS);
  setTimeout(tryAcquireTTS, 500);

  const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  const originalCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);

  window.speechSynthesis.speak = function (utterance) {
    const native = tryAcquireTTS();
    if (!native) return originalSpeak(utterance);

    try {
      const p = native.speak({
        text: utterance.text || '',
        lang: utterance.lang || 'en-US',
        rate: typeof utterance.rate === 'number' ? utterance.rate : 1.0,
        pitch: typeof utterance.pitch === 'number' ? utterance.pitch : 1.0,
        volume: typeof utterance.volume === 'number' ? utterance.volume : 1.0,
        category: 'ambient'
      });
      if (p && typeof p.catch === 'function') {
        p.catch(function (err) {
          console.warn('[tts.js] native speak failed, fallback to web:', err);
          try { originalSpeak(utterance); } catch (e) {}
        });
      }
    } catch (e) {
      console.warn('[tts.js] native speak threw, fallback to web:', e);
      try { originalSpeak(utterance); } catch (err) {}
    }
  };

  window.speechSynthesis.cancel = function () {
    const native = tryAcquireTTS();
    if (native && typeof native.stop === 'function') {
      try { native.stop(); } catch (e) {}
    }
    try { originalCancel(); } catch (e) {}
  };

  // Debug helper — call in Chrome DevTools (remote debug the phone):
  //   _ttsDebug()
  window._ttsDebug = function () {
    const Cap = window.Capacitor;
    const info = {
      capacitor: typeof Cap,
      platform: platform(),
      hasRegisterPlugin: !!(Cap && typeof Cap.registerPlugin === 'function'),
      hasIsNativePlatform: !!(Cap && typeof Cap.isNativePlatform === 'function'),
      pluginsKeys: (Cap && Cap.Plugins) ? Object.keys(Cap.Plugins) : [],
      ttsAcquired: !!TTS,
      ttsReady: TTSReady
    };
    console.log('[tts.js debug]', info);
    return info;
  };

  console.log('[tts.js] loaded, platform =', platform(),
    'tts =', TTS ? 'ready' : 'not-yet');
})();
