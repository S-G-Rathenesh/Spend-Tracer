# Stage 5B: TFLite Export Report

**Export Date**: 2026-07-28 15:26:01 UTC
**Pipeline**: PyTorch → ONNX (opset 14) → TF SavedModel → TFLite
**Input Shape**: (1, 128)

## Model Export Summary

| Model | ONNX Size | TFLite Size | ONNX Valid | TFLite Valid | Status |
|-------|-----------|-------------|------------|--------------|--------|
| shared_encoder | 93.886 MB | 93.684 MB | ✅ | ✅ | ✅ SUCCESS |
| sms_classifier | 0.008 MB | 0.009 MB | ✅ | ✅ | ✅ SUCCESS |
| ner_head | 0.038 MB | 0.038 MB | ✅ | ✅ | ✅ SUCCESS |
| category_head | 0.01 MB | 0.011 MB | ✅ | ✅ | ✅ SUCCESS |

**Total TFLite Bundle Size**: 93.74 MB

## File Checksums (SHA-256)

- `shared_encoder.tflite`: `9e03b35b22eee53b142bfe346684708d925815d36dbd5a838a537a1441e8f274`
- `sms_classifier.tflite`: `6a51981520e98a69d2d1e71f1df20ea379cb04304893bc61945b338ef233ba28`
- `ner_head.tflite`: `9e468539003191fd71ee5a9c3f2045b40fcd50f898230ca55a07093715f2e4e2`
- `category_head.tflite`: `f7cf8ec0ac30a257f35ca1b6d8fdbe890ddb31ec50e94d6cf639e1e824f386d2`

## Deployment Files

- **TFLite models**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\exported\tflite\tflite_models`
- **ONNX models**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\exported\tflite\onnx`
- **TF SavedModels**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\exported\tflite\tf_savedmodel`
- **Export manifest**: `D:\Projects\Project Unzip\Spendly\SpendGuard\ai-training\experiments\stage_5b\tflite_export_manifest.json`

## Next Steps

1. Bundle TFLite models into React Native app assets
2. Implement TFLite inference in React Native using `react-native-tflite`
3. Validate on-device inference matches server-side predictions
