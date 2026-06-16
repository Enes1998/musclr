// NativeWind v4 form. `nativewind/babel` goes in PRESETS (not plugins). Run `expo start --clear`
// after changing this file.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
