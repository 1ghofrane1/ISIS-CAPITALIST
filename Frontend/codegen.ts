import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../Backend/typescript-starter/src/schema.graphql',
  documents: ['src/app/graphql/queries.graphql'],
  generates: {
    'src/app/graphql/operations.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        avoidOptionals: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
