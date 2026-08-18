import { StatusDetector } from '../StatusDetector';

describe('StatusDetector', () => {
  it('Test 1: "₹800 attempted ... declined due to Incorrect PIN" -> FAILED', () => {
    const text = 'Txn of INR 800.00 attempted on your debit card is declined due to Incorrect PIN';
    expect(StatusDetector.determineStatus(text)).toBe('FAILED');
  });

  it('Test 2: "₹500 attempted ... successfully debited" -> COMPLETED', () => {
    const text = '₹500 attempted and successfully debited from your account';
    expect(StatusDetector.determineStatus(text)).toBe('COMPLETED');
  });

  it('Test 3: "₹300 transaction failed" -> FAILED', () => {
    const text = '₹300 transaction failed';
    expect(StatusDetector.determineStatus(text)).toBe('FAILED');
  });

  it('Test 4: "₹200 payment rejected" -> FAILED', () => {
    const text = 'Your ₹200 payment was rejected';
    expect(StatusDetector.determineStatus(text)).toBe('FAILED');
  });

  it('Test 5: "₹1000 debited successfully" -> COMPLETED', () => {
    const text = '₹1000 debited successfully';
    expect(StatusDetector.determineStatus(text)).toBe('COMPLETED');
  });

  it('Test 6: "₹750 attempted but transaction was successful" -> COMPLETED', () => {
    const text = '₹750 attempted but transaction was successful';
    expect(StatusDetector.determineStatus(text)).toBe('COMPLETED');
  });

  it('Test 7: "₹900 transaction reversed" -> REVERSED', () => {
    const text = '₹900 transaction reversed';
    expect(StatusDetector.determineStatus(text)).toBe('REVERSED');
  });
  
  it('Edge case: "transaction unsuccessful" -> FAILED', () => {
    const text = 'transaction unsuccessful';
    expect(StatusDetector.determineStatus(text)).toBe('FAILED');
  });
});
