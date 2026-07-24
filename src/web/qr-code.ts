let qrCodeModule: Promise<typeof import("qrcode")> | undefined;

const loadQrCode = (): Promise<typeof import("qrcode")> => {
  qrCodeModule ??= import("qrcode");
  return qrCodeModule;
};

/** Generates an SVG data URL while keeping the QR encoder out of initial web bundles. */
export const generateQrCodeDataUrl = async (value: string): Promise<string> => {
  const QRCode = await loadQrCode();
  const svg = await QRCode.toString(value, { type: "svg", width: 240, margin: 1 });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
