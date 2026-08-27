import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import { normalizeRilogProfileSettings } from './validate-rilog-profile-settings';

export const saveMockRilogProfile = (value: RilogProfileSettingsValue): RilogProfileSettingsValue =>
	normalizeRilogProfileSettings(value);
