# Production Inference & NER Audit Report

- **Total Held-Out Verified Samples**: 120
- **Evaluation vs Production Match Rate**: 100.00%
- **NER Reconstruction Boundary Errors**: 0
- **Character Offset Reconstruction Upgrade**: Cleaned subword token artifacts, exact case spans, and full reference number preservation.

## 50 Verified Prediction Samples (Original vs Eval vs Prod)

| ID | Original SMS | Ground Truth | Eval Output | Prod Output | Match Status |
|---|---|---|---|---|---|
| 1 | `Dear Customer, AED 450.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 2 | `Dear Customer, AED 500.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 3 | `Dear Customer, AED 100.00 was debited from your ac` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 4 | `Transaction of AED 39.50 debited from your a/c ***` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 5 | `Dear Customer, AED 100.00 was debited from your ac` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 6 | `Transaction of AED 2913.00 debited from your a/c *` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 7 | `Transaction of AED 21.00 debited from your a/c ***` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 8 | `Dear Customer, AED 430.00 was debited from your ac` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 9 | `Transaction of AED 8.00 debited from your a/c ****` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 10 | `Dear Customer, AED 13.00 was credited to your acco` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 11 | `Dear Customer, AED 267.99 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 12 | `Dear Customer, AED 2500.00 was credited to your ac` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 13 | `Dear Customer, AED 1.05 was debited from your acco` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 14 | `Dear Customer, AED 61.00 was debited from your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 15 | `Transaction of AED 288.94 debited from your a/c **` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 16 | `Transaction of AED 3.69 debited from your a/c *535` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 17 | `Transaction of AED 3.69 debited from your a/c *535` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 18 | `Dear Customer, AED 200.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 19 | `Dear Customer, AED 1000.00 was credited to your ac` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 20 | `Dear Customer, AED 100000.00 was credited to your ` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 21 | `Transaction of AED 31.00 debited from your a/c ***` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 22 | `Transaction of AED 226.25 debited from your a/c *5` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 23 | `Transaction of AED 37.68 debited from your a/c *53` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 24 | `Dear Customer, AED 1500.00 was debited from your a` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 25 | `Dear Customer, AED 100.00 was debited from your ac` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 26 | `Dear Customer, AED 350.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 27 | `Transaction of AED 5.00 debited from your a/c ****` | Transaction | Transaction (Food) | Transaction (Food) | **PASS** |
| 28 | `Dear Customer, AED 500.00 was credited to your acc` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 29 | `Dear Customer, AED 300.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 30 | `Dear Customer, AED 250.00 was debited from your ac` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 31 | `Dear Customer, AED 100.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 32 | `Dear Customer, AED 10000.00 was debited from your ` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 33 | `Transaction of AED 32.99 debited from your a/c *53` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 34 | `Transaction of AED 3.69 debited from your a/c *535` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 35 | `Dear Customer, AED 1.00 was debited from your acco` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 36 | `Dear Customer, AED 10000.00 was credited to your a` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 37 | `Dear Customer, AED 24350.00 was credited to your a` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 38 | `Transaction of AED 3.69 debited from your a/c *535` | Transaction | Transaction (Travel) | Transaction (Travel) | **PASS** |
| 39 | `Dear Customer, AED 5500.00 was debited from your a` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 40 | `Dear Customer, AED 100.00 was credited to your acc` | Transaction | Transaction (EMI) | Transaction (EMI) | **PASS** |
| 41 | `re : equistar buybacks the only valid " buyback " ` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 42 | `Yeah get the unlimited` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 43 | `I am in tirupur da, once you started from office c` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 44 | `central power & light daren - was there a deal for` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 45 | `fw : tufco deal 108058 darin , since the volume on` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 46 | `I love ya too but try and budget your money better` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 47 | `texas energy reliability council meeting - - - - -` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 48 | `re : meter 981594 - san jacinto low pressure del t` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 49 | `2001 special stock option grant awards we are plea` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
| 50 | `Is fujitsu s series lifebook good?` | Personal | Personal (N/A) | Personal (N/A) | **PASS** |
