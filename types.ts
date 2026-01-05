
export interface FormattingIssue {
  type: 'font' | 'size' | 'spacing' | 'alignment' | 'indentation';
  description: string;
  suggestion: string;
}

export interface StructuralSuggestion {
  id: string;
  originalText: string;
  type: 'table' | 'chart' | 'figure' | 'flowchart';
  reason: string;
  data?: any;
}

export interface AnalysisResult {
  formattingIssues: FormattingIssue[];
  structuralSuggestions: StructuralSuggestion[];
  imageAnalysis: {
    count: number;
    issues: string[];
  };
  summary: string;
}

export interface DocumentState {
  rawText: string;
  htmlContent: string;
  fileName: string;
}
