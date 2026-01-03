import { GoogleGenAI, Type } from '@google/genai';
import { TransactionType } from '../types';

export interface ReceiptData {
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
}

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error(
      "Configuração inválida: Chave API não encontrada."
    );
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: data
            }
          },
          {
            text: "Analise este recibo/comprovante. Extraia o valor total, a data (formato YYYY-MM-DD), o nome do estabelecimento (para descrição) e categorize (Alimentação, Transporte, Saúde, etc). Se for indefinido, use a data de hoje."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["DESPESA", "RECEITA"] },
            category: { type: Type.STRING }
          },
          required: ["amount", "date", "description", "type", "category"]
        }
      }
    });

    let text = response.text || '';
    
    // Engenharia de Resiliência: Extração Cirúrgica de JSON
    // Mesmo com responseMimeType, modelos as vezes adicionam texto ao redor.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    } else {
        throw new Error("Formato JSON inválido retornado pela IA.");
    }

    return JSON.parse(text) as ReceiptData;

  } catch (error) {
    console.error("Receipt analysis failed:", error);
    throw error;
  }
};