// Module-level variable tracking which loyalty card the stamps screen is currently showing.
// stamps.tsx sets this on mount/unmount so qrcode.tsx can skip redundant navigation.
let _activeStampsCardId: string | null = null;

export const getActiveStampsCardId = () => _activeStampsCardId;
export const setActiveStampsCardId = (id: string | null) => { _activeStampsCardId = id; };
