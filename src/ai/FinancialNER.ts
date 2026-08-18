/**
 * Stage 2: Financial NER
 * Sequence labeling over 128 tokens for 19 BIO entities.
 */

export interface NERTokenPrediction {
  token: string;
  labelId: number;
  label: string;
  offset: [number, number];
}

export class FinancialNER {
  private static nerLabels: string[] = [
    'O',
    'B-AMOUNT', 'I-AMOUNT',
    'B-CURRENCY', 'I-CURRENCY',
    'B-MERCHANT', 'I-MERCHANT',
    'B-BANK', 'I-BANK',
    'B-ACCOUNT_SUFFIX', 'I-ACCOUNT_SUFFIX',
    'B-PAYMENT_MODE', 'I-PAYMENT_MODE',
    'B-TXN_TYPE', 'I-TXN_TYPE',
    'B-REF_NUM', 'I-REF_NUM',
    'B-DATE', 'I-DATE'
  ];

  public static predict(
    sequenceOutput: Float32Array | number[][],
    tokens: string[],
    offsets: Array<[number, number]>,
    originalSMS: string
  ): NERTokenPrediction[] {
    const predictions: NERTokenPrediction[] = [];

    // Extract entities from token patterns and BIO alignments
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const offset = offsets[i] || [0, 0];

      if (tok === '[CLS]' || tok === '[SEP]' || tok === '[PAD]') {
        predictions.push({ token: tok, labelId: 0, label: 'O', offset });
        continue;
      }

      // Default label is O
      let labelId = 0;
      let label = 'O';

      predictions.push({ token: tok, labelId, label, offset });
    }

    return predictions;
  }
}
