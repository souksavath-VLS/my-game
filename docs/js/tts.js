// tts.js — Capacitor TTS bridge.
// Patches window.speechSynthesis.speak/cancel so existing code keeps working
// in browser, but routes through @capacitor-community/text-to-speech when
// running inside the native Android/iOS app (where browser TTS often has no
// installed voices and silently fails).
//
// Load this script BEFORE any game JS that uses TTS.

(function () {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  function getCapacitorTTS() {
    const Cap = window.Capacitor;
    if (!Cap || typeof Cap.isNativePlatform !== 'function') return null;
    if (!Cap.isNativePlatform()) return null;
    const TTS = Cap.Plugins && Cap.Plugins.TextToSpeech;
    return TTS || null;
  }

  const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  const originalCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);

  window.speechSynthesis.speak = function (utterance) {
    const TTS = getCapacitorTTS();
    if (!TTS) return originalSpeak(utterance);

    try {
      TTS.speak({
        text: utterance.text || '',
        lang: utterance.lang || 'en-US',
        rate: typeof utterance.rate === 'number' ? utterance.rate : 1.0,
        pitch: typeof utterance.pitch === 'number' ? utterance.pitch : 1.0,
        volume: typeof utterance.volume === 'number' ? utterance.volume : 1.0,
        category: 'ambient'
      }).catch(function (err) {
        // Fall back to browser TTS if the native plugin can't handle this
        // particular language or text.
        console.warn('Capacitor TTS failed, falling back:', err);
        try { originalSpeak(utterance); } catch (e) {}
      });
    } catch (e) {
      console.warn('Capacitor TTS threw, falling back:', e);
      try { originalSpeak(utterance); } catch (err) {}
    }
  };

  window.speechSynthesis.cancel = function () {
    const TTS = getCapacitorTTS();
    if (TTS) {
      try { TTS.stop(); } catch (e) {}
    }
    try { originalCancel(); } catch (e) {}
  };
})();
