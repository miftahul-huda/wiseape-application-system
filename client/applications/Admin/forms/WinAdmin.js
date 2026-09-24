const WiseWindow = require('../../../system/WiseWindow');
const WiseLabel = require('../../../system/controls/WiseLabel');
const WiseButton = require('../../../system/controls/WiseButton');
const WiseCheckboxGroup = require('../../../system/controls/WiseCheckboxGroup');
const ApiAuthRepository = require('../../../system/ApiAuthRepository');

const authRepository = new ApiAuthRepository();

class WinAdmin extends WiseWindow {
  constructor(options = {}) {
    super(options);
    this.title = 'Admin';
    this.appTitle = options.appTitle || 'Admin';
    this.appIcon = options.appIcon || '🛡';
    this.width = '480';
    this.height = '440';
    this.requiresApproval = !!options.requiresApproval;
    this.pendingUsers = Array.isArray(options.pendingUsers) ? options.pendingUsers : [];
  }

  onWindowInit() {
    this.controls = [];
    this.addControl(new WiseLabel('User Management', { id: 'lblHeading', style: { fontSize: 22, color: '#111827' } }));
    this.addControl(new WiseLabel('Registration Policy', { id: 'lblPolicyHeading', style: { fontSize: 15, fontWeight: 700, marginTop: '12px' } }));
    this.addControl(new WiseCheckboxGroup(
      [{ value: 'auto', label: 'Izinkan user baru langsung aktif tanpa approval admin' }],
      {
        id: 'chkAutoApprove',
        value: this.requiresApproval ? [] : ['auto'],
        onChange: this.onRegistrationPolicyChange.bind(this),
      }
    ));
    this.addControl(new WiseLabel('Pending Approval', { id: 'lblPendingHeading', style: { fontSize: 15, fontWeight: 700, marginTop: '12px' } }));

    this.staticControls = [...this.controls];
    this.renderPendingRows();
    return this;
  }

  renderPendingRows() {
    this.controls = [...this.staticControls];

    if (this.pendingUsers.length === 0) {
      this.addControl(new WiseLabel('Tidak ada user pending', { id: 'lblPendingEmpty', style: { fontSize: 13, color: '#374151' } }));
      return;
    }

    this.pendingUsers.forEach((user) => {
      this.addControl(new WiseLabel(`${user.name} (${user.email})`, {
        id: `lblPending-${user.id}`,
        style: { fontSize: 13 },
      }));
      this.addControl(new WiseButton('Approve', {
        id: `btnApprove-${user.id}`,
        onClick: () => this.onApproveUser(user.id),
      }));
    });
  }

  onRegistrationPolicyChange() {
    const session = this.system && this.system.currentSession;
    if (!session || !session.token) return;

    const allowsAuto = this.chkAutoApprove.value.includes('auto');
    this.requiresApproval = !allowsAuto;

    authRepository.setSettings(session.token, this.requiresApproval)
      .catch((error) => console.warn('[WAS] Failed to save registration policy:', error.message));
  }

  async onApproveUser(id) {
    const session = this.system && this.system.currentSession;
    if (!session || !session.token) return;

    try {
      await authRepository.approveUser(session.token, id);
      this.pendingUsers = this.pendingUsers.filter((user) => user.id !== id);
      this.renderPendingRows();
    } catch (error) {
      console.warn('[WAS] Failed to approve user:', error.message);
    }
  }

  show(param = null) {
    this.visible = true;
    this.params = param;
    return super.show(param);
  }
}

module.exports = WinAdmin;
