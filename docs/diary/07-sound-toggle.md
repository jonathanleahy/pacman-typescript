# Build Diary - Entry 07: Sound Toggle UI

**Date**: December 2024
**Phase**: Polish
**Focus**: Mute button, M key shortcut, localStorage persistence

---

## The Feature

Players need to be able to mute the game easily:
1. Visual mute button in the corner
2. M key shortcut (muscle memory from other games)
3. Preference saved between sessions

Simple on paper, but touches multiple systems.

## TDD Approach

Started with 18 tests defining expected behavior:

```typescript
describe('Sound Toggle', () => {
  it('should start unmuted by default', () => {...});
  it('should toggle from unmuted to muted', () => {...});
  it('should save mute state to localStorage when toggled', () => {...});
  it('should load mute state from localStorage on init', () => {...});
});

describe('M Key Shortcut', () => {
  it('should toggle mute when M key is pressed', () => {...});
  it('should not toggle on other keys', () => {...});
});
```

All 18 tests failed initially (red phase), then I implemented the functionality to make them pass (green phase).

## Implementation

### Sound.ts Additions

```typescript
export class Sound {
  static readonly STORAGE_KEY = 'pacman-sound-muted';
  private muteShortcutHandler: ((e: KeyboardEvent) => void) | null = null;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.muted) {
      this.stopSiren();
      this.stopFrightSound();
    }
  }

  saveMutePreference(): void {
    try {
      localStorage.setItem(Sound.STORAGE_KEY, String(this.muted));
    } catch {
      // localStorage not available (e.g., private browsing)
    }
  }

  loadMutePreference(): void {
    try {
      const saved = localStorage.getItem(Sound.STORAGE_KEY);
      if (saved === 'true') {
        this.muted = true;
      }
    } catch {
      // localStorage not available
    }
  }

  enableMuteShortcut(): void {
    this.muteShortcutHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        this.toggleMute();
      }
    };
    document.addEventListener('keydown', this.muteShortcutHandler);
  }
}
```

Key decisions:
- Static `STORAGE_KEY` constant for consistency
- Graceful localStorage fallback (try/catch for private browsing)
- Handler stored for cleanup (can be removed later)
- Case-insensitive M key check

### UI Button

```html
<button id="mute-btn" class="mute-btn" aria-label="Toggle sound">
  <span class="mute-icon">🔊</span>
</button>
```

Using emoji for the icon:
- `🔊` when unmuted (speaker with sound waves)
- `🔇` when muted (speaker with X)

Why emoji? No external dependencies, works everywhere, instantly recognizable.

### CSS Styling

```css
.mute-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--electric-blue);
  border-radius: 8px;
  z-index: 100;
}

.mute-btn.muted {
  border-color: #666;
}
```

Positioned in top-right corner, out of the way but accessible. Uses the game's neon theme colors.

### Game.ts Integration

```typescript
constructor(config: GameConfig) {
  // ... other init ...

  // Load sound mute preference and enable M key shortcut
  this.sound.loadMutePreference();
  this.sound.enableMuteShortcut();
  this.setupMuteButton();
}

private setupMuteButton(): void {
  const muteBtn = document.getElementById('mute-btn');
  const muteIcon = muteBtn?.querySelector('.mute-icon');

  // Set initial state
  this.updateMuteButtonUI(muteBtn, muteIcon);

  // Handle click
  muteBtn.addEventListener('click', () => {
    this.sound.toggleMute();
    this.updateMuteButtonUI(muteBtn, muteIcon);
  });

  // Sync UI when M key is pressed
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') {
      setTimeout(() => this.updateMuteButtonUI(muteBtn, muteIcon), 10);
    }
  });
}
```

The tricky part: syncing UI when M is pressed. The Sound class handles the toggle, but Game.ts owns the UI. Solution: listen for M key in both places, with a small delay to let the sound state update first.

## Challenges

### 1. Two Event Listeners for M Key

Both Sound.ts and Game.ts listen for M key presses:
- Sound.ts: toggles the actual mute state
- Game.ts: updates the button UI

Could have used a callback/observer pattern, but the setTimeout approach is simpler and works reliably.

### 2. localStorage Availability

Some browsers (private mode, old browsers) don't support localStorage. Wrapped all access in try/catch to fail gracefully.

### 3. Initial State Timing

The mute button needs to show the correct state on page load, before any user interaction. Called `loadMutePreference()` in constructor, not on first click.

## Test Results

```
Tests: 297 passed (18 new)
- toggleMute state changes
- setMuted direct control
- localStorage persistence (save/load)
- M key shortcut registration
- M key toggle behavior
- Case insensitivity (m and M both work)
- Other keys don't trigger
- Shortcut enable/disable
```

## Files Changed

| File | Changes |
|------|---------|
| `src/systems/Sound.ts` | +60 lines: setMuted, save/load preference, M key shortcut |
| `src/Game.ts` | +45 lines: setupMuteButton, updateMuteButtonUI |
| `src/styles.css` | +40 lines: mute button styling |
| `index.html` | +4 lines: mute button element |
| `tests/systems/SoundToggle.test.ts` | New file: 18 tests |

---

## Results

- ✅ Mute button visible in top-right corner
- ✅ Click toggles sound on/off
- ✅ M key shortcut works
- ✅ Preference persists across sessions
- ✅ Visual feedback (icon changes, border color)
- ✅ 18 new tests, all passing

---

**Key Takeaway**: Even "simple" features benefit from TDD. Writing tests first forced me to think about edge cases (localStorage unavailable, key case sensitivity) before writing any implementation code.

*"Test first, implement second, debug rarely."*
