const WiseWindow = require('../../../system/WiseWindow');
const WiseLabel = require('../../../system/controls/WiseLabel');
const WiseRadioGroup = require('../../../system/controls/WiseRadioGroup');
const WiseCheckboxGroup = require('../../../system/controls/WiseCheckboxGroup');
const WiseDate = require('../../../system/controls/WiseDate');
const WiseDateRange = require('../../../system/controls/WiseDateRange');
const WiseTextArea = require('../../../system/controls/WiseTextArea');
const WiseHtmlEditor = require('../../../system/controls/WiseHtmlEditor');
const WiseFileUpload = require('../../../system/controls/WiseFileUpload');
const WiseButton = require('../../../system/controls/WiseButton');

const HEADING_STYLE = { fontSize: 15, fontWeight: 700, marginTop: '4px' };

class WinControls extends WiseWindow {
  constructor(options = {}) {
    super(options);
    this.title = 'Controls Gallery';
    this.appTitle = options.appTitle || 'Controls';
    this.appIcon = options.appIcon || '🎛';
    this.width = '800';
    this.height = '680';
  }

  onWindowInit() {
    this.controls = [];

    this.addControl(new WiseLabel('Favorite Color', { id: 'lblColor', style: HEADING_STYLE }));
    this.addControl(new WiseRadioGroup(
      [
        { value: 'red', label: 'Red' },
        { value: 'green', label: 'Green' },
        { value: 'blue', label: 'Blue' },
      ],
      { id: 'radioColor', value: 'green' }
    ));

    this.addControl(new WiseLabel('Interests', { id: 'lblInterests', style: HEADING_STYLE }));
    this.addControl(new WiseCheckboxGroup(
      [
        { value: 'music', label: 'Music' },
        { value: 'sports', label: 'Sports' },
        { value: 'reading', label: 'Reading' },
        { value: 'travel', label: 'Travel' },
      ],
      { id: 'checkInterests', value: ['music', 'travel'] }
    ));

    this.addControl(new WiseLabel('Birthday', { id: 'lblBirthday', style: HEADING_STYLE }));
    this.addControl(new WiseDate('', { id: 'dateBirthday' }));

    this.addControl(new WiseLabel('Vacation Dates', { id: 'lblVacation', style: HEADING_STYLE }));
    this.addControl(new WiseDateRange({}, { id: 'rangeVacation' }));

    this.addControl(new WiseLabel('Bio', { id: 'lblBio', style: HEADING_STYLE }));
    this.addControl(new WiseTextArea('', { id: 'textBio', placeholder: 'Tell us about yourself...', rows: 3 }));

    this.addControl(new WiseLabel('Notes', { id: 'lblNotes', style: HEADING_STYLE }));
    this.addControl(new WiseHtmlEditor('<p>Write something...</p>', { id: 'editorNotes' }));

    this.addControl(new WiseLabel('Avatar', { id: 'lblAvatar', style: HEADING_STYLE }));
    this.addControl(new WiseFileUpload('Choose Image...', { id: 'uploadAvatar', onChange: this.onAvatarChange.bind(this) }));

    this.addControl(new WiseButton('Show Values', {
      id: 'btnShow',
      onClick: this.onShowValues.bind(this),
      style: { marginTop: '4px' },
    }));
    this.addControl(new WiseLabel('', { id: 'lblResult', style: { fontSize: 12, marginTop: '2px', color: '#374151' } }));

    return this;
  }

  onAvatarChange() {
    // The uploaded URL is already synced onto this.uploadAvatar.value by the
    // time this runs; nothing else needs to happen until "Show Values".
  }

  onShowValues() {
    const summary = {
      color: this.radioColor.value,
      interests: this.checkInterests.value,
      birthday: this.dateBirthday.value,
      vacation: this.rangeVacation.value,
      bio: this.textBio.value,
      notes: this.editorNotes.value,
      avatar: this.uploadAvatar.value,
    };
    this.lblResult.text(JSON.stringify(summary, null, 2));
  }

  show(param = null) {
    this.visible = true;
    this.params = param;
    return super.show(param);
  }
}

module.exports = WinControls;
