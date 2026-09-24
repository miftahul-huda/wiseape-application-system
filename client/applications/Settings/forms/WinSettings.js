const WiseWindow = require('../../../system/WiseWindow');
const WiseLabel = require('../../../system/controls/WiseLabel');
const WiseComboBox = require('../../../system/controls/WiseComboBox');
const WiseFileUpload = require('../../../system/controls/WiseFileUpload');
const ApiAuthRepository = require('../../../system/ApiAuthRepository');

const authRepository = new ApiAuthRepository();

class WinSettings extends WiseWindow {
  constructor(options = {}) {
    super(options);
    this.title = 'Settings';
    this.appTitle = options.appTitle || 'Settings';
    this.appIcon = options.appIcon || '⚙';
    this.width = '420';
    this.height = '360';
    this.themes = options.themes || [];
  }

  onWindowInit() {
    this.controls = [];
    this.addControl(new WiseLabel('Desktop Theme', { id: 'lblThemeHeading', style: { fontSize: 22, color: '#111827' } }));
    this.addControl(new WiseComboBox(
      this.themes.map((theme) => ({ value: theme.id, label: theme.name })),
      {
        id: 'cmbTheme',
        value: this.system ? this.system.activeThemeId : undefined,
        onChange: this.onThemeChange.bind(this),
      }
    ));
    this.addControl(new WiseLabel('Background Image', { id: 'lblBackgroundHeading', style: { fontSize: 22, color: '#111827', marginTop: '12px' } }));
    this.addControl(new WiseFileUpload('Choose Image...', {
      id: 'uploadBackground',
      onChange: this.onBackgroundChange.bind(this),
    }));
    return this;
  }

  onThemeChange() {
    if (this.system) {
      this.system.setActiveTheme(this.cmbTheme.value);
      this.persistPreferences({ themeId: this.cmbTheme.value });
    }
  }

  onBackgroundChange() {
    if (this.system) {
      this.system.setBackgroundImage(this.uploadBackground.value);
      this.persistPreferences({ backgroundImage: this.uploadBackground.value });
    }
  }

  persistPreferences(prefs) {
    const session = this.system && this.system.currentSession;
    if (!session || !session.token) return;

    authRepository.updatePreferences(session.token, prefs)
      .catch((error) => console.warn('[WAS] Failed to save preferences:', error.message));
  }

  show(param = null) {
    this.visible = true;
    this.params = param;
    return super.show(param);
  }
}

module.exports = WinSettings;
