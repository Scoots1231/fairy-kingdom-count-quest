# Voice Lines — Recording Manifest

All lines below are **silent placeholders** in the current build. Every one
needs a recording (Pip's voice) dropped at the listed path under `assets/`.
The single source of truth is `src/systems/VoiceManager.js` (the `LINES` map);
keep this file in sync with it.

Format used in code: `play(scene, key, onComplete)` — duration is currently
estimated from the text length, then `onComplete` fires.

## Cinematic (Pip voiceover/in-world)

| Key | File | Line |
|---|---|---|
| `cin_p1` | `assets/audio/sfx/pip/cinematic/cin_p1.ogg` | There is a kingdom... ancient and magical... that has been waiting a very long time. |
| `cin_p2` | `assets/audio/sfx/pip/cinematic/cin_p2.ogg` | A kingdom with a missing princess... lost long ago... and never forgotten. |
| `cin_p3` | `assets/audio/sfx/pip/cinematic/cin_p3.ogg` | I have searched every corner of this kingdom... every forest path... every hidden glen... |
| `cin_p4` | `assets/audio/sfx/pip/cinematic/cin_p4.ogg` | And tonight... I finally found something. |
| `cin_p5` | `assets/audio/sfx/pip/cinematic/cin_p5.ogg` | There she is... (whisper) |
| `cin_p6` | `assets/audio/sfx/pip/cinematic/cin_p6.ogg` | I knew it the moment I saw her... but first... she would need to find her own way home. |
| `cin_p7` | `assets/audio/sfx/pip/cinematic/cin_p7.ogg` | Good evening... I'm so glad I found you. My name is Pip. And I think... you might be exactly who I've been looking for. |
| `cin_p8` | `assets/audio/sfx/pip/cinematic/cin_p8.ogg` | Don't be afraid. I know this forest feels strange... but I promise, you're exactly where you're meant to be. |
| `cin_p9` | `assets/audio/sfx/pip/cinematic/cin_p9.ogg` | Now then... before we begin... let me get a proper look at you! |
| `cin_p10` | `assets/audio/sfx/pip/cinematic/cin_p10.ogg` | Perfect. Now then — what do they call you? |
| `cin_p10_name` | `assets/audio/sfx/pip/cinematic/cin_p10_name.ogg` | **[Name]... what a perfectly royal name.** ⚠️ dynamic name — needs TTS or a neutral pause; name shown as text. |
| `cin_p11` | `assets/audio/sfx/pip/cinematic/cin_p11.ogg` | Now come — I know the way. And I have so much to show you. |

## Customization prompts

| Key | File | Line |
|---|---|---|
| `cust_head` | `assets/audio/sfx/pip/customization/cust_head.ogg` | What shape is your lovely face? |
| `cust_hair` | `assets/audio/sfx/pip/customization/cust_hair.ogg` | And your hair — how do you wear it? |
| `cust_haircolor` | `assets/audio/sfx/pip/customization/cust_haircolor.ogg` | What color is it? Oh how exciting! |
| `cust_eyes` | `assets/audio/sfx/pip/customization/cust_eyes.ogg` | Let me see those eyes... |
| `cust_body` | `assets/audio/sfx/pip/customization/cust_body.ogg` | And how do you carry yourself? |

## Princess Room

| Key | File | Line |
|---|---|---|
| `room_welcome_back` | `assets/audio/sfx/pip/room/room_welcome_back.ogg` | Welcome back! Ready to continue your journey? |
| `room_saved` | `assets/audio/sfx/pip/room/room_saved.ogg` | Your adventure has been saved! |
| `room_shop_locked` | `assets/audio/sfx/pip/room/room_shop_locked.ogg` | That's Benny's cottage — it'll open once you've finished your first adventure! |
| `room_absence` | `assets/audio/sfx/pip/room/room_absence.ogg` | It's been a while — shall I show you again? |

## Closet / wardrobe reactions

| Key | File | Line |
|---|---|---|
| `closet_hat` | `assets/audio/sfx/pip/closet/closet_hat.ogg` | Ooh very stylish! |
| `closet_hat_gold` | `assets/audio/sfx/pip/closet/closet_hat_gold.ogg` | Now THAT is a hat fit for royalty! |
| `closet_crown_first` | `assets/audio/sfx/pip/closet/closet_crown_first.ogg` | There it is... just like I always knew. (tearful) |
| `closet_dress` | `assets/audio/sfx/pip/closet/closet_dress.ogg` | Beautiful! A perfect choice! |
| `closet_dress_gold` | `assets/audio/sfx/pip/closet/closet_dress_gold.ogg` | The whole forest is going to be talking about this one. |
| `closet_shoes` | `assets/audio/sfx/pip/closet/closet_shoes.ogg` | Very practical AND very pretty! |
| `closet_mismatch` | `assets/audio/sfx/pip/closet/closet_mismatch.ogg` | Interesting combination... I like your creativity! |
| `closet_full_set` | `assets/audio/sfx/pip/closet/closet_full_set.ogg` | **[Name]! That's the FULL set!...** ⚠️ dynamic name. |
| `closet_crown_locked` | `assets/audio/sfx/pip/closet/closet_crown_locked.ogg` | That's for someone very special... keep going! |

## Pip non-verbal sounds

| Key | File | Description |
|---|---|---|
| `pip_correct` | `assets/audio/sfx/pip/nonverbal/pip_correct.ogg` | warm ascending "Mmm!" |
| `pip_wrong` | `assets/audio/sfx/pip/nonverbal/pip_wrong.ogg` | gentle curious "Ohh..." |
| `pip_surprised` | `assets/audio/sfx/pip/nonverbal/pip_surprised.ogg` | soft startled wing flutter |
| `pip_delight` | `assets/audio/sfx/pip/nonverbal/pip_delight.ogg` | tiny warm laugh |
| `pip_thinking` | `assets/audio/sfx/pip/nonverbal/pip_thinking.ogg` | quiet thoughtful hum |
| `pip_revelation` | `assets/audio/sfx/pip/nonverbal/pip_revelation.ogg` | long slow intake of breath |

## Music (also placeholder — not yet wired)

Cinematic music arc: mysterious → melancholy → anticipation → wonder →
breathless pause → warm → playful → triumphant. Place tracks under
`assets/audio/music/`.
