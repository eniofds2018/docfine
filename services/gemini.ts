
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Fixed syntax errors caused by unescaped backticks in template literal and ensured proper return paths.
export const analyzeDocument = async (text: string): Promise<AnalysisResult & { formattedHtml: string }> => {
  // Use process.env.API_KEY directly as required by the guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Escaped backticks inside the template literal to prevent closing the string early and causing syntax errors.
  const prompt = `
    Aja como um motor de limpeza e formatação de documentos. 
    Sua missão é remover todos os metadados, resíduos de conversação de IA (como asteriscos duplos, crases de código, prefixos explicativos) e padronizar a formatação.

    REGRAS DE LIMPEZA:
    1. Remova qualquer texto que pareça uma resposta de chat (ex: "Certamente!", "Aqui está seu texto formatado:").
    2. Converta marcações de markdown (ex: **texto**) para tags HTML correspondentes (ex: <strong>texto</strong>).
    3. Remova caracteres especiais de controle ou blocos de código markdown (\`\`\`html).

    REGRAS DE FORMATAÇÃO (ESTRUTURA HTML):
    1. Utilize apenas tags semânticas: <p>, <h1>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <table>, <tr>, td, th.
    2. Mantenha INTEGRALMENTE tabelas, quadros e referências a imagens.
    3. Formatação alvo: Fonte Arial, Tamanho 12pt, Espaçamento 1.5, Alinhamento Justificado.

    RETORNE APENAS UM JSON COM:
    - formattingIssues: Lista de correções feitas.
    - structuralSuggestions: Sugestões de melhoria (tabelas/fluxogramas).
    - summary: Resumo da limpeza realizada.
    - formattedHtml: O código HTML final limpo e pronto para exportação.

    TEXTO DO DOCUMENTO:
    """
    ${text.substring(0, 15000)}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattingIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestion: { type: Type.STRING }
                },
                required: ["type", "description", "suggestion"]
              }
            },
            structuralSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  type: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["id", "originalText", "type", "reason"]
              }
            },
            summary: { type: Type.STRING },
            formattedHtml: { type: Type.STRING }
          },
          required: ["formattingIssues", "structuralSuggestions", "summary", "formattedHtml"]
        }
      }
    });

    // Access the text property directly as per GenerateContentResponse guidelines.
    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text from model.");
    }

    const result = JSON.parse(responseText.trim());
    
    // Programmatic safety cleanup for consistent HTML output.
    let cleanHtml = (result.formattedHtml || '')
      .replace(/```html/gi, '')
      .replace(/```/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/#{1,6}\s+(.*)/g, '<h2>$1</h2>')
      .trim();
    
    return { ...result, formattedHtml: cleanHtml };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    // Ensure the function either returns the expected type or throws.
    throw new Error("Erro ao sanitizar o documento.");
  }
};
