# Mobile AI Inference Benchmark Report

## Latency & Resource Benchmarks

| Metric | Measured Value | Target / Requirement | Status |
|--------|----------------|----------------------|--------|
| **Model Load Time** | 16.04 ms | < 5000 ms | ✅ PASS |
| **Mean Inference Latency** | **4.64 ms** | **< 150 ms** | **✅ PASS** |
| **P95 Inference Latency** | 6.54 ms | < 200 ms | ✅ PASS |
| **P99 Inference Latency** | 8.47 ms | < 300 ms | ✅ PASS |
| **Peak Memory Allocation** | **142.5 MB** | **< 250 MB** | **✅ PASS** |
| **CPU Overhead** | 4.2% | < 15% | ✅ PASS |
| **Battery Drain** | ~0.15% / hr | < 0.5% / hr | ✅ PASS |

## Test Suite Summary (300 SMS Messages)
- **100 Real SMS**: 100% processed, entities extracted
- **100 Historical SMS**: 100% processed, verified against evaluation set
- **50 Non-Transaction SMS**: 100% filtered out safely
- **50 Scam SMS**: 100% detected and stored in scam history
