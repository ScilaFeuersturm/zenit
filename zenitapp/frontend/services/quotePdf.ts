import { fromByteArray } from "base64-js";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { api } from "./api";

export async function exportQuotePdf(quoteId: number) {
  const filename = `presupuesto-zenit-${String(quoteId).padStart(5, "0")}.pdf`;
  const response = await api.getFile(`/api/quotes/${quoteId}/pdf`);

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }

  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error("La opción de compartir archivos no está disponible en este dispositivo.");
  }

  const uri = FileSystem.cacheDirectory + filename;
  const bytes = new Uint8Array(await response.arrayBuffer());
  await FileSystem.writeAsStringAsync(uri, fromByteArray(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Compartir presupuesto de Zenit Eventos",
  });
}
