module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@database': './src/database',
          '@repositories': './src/repositories',
          '@types': './src/types',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@hooks': './src/hooks',
          '@ai': './src/ai',
          '@sms': './src/sms',
          '@analytics': './src/analytics',
        }
      }
    ],
    'react-native-reanimated/plugin'
  ]
};
