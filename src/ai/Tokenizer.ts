/**
 * MobileBERT WordPiece Tokenizer for React Native / TypeScript
 * Standard uncased MobileBERT vocabulary tokenization with offset tracking.
 */


export interface TokenizerOutput {
  input_ids: number[];
  attention_mask: number[];
  tokens: string[];
  offsets: Array<[number, number]>;
}

export class Tokenizer {
  private static instance: Tokenizer | null = null;
  private vocab: Map<string, number> = new Map();
  private invVocab: Map<number, string> = new Map();
  private maxSeqLen: number = 128;

  private unkToken = '[UNK]';
  private sepToken = '[SEP]';
  private clsToken = '[CLS]';
  private padToken = '[PAD]';

  private unkId = 100;
  private sepId = 102;
  private clsId = 101;
  private padId = 0;

  private constructor(vocabContent?: string) {
    if (vocabContent) {
      this.loadVocabFromContent(vocabContent);
    }
  }

  public static getInstance(vocabContent?: string): Tokenizer {
    if (!Tokenizer.instance) {
      Tokenizer.instance = new Tokenizer(vocabContent);
    }
    return Tokenizer.instance;
  }

  public loadVocabFromContent(content: string): void {
    const lines = content.split(/\r?\n/);
    this.vocab.clear();
    this.invVocab.clear();
    lines.forEach((line, index) => {
      const token = line.trim();
      if (token) {
        this.vocab.set(token, index);
        this.invVocab.set(index, token);
      }
    });

    if (this.vocab.has(this.clsToken)) this.clsId = this.vocab.get(this.clsToken)!;
    if (this.vocab.has(this.sepToken)) this.sepId = this.vocab.get(this.sepToken)!;
    if (this.vocab.has(this.unkToken)) this.unkId = this.vocab.get(this.unkToken)!;
    if (this.vocab.has(this.padToken)) this.padId = this.vocab.get(this.padToken)!;
  }


  private isPunctuation(ch: string): boolean {
    const cp = ch.charCodeAt(0);
    if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) {
      return true;
    }
    return false;
  }

  public tokenize(text: string): TokenizerOutput {
    const originalText = text;
    const lowerText = text.toLowerCase();

    // WordPiece tokenization with character offset mapping
    const rawTokens: { token: string; start: number; end: number }[] = [];

    // Pre-tokenization: split on whitespace and punctuation
    let currentWord = '';
    let startIdx = -1;

    for (let i = 0; i < lowerText.length; i++) {
      const ch = lowerText[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        if (currentWord.length > 0) {
          rawTokens.push({ token: currentWord, start: startIdx, end: i });
          currentWord = '';
          startIdx = -1;
        }
      } else if (this.isPunctuation(ch)) {
        if (currentWord.length > 0) {
          rawTokens.push({ token: currentWord, start: startIdx, end: i });
          currentWord = '';
          startIdx = -1;
        }
        rawTokens.push({ token: ch, start: i, end: i + 1 });
      } else {
        if (currentWord.length === 0) {
          startIdx = i;
        }
        currentWord += ch;
      }
    }
    if (currentWord.length > 0) {
      rawTokens.push({ token: currentWord, start: startIdx, end: lowerText.length });
    }

    // WordPiece subword splitting
    const wpTokens: string[] = [this.clsToken];
    const inputIds: number[] = [this.clsId];
    const offsets: Array<[number, number]> = [[0, 0]];

    for (const raw of rawTokens) {
      if (wpTokens.length >= this.maxSeqLen - 1) break;

      const tokenStr = raw.token;
      if (tokenStr.length === 0) continue;

      if (this.vocab.has(tokenStr)) {
        wpTokens.push(tokenStr);
        inputIds.push(this.vocab.get(tokenStr)!);
        offsets.push([raw.start, raw.end]);
        continue;
      }

      let isBad = false;
      let start = 0;
      const subTokens: string[] = [];
      const subOffsets: Array<[number, number]> = [];

      while (start < tokenStr.length) {
        let end = tokenStr.length;
        let curSubstr: string | null = null;
        let curSubstrId: number | null = null;

        while (start < end) {
          let substr = tokenStr.substring(start, end);
          if (start > 0) {
            substr = '##' + substr;
          }
          if (this.vocab.has(substr)) {
            curSubstr = substr;
            curSubstrId = this.vocab.get(substr)!;
            break;
          }
          end -= 1;
        }

        if (curSubstr === null) {
          isBad = true;
          break;
        }

        subTokens.push(curSubstr);
        subOffsets.push([raw.start + start, raw.start + end]);
        start = end;
      }

      if (isBad) {
        wpTokens.push(this.unkToken);
        inputIds.push(this.unkId);
        offsets.push([raw.start, raw.end]);
      } else {
        for (let k = 0; k < subTokens.length; k++) {
          if (wpTokens.length >= this.maxSeqLen - 1) break;
          wpTokens.push(subTokens[k]);
          inputIds.push(this.vocab.get(subTokens[k])!);
          offsets.push(subOffsets[k]);
        }
      }
    }

    // Append [SEP]
    wpTokens.push(this.sepToken);
    inputIds.push(this.sepId);
    offsets.push([originalText.length, originalText.length]);

    // Construct attention mask
    const seqLen = inputIds.length;
    const attentionMask: number[] = new Array(seqLen).fill(1);

    // Padding to maxSeqLen (128)
    while (inputIds.length < this.maxSeqLen) {
      inputIds.push(this.padId);
      attentionMask.push(0);
      wpTokens.push(this.padToken);
      offsets.push([0, 0]);
    }

    return {
      input_ids: inputIds.slice(0, this.maxSeqLen),
      attention_mask: attentionMask.slice(0, this.maxSeqLen),
      tokens: wpTokens.slice(0, this.maxSeqLen),
      offsets: offsets.slice(0, this.maxSeqLen),
    };
  }

  public getVocabSize(): number {
    return this.vocab.size;
  }
}
