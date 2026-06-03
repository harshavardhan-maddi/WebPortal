import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Polyfill browser canvas classes for pdfjs-dist in Node.js environment
    if (typeof global.DOMMatrix === "undefined") {
      (global as any).DOMMatrix = class DOMMatrix {};
    }
    if (typeof global.ImageData === "undefined") {
      (global as any).ImageData = class ImageData {};
    }
    if (typeof global.Path2D === "undefined") {
      (global as any).Path2D = class Path2D {};
    }

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      
      // Return extracted text and basic info
      return NextResponse.json({
        success: true,
        info: infoResult.info,
        metadata: infoResult.metadata,
        text: textResult.text,
      });
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (err: any) {
    console.error("PDF extraction error:", err);
    return NextResponse.json({ error: "Failed to extract PDF.", details: err.message }, { status: 500 });
  }
}
