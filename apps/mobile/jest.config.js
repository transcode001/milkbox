module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/test/**/*.test.ts", "<rootDir>/test/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/"],
};
