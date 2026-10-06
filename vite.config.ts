import { defineConfig } from 'vitest/config'

const entries = {
  index: 'src/index.ts',
  full: 'src/full.ts',
  provinces: 'src/provinces.ts',
  counties: 'src/counties.ts',
  geography: 'src/geography.ts',
  islands: 'src/islands.ts',
  water: 'src/water.ts',
  'capitals/provinces': 'src/capitals/provinces.ts',
  'capitals/counties': 'src/capitals/counties.ts',
}

export default defineConfig({
  build: {
    target: 'es2020',
    minify: false,
    sourcemap: false,
    emptyOutDir: false,
    lib: { entry: entries, formats: ['es', 'cjs'] },
    rollupOptions: {
      output: [
        {
          format: 'es',
          dir: 'dist/esm',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
        {
          format: 'cjs',
          dir: 'dist/cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
          exports: 'named',
        },
      ],
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
