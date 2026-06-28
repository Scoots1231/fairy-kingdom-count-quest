// src/systems/VoiceManager.js
//
// Placeholder voice + non-verbal sound system for Phase 2.
//
// All of Pip's lines are SILENT placeholders right now. This module is the
// single registry of every line that needs recording (see VOICE_LINES.md for
// the human-readable manifest). play() estimates a duration from the text,
// logs a [VOICE NEEDED] flag the first time a line is used, then calls the
// completion callback when the (silent) "playback" finishes — so the cinematic
// and Pip.say() callbacks behave exactly as they will with real audio.
//
// When real audio lands in assets/audio/sfx/pip/..., set USE_HOWLER = true and
// drop the files at the `file` paths below; Howler will be used automatically.

const USE_HOWLER = false; // flip to true once real audio files exist

// audioKey -> { text, file, needsRecording }
// `text` is the spoken line (used for duration + on-screen captions).
// `file` is where the recording must be placed.
export const LINES = {
  // --- Cinematic voiceover (Pip narrates) ---
  cin_p1: { text: 'There is a kingdom... ancient and magical... that has been waiting a very long time.', file: 'audio/sfx/pip/cinematic/cin_p1.ogg' },
  cin_p2: { text: 'A kingdom with a missing princess... lost long ago... and never forgotten.', file: 'audio/sfx/pip/cinematic/cin_p2.ogg' },
  cin_p3: { text: 'I have searched every corner of this kingdom... every forest path... every hidden glen...', file: 'audio/sfx/pip/cinematic/cin_p3.ogg' },
  cin_p4: { text: 'And tonight... I finally found something.', file: 'audio/sfx/pip/cinematic/cin_p4.ogg' },
  cin_p5: { text: 'There she is...', file: 'audio/sfx/pip/cinematic/cin_p5.ogg' },
  cin_p6: { text: 'I knew it the moment I saw her... but first... she would need to find her own way home.', file: 'audio/sfx/pip/cinematic/cin_p6.ogg' },
  cin_p7: { text: "Good evening... I'm so glad I found you. My name is Pip. And I think... you might be exactly who I've been looking for.", file: 'audio/sfx/pip/cinematic/cin_p7.ogg' },
  cin_p8: { text: "Don't be afraid. I know this forest feels strange... but I promise, you're exactly where you're meant to be.", file: 'audio/sfx/pip/cinematic/cin_p8.ogg' },
  cin_p9: { text: 'Now then... before we begin... let me get a proper look at you!', file: 'audio/sfx/pip/cinematic/cin_p9.ogg' },
  cin_p10: { text: 'Perfect. Now then — what do they call you?', file: 'audio/sfx/pip/cinematic/cin_p10.ogg' },
  cin_p10_name: { text: '[Name]... what a perfectly royal name.', file: 'audio/sfx/pip/cinematic/cin_p10_name.ogg', dynamicName: true },
  cin_p11: { text: 'Now come — I know the way. And I have so much to show you.', file: 'audio/sfx/pip/cinematic/cin_p11.ogg' },

  // --- Customization prompts ---
  cust_head: { text: 'What shape is your lovely face?', file: 'audio/sfx/pip/customization/cust_head.ogg' },
  cust_hair: { text: 'And your hair — how do you wear it?', file: 'audio/sfx/pip/customization/cust_hair.ogg' },
  cust_haircolor: { text: 'What color is it? Oh how exciting!', file: 'audio/sfx/pip/customization/cust_haircolor.ogg' },
  cust_eyes: { text: 'Let me see those eyes...', file: 'audio/sfx/pip/customization/cust_eyes.ogg' },
  cust_body: { text: 'And how do you carry yourself?', file: 'audio/sfx/pip/customization/cust_body.ogg' },

  // --- Princess Room ---
  room_welcome_back: { text: 'Welcome back! Ready to continue your journey?', file: 'audio/sfx/pip/room/room_welcome_back.ogg' },
  room_saved: { text: 'Your adventure has been saved!', file: 'audio/sfx/pip/room/room_saved.ogg' },
  room_shop_locked: { text: "That's Benny's cottage — it'll open once you've finished your first adventure!", file: 'audio/sfx/pip/room/room_shop_locked.ogg' },
  room_absence: { text: "It's been a while — shall I show you again?", file: 'audio/sfx/pip/room/room_absence.ogg' },

  // --- Closet / wardrobe reactions ---
  closet_hat: { text: 'Ooh very stylish!', file: 'audio/sfx/pip/closet/closet_hat.ogg' },
  closet_hat_gold: { text: 'Now THAT is a hat fit for royalty!', file: 'audio/sfx/pip/closet/closet_hat_gold.ogg' },
  closet_crown_first: { text: 'There it is... just like I always knew.', file: 'audio/sfx/pip/closet/closet_crown_first.ogg' },
  closet_dress: { text: 'Beautiful! A perfect choice!', file: 'audio/sfx/pip/closet/closet_dress.ogg' },
  closet_dress_gold: { text: 'The whole forest is going to be talking about this one.', file: 'audio/sfx/pip/closet/closet_dress_gold.ogg' },
  closet_shoes: { text: 'Very practical AND very pretty!', file: 'audio/sfx/pip/closet/closet_shoes.ogg' },
  closet_mismatch: { text: 'Interesting combination... I like your creativity!', file: 'audio/sfx/pip/closet/closet_mismatch.ogg' },
  closet_full_set: { text: "[Name]! That's the FULL set! You look absolutely magnificent!", file: 'audio/sfx/pip/closet/closet_full_set.ogg', dynamicName: true },
  closet_crown_locked: { text: "That's for someone very special... keep going!", file: 'audio/sfx/pip/closet/closet_crown_locked.ogg' },

  // --- Pip non-verbal sounds ---
  pip_correct: { text: '(warm ascending "Mmm!")', file: 'audio/sfx/pip/nonverbal/pip_correct.ogg' },
  pip_wrong: { text: '(gentle curious "Ohh...")', file: 'audio/sfx/pip/nonverbal/pip_wrong.ogg' },
  pip_surprised: { text: '(soft startled wing flutter)', file: 'audio/sfx/pip/nonverbal/pip_surprised.ogg' },
  pip_delight: { text: '(tiny warm laugh)', file: 'audio/sfx/pip/nonverbal/pip_delight.ogg' },
  pip_thinking: { text: '(quiet thoughtful hum)', file: 'audio/sfx/pip/nonverbal/pip_thinking.ogg' },
  pip_revelation: { text: '(long slow intake of breath)', file: 'audio/sfx/pip/nonverbal/pip_revelation.ogg' }
};

const _flagged = new Set();
const _howls = {};

function estimateDurationMs(key) {
  const line = LINES[key];
  if (!line) return 700;
  if (line.text.startsWith('(')) return 900; // non-verbal sting
  // ~12 characters per second of speech, clamped.
  return Phaser.Math.Clamp(line.text.length * 55, 900, 7000);
}

const VoiceManager = {
  LINES,

  // Resolve the on-screen caption text, substituting the player name.
  caption(key, name) {
    const line = LINES[key];
    if (!line) return '';
    if (line.dynamicName && name) return line.text.replace('[Name]', name);
    return line.text;
  },

  // Play a (placeholder) voice line. Calls onComplete when finished.
  // Returns a small handle with .stop().
  play(scene, key, onComplete) {
    const line = LINES[key];
    if (!line) {
      // eslint-disable-next-line no-console
      console.warn(`[VoiceManager] unknown line "${key}"`);
      if (onComplete) onComplete();
      return { stop() {} };
    }

    if (!_flagged.has(key)) {
      _flagged.add(key);
      // eslint-disable-next-line no-console
      console.info(`[VOICE NEEDED] ${key} -> assets/${line.file}  «${line.text}»`);
    }

    if (USE_HOWLER && window.Howl) {
      let howl = _howls[key];
      if (!howl) {
        howl = new window.Howl({ src: [`assets/${line.file}`], html5: true });
        _howls[key] = howl;
      }
      howl.once('end', () => { if (onComplete) onComplete(); });
      howl.once('loaderror', () => { if (onComplete) onComplete(); });
      howl.play();
      return { stop() { howl.stop(); } };
    }

    // Silent placeholder: wait the estimated duration, then complete.
    const timer = scene.time.delayedCall(estimateDurationMs(key), () => {
      if (onComplete) onComplete();
    });
    return { stop() { if (timer) timer.remove(false); } };
  }
};

export default VoiceManager;
