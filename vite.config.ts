import { defineConfig } from 'vitest/config'

const entries = {
  index: 'src/index.ts',
  full: 'src/full.ts',
  lean: 'src/lean.ts',
  provinces: 'src/provinces.ts',
  counties: 'src/counties.ts',
  geography: 'src/geography.ts',
  islands: 'src/islands.ts',
  water: 'src/water.ts',
  'capitals/provinces': 'src/capitals/provinces.ts',
  'capitals/counties': 'src/capitals/counties.ts',
  'provinces-standard': 'src/provinces-standard.ts',
  'counties-standard': 'src/counties-standard.ts',
  'geography-standard': 'src/geography-standard.ts',
  standard: 'src/standard.ts',
  'provinces-lite': 'src/provinces-lite.ts',
  'counties-lite': 'src/counties-lite.ts',
  'geography-lite': 'src/geography-lite.ts',
  lite: 'src/lite.ts',
  'provinces-mini': 'src/provinces-mini.ts',
  'counties-mini': 'src/counties-mini.ts',
  'geography-mini': 'src/geography-mini.ts',
  mini: 'src/mini.ts',
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
    testTimeout: 60_000,
  },
})
