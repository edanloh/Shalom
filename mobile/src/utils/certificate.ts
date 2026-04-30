import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

export type Certificate = {
  id: string;
  courseName: string;
  instructor: string;
  completedAt: string;
  credentialId: string;
  score?: number;
  duration: string;
};

export const formatDurationHours = (hours?: number | null) => {
  if (!Number.isFinite(hours) || (hours ?? 0) <= 0) return "—";
  const totalMinutes = Math.round((hours as number) * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getCertificateAssetUris = async () => {
  const toDataUri = async (assetModule: number, warnLabel: string) => {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    const localUri = asset.localUri || asset.uri;
    if (!localUri) return asset.uri;
    try {
      const base64Encoding = (FileSystem as any)?.EncodingType?.Base64 ?? "base64";
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: base64Encoding as any,
      });
      return `data:image/png;base64,${base64}`;
    } catch (err) {
      console.warn(`${warnLabel} base64 conversion failed; using file URI`, err);
      return localUri;
    }
  };

  return Promise.all([
    toDataUri(require("../../assets/app-icon.png"), "Certificate logo"),
    toDataUri(require("../../assets/certificate-seal.png"), "Certificate seal"),
  ]);
};

export const buildCertificateHtml = (
  cert: Certificate,
  logoUri: string,
  sealUri: string
) => {
  const learnerName = "Shalom Learner";
  const courseName = escapeHtml(cert.courseName || "Course");
  const instructor = escapeHtml(cert.instructor || "Shalom Faculty");
  const issuedOn = escapeHtml(formatDate(cert.completedAt));
  const credentialId = escapeHtml(cert.credentialId || "N/A");
  const safeLogoUri = escapeHtml(logoUri || "");
  const safeSealUri = escapeHtml(sealUri || "");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shalom Certificate</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 14px;
        color: #111827;
        font-family: "Times New Roman", Georgia, serif;
        background: #f8f5ef;
      }
      .certificate {
        width: 100%;
        min-height: 560px;
        border: 2px solid #c4b9a3;
        position: relative;
        background:
          radial-gradient(circle at 15% 25%, rgba(190, 158, 112, 0.08) 0, rgba(190, 158, 112, 0.08) 2px, transparent 2px) 0 0 / 18px 18px,
          linear-gradient(180deg, #fcfaf6 0%, #f5f0e6 100%);
      }
      .inner-border {
        position: absolute;
        inset: 10px;
        border: 1px solid #d7cdbb;
      }
      .layout {
        position: relative;
        min-height: 560px;
        display: grid;
        grid-template-rows: 148px 1fr 126px;
        z-index: 1;
      }
      .section {
        display: grid;
        grid-template-columns: 70% 30%;
      }
      .left-cell {
        padding: 24px 34px 18px 40px;
      }
      .right-cell {
        border-left: 1px solid #c8c2b2;
        padding: 18px 16px;
      }
      .header .left-cell {
        padding-top: 32px;
      }
      .header .right-cell {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 32px;
      }
      .body .left-cell {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .body .right-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .footer .left-cell {
        display: flex;
        align-items: flex-end;
        padding-bottom: 24px;
      }
      .footer .right-cell {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 22px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 0;
      }
      .logo {
        width: 58px;
        height: 58px;
        object-fit: contain;
      }
      .brand-text h1 {
        margin: 0;
        font-size: 54px;
        line-height: 0.92;
        letter-spacing: -0.8px;
        color: #16376b;
        font-weight: 500;
      }
      .brand-text p {
        margin: 4px 0 0;
        font-size: 13px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: #1f3a63;
      }
      .date {
        font-size: 18px;
        margin: 0 0 10px;
        color: #2d2a25;
      }
      .name {
        font-size: 46px;
        margin: 0 0 8px;
        color: #1a1a1a;
        font-weight: 500;
      }
      .statement {
        margin: 0;
        font-size: 30px;
        color: #2e2e2e;
      }
      .course {
        margin: 10px 0 0;
        font-size: 44px;
        line-height: 1.12;
        color: #111111;
      }
      .signature-wrap {
        width: 62%;
      }
      .sig-line {
        border-bottom: 1.6px solid #6b7280;
        height: 34px;
      }
      .sig-label {
        margin-top: 8px;
        font-family: Arial, sans-serif;
        font-size: 13px;
        letter-spacing: 0.6px;
        color: #4b5563;
      }
      .verify-title {
        text-align: center;
        letter-spacing: 3px;
        font-size: 22px;
        line-height: 1.4;
        color: #1f2937;
        font-weight: 600;
      }
      .seal {
        width: 190px;
        height: 190px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .seal-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .verify {
        text-align: center;
        font-family: Arial, sans-serif;
        font-size: 14px;
        color: #374151;
        line-height: 1.45;
        max-width: 240px;
      }
      .verify-id {
        margin-top: 6px;
        font-weight: 700;
        letter-spacing: 0.4px;
        font-size: 12px;
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="certificate">
      <div class="inner-border"></div>
      <div class="layout">
        <div class="section header">
          <div class="left-cell">
            <div class="brand">
              <img class="logo" src="${safeLogoUri}" alt="Shalom logo" />
              <div class="brand-text">
                <h1>Shalom</h1>
                <p>Learning Platform</p>
              </div>
            </div>
          </div>
          <div class="right-cell">
            <div class="verify-title">VERIFIED<br/>CERTIFICATE</div>
          </div>
        </div>

        <div class="section body">
          <div class="left-cell">
            <div class="date">${issuedOn}</div>
            <div class="name">${escapeHtml(learnerName)}</div>
            <p class="statement">has successfully completed</p>
            <div class="course">${courseName}</div>
          </div>
          <div class="right-cell">
            <div class="seal">
              <img class="seal-img" src="${safeSealUri}" alt="Certificate seal" />
            </div>
          </div>
        </div>

        <div class="section footer">
          <div class="left-cell">
            <div class="signature-wrap">
              <div class="sig-line"></div>
              <div class="sig-label">Professor ${instructor}</div>
            </div>
          </div>
          <div class="right-cell">
            <div class="verify">
              Verify at shalom.app/verify
              <div class="verify-id">${credentialId}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};

export const generateCertificatePdfFromHtml = async (html: string) => {
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};
