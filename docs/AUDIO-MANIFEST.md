# Audio manifest — The Record Stands

Source: original procedural synthesis, `src/client/audio.ts` (WebAudio oscillators + filtered noise; no samples, no external libraries). Master mute in case header. Stable event IDs dedupe network replays within a 120 ms window.

| Event ID | Trigger | Voices |
|---|---|---|
| bell.ring | bell observation passes in a run | 5 partials, sine 1318/2637/3951 Hz + echo |
| toy.windup | wind-up toy arms | 4 square ticks ascending |
| fountain.spray | fountain route/valve events | filtered noise bursts |
| cobble.splash | wet-surface events | noise + low sine blip |
| trolley.roll | TestRun accepted | triangle wheels + noise |
| valve.turn | valve/mechanism changes | saw sweep + noise |
| intervention.place | SetIntervention committed | 2-note sine |
| intervention.deny | action rejected | 2-note square low |
| record.verify | run evaluation passes | 2-note confirm |
| record.contradict | run evaluation fails | detuned saw pair |
| case.close | AcceptResult → solved | 4-note resolution |
| ui.tick | undo/UI ack | short sine blip |
