/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '^extensions/vscode/.*\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'extensions/vscode/tsconfig.json' }],
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/tests/mocks/vscode.ts',
    '^pocketflow$': '<rootDir>/tests/mocks/pocketflow.ts'
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'storage/**/*.ts'
  ]
};
