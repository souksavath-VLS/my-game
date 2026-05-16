// tts.js — Capacitor TTS bridge / Web Speech API polyfill.
// Routes any speechSynthesis.speak(...) call through the native
// @capacitor-community/text-to-speech plugin when running inside the
// Capacitor app. Also polyfills SpeechSynthesisUtterance / speechSynthesis
// when the WebView lacks them, so game code never throws.
//
// Load this BEFORE any game JS that uses TTS.

(function () {
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

  // Call native TextToSpeech plugin via whichever bridge API is available.
  function nativeCall(method, options) {
    const Cap = window.Capacitor;
    if (!Cap) return null;

    // 1) Plugins.TextToSpeech already registered (full @capacitor/core bundle)
    if (Cap.Plugins && Cap.Plugins.TextToSpeech && typeof Cap.Plugins.TextToSpeech[method] === 'function') {
      return Cap.Plugins.TextToSpeech[method](options);
    }
    // 2) registerPlugin helper (full @capacitor/core bundle)
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
    // 3) nativePromise (thin bridge for external-URL Capacitor apps)
    if (typeof Cap.nativePromise === 'function') {
      try {
        return Cap.nativePromise('TextToSpeech', method, options || {});
      } catch (e) {
        console.warn('[tts.js] nativePromise failed:', e);
      }
    }
    return null;
  }

  // Polyfill SpeechSynthesisUtterance if absent or non-constructible.
  // Some Android WebViews don't expose it; without this, `new
  // SpeechSynthesisUtterance(...)` would throw and the game JS would crash.
  if (typeof window.SpeechSynthesisUtterance !== 'function') {
    window.SpeechSynthesisUtterance = function (text) {
      this.text = (text == null) ? '' : String(text);
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onstart = null; this.onend = null; this.onerror = null;
    };
  }

  // Polyfill speechSynthesis if absent.
  if (!window.speechSynthesis) {
    window.speechSynthesis = {
      speaking: false, pending: false, paused: false,
      speak: function () {},
      cancel: function () {},
      pause: function () {},
      resume: function () {},
      getVoices: function () { return []; }
    };
  }

  const ss = window.speechSynthesis;
  const originalSpeak  = (typeof ss.speak  === 'function') ? ss.speak.bind(ss)  : function () {};
  const originalCancel = (typeof ss.cancel === 'function') ? ss.cancel.bind(ss) : function () {};

  ss.speak = function (utterance) {
    if (isNative()) {
      try {
        const p = nativeCall('speak', {
          text:   (utterance && utterance.text) || '',
          lang:   (utterance && utterance.lang) || 'en-US',
          rate:   (utterance && typeof utterance.rate   === 'number') ? utterance.rate   : 1.0,
          pitch:  (utterance && typeof utterance.pitch  === 'number') ? utterance.pitch  : 1.0,
          volume: (utterance && typeof utterance.volume === 'number') ? utterance.volume : 1.0,
          category: 'ambient'
        });
        if (p && typeof p.then === 'function') {
          p.catch(function (err) {
            console.warn('[tts.js] native speak failed, fallback to web:', err);
            try { originalSpeak(utterance); } catch (e) {}
          });
          return;
        }
      } catch (e) {
        console.warn('[tts.js] native call threw:', e);
      }
    }
    try { originalSpeak(utterance); } catch (e) {}
  };

  ss.cancel = function () {
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
      hasSpeechSynthesis: typeof window.speechSynthesis,
      hasUtterance: typeof window.SpeechSynthesisUtterance,
      hasRegisterPlugin: !!(Cap && typeof Cap.registerPlugin === 'function'),
      hasNativePromise: !!(Cap && typeof Cap.nativePromise === 'function'),
      pluginsKeys: (Cap && Cap.Plugins) ? Object.keys(Cap.Plugins) : []
    };
    console.log('[tts.js debug]', info);
    return info;
  };

  // Manual TTS test — run `_ttsTest('hello', 'en-US')` in DevTools.
  window._ttsTest = function (text, lang) {
    const u = new SpeechSynthesisUtterance(text || 'hello world');
    u.lang = lang || 'en-US';
    ss.speak(u);
  };

  console.log('[tts.js] loaded, platform =', platform(),
    'speechSynthesis=', typeof window.speechSynthesis,
    'Utterance=', typeof window.SpeechSynthesisUtterance);
})();
