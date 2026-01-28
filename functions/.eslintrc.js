module.exports = {
  extends: ['../.eslintrc.js'],
  env: {
    node: true,
  },
  rules: {
    'no-console': 'off', // Allow console in Cloud Functions
  },
};
