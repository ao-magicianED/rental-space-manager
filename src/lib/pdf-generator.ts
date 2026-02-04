import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportOptions {
  filename?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
}

// 指定したHTML要素をPDFとしてエクスポート
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = "レポート.pdf",
    orientation = "portrait",
    format = "a4",
  } = options;

  // html2canvasでキャンバスに変換
  const canvas = await html2canvas(element, {
    scale: 2, // 高解像度
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format,
  });

  // ページサイズを取得
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // 画像のアスペクト比を維持しながらサイズを計算
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = imgWidth / imgHeight;

  let finalWidth = pdfWidth - 20; // 余白10mm
  let finalHeight = finalWidth / ratio;

  // ページの高さを超える場合は複数ページに分割
  if (finalHeight > pdfHeight - 20) {
    const pageContentHeight = pdfHeight - 20;
    const totalPages = Math.ceil(finalHeight / pageContentHeight);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const sourceY = (i * pageContentHeight * imgHeight) / finalHeight;
      const sourceHeight = (pageContentHeight * imgHeight) / finalHeight;

      // 部分的に画像を描画
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imgWidth;
      tempCanvas.height = sourceHeight;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          imgWidth,
          sourceHeight,
          0,
          0,
          imgWidth,
          sourceHeight
        );
        const pageImgData = tempCanvas.toDataURL("image/png");
        pdf.addImage(pageImgData, "PNG", 10, 10, finalWidth, pageContentHeight);
      }
    }
  } else {
    pdf.addImage(imgData, "PNG", 10, 10, finalWidth, finalHeight);
  }

  pdf.save(filename);
}

// ダッシュボード全体をPDFとしてエクスポート
export async function exportDashboardToPdf(
  containerId: string = "dashboard-content",
  options: ExportOptions = {}
): Promise<void> {
  const element = document.getElementById(containerId);
  if (!element) {
    throw new Error(`Element with id "${containerId}" not found`);
  }

  const defaultFilename = `ダッシュボード_${new Date().toISOString().split("T")[0]}.pdf`;

  await exportElementToPdf(element, {
    filename: options.filename || defaultFilename,
    orientation: options.orientation || "landscape",
    format: options.format || "a4",
  });
}

// 特定のセクションをPDFとしてエクスポート
export async function exportSectionToPdf(
  sectionElement: HTMLElement,
  title: string,
  options: ExportOptions = {}
): Promise<void> {
  const defaultFilename = `${title}_${new Date().toISOString().split("T")[0]}.pdf`;

  await exportElementToPdf(sectionElement, {
    filename: options.filename || defaultFilename,
    ...options,
  });
}
