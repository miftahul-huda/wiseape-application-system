const fallbackThemes = [
  { id: 'macos-light', name: 'macOS Light', bg1: '#a4bfd5', bg2: '#d9e9f7', accent: '#3b82f6', accentDark: '#1d4ed8' },
  { id: 'light-blue', name: 'Light Blue', bg1: '#bfe3ff', bg2: '#eaf6ff', accent: '#0ea5e9', accentDark: '#0284c7' },
  { id: 'midnight', name: 'Midnight', bg1: '#1e293b', bg2: '#0f172a', accent: '#8b5cf6', accentDark: '#6d28d9' },
  { id: 'sunset', name: 'Sunset', bg1: '#fb923c', bg2: '#db2777', accent: '#f97316', accentDark: '#c2410c' },
  { id: 'forest', name: 'Forest', bg1: '#4ade80', bg2: '#064e3b', accent: '#16a34a', accentDark: '#166534' },
];

class ApiThemeRepository {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  }

  getFallbackThemes() {
    return fallbackThemes.map((theme) => ({ ...theme }));
  }

  async listThemes() {
    try {
      const response = await fetch(`${this.baseUrl}/api/themes`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const themes = data.themes || [];
      if (themes.length === 0) {
        return this.getFallbackThemes();
      }

      return themes;
    } catch (error) {
      console.warn('[WAS] Theme API unavailable; loading fallback theme list.', error.message);
      return this.getFallbackThemes();
    }
  }
}

module.exports = ApiThemeRepository;
